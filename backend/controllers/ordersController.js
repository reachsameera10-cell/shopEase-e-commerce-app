import mongoose from 'mongoose'
import Coupon from '../models/Coupon.js'
import Order from '../models/Order.js'
import Product from '../models/Product.js'
import { createRazorpayClient } from '../utils/razorpay.js'

const cancellableStatuses = ['confirmed', 'processing']

class OrderError extends Error {
  constructor(message, statusCode) {
    super(message)
    this.statusCode = statusCode
  }
}

function getStatusHistory(order) {
  return order.statusHistory?.length
    ? order.statusHistory
    : [{ status: order.status, note: 'Order placed', changedAt: order.createdAt }]
}

function toOrderListItem(order) {
  return {
    id: order._id.toString(),
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    total: order.total,
    currency: order.currency,
    itemCount: order.items.reduce((count, item) => count + item.quantity, 0),
    previewItems: order.items.slice(0, 3).map((item) => ({
      name: item.name,
      image: item.image,
      quantity: item.quantity,
    })),
    refundStatus: order.refundStatus || 'not_requested',
  }
}

function toOrderDetail(order) {
  return {
    ...toOrderListItem(order),
    items: order.items.map((item) => ({
      productId: item.product.toString(),
      name: item.name,
      image: item.image,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: Math.round(item.unitPrice * item.quantity * 100) / 100,
    })),
    shippingAddress: order.shippingAddress,
    subtotal: order.subtotal,
    shippingCost: order.shippingCost,
    discount: order.discount,
    couponCode: order.couponCode || null,
    statusHistory: getStatusHistory(order),
    refundId: order.refundId || null,
  }
}

export async function getMyOrders(req, res) {
  const { page, limit } = req.validatedQuery
  const filter = { user: req.user._id }
  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter),
  ])

  res.json({
    orders: orders.map(toOrderListItem),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  })
}

export async function getMyOrder(req, res) {
  const order = await Order.findOne({
    _id: req.params.orderId,
    user: req.user._id,
  }).lean()
  if (!order) throw new OrderError('Order not found.', 404)

  res.json({ order: toOrderDetail(order) })
}

async function cancelWithoutRefund(orderId, userId) {
  const session = await mongoose.startSession()
  let order
  try {
    await session.withTransaction(async () => {
      order = await Order.findOne({ _id: orderId, user: userId }).session(session)
      if (!order) throw new OrderError('Order not found.', 404)
      if (order.status === 'cancelled') return
      if (!cancellableStatuses.includes(order.status)) {
        throw new OrderError('This order can no longer be cancelled because it is already being delivered.', 409)
      }
      if (order.paymentStatus === 'paid') {
        throw new OrderError('A paid order must be refunded through Razorpay before cancellation.', 409)
      }
      if (order.inventoryReserved) {
        throw new OrderError('This order still has an online payment in progress. Wait for payment verification or reservation expiry.', 409)
      }

      await restoreCommittedInventory(order, session)
      await releaseConsumedCoupon(order, session)
      order.status = 'cancelled'
      order.cancelledAt = new Date()
      order.statusHistory.push({ status: 'cancelled', note: 'Cancelled by customer' })
      await order.save({ session })
    })
  } finally {
    await session.endSession()
  }

  return order
}

async function restoreCommittedInventory(order, session) {
  const committed =
    order.inventoryCommitted
    || (!order.inventoryReserved && (
      order.paymentStatus === 'paid'
      || order.paymentMethod === 'cod'
    ))
  if (!committed) return

  for (const item of order.items) {
    const result = await Product.updateOne(
      { _id: item.product, soldCount: { $gte: item.quantity } },
      {
        $inc: {
          stock: item.quantity,
          soldCount: -item.quantity,
        },
      },
      { session },
    )
    if (result.modifiedCount !== 1) {
      throw new Error(`Could not restore inventory for cancelled order ${order.orderNumber}`)
    }
  }
  order.inventoryCommitted = false
}

async function releaseConsumedCoupon(order, session) {
  const consumed =
    order.couponConsumed
    || (order.coupon && !order.couponReserved && (
      order.paymentStatus === 'paid'
      || order.paymentMethod === 'cod'
    ))
  if (!consumed || !order.coupon) return

  const result = await Coupon.updateOne(
    { _id: order.coupon, usedCount: { $gt: 0 } },
    { $inc: { usedCount: -1 } },
    { session },
  )
  if (result.modifiedCount !== 1) {
    throw new Error(`Could not release coupon usage for cancelled order ${order.orderNumber}`)
  }
  order.couponConsumed = false
}

async function cancelPaidOrder(order, userId) {
  if (order.paymentMethod !== 'razorpay' || !order.paymentId) {
    throw new OrderError('This paid order cannot be refunded automatically. Contact support.', 409)
  }
  if (order.refundStatus === 'pending') {
    throw new OrderError('A refund request is already in progress for this order.', 409)
  }
  if (order.refundStatus === 'processed') {
    throw new OrderError('This order has already been refunded.', 409)
  }

  const client = createRazorpayClient()
  const claim = await Order.findOneAndUpdate(
    {
      _id: order._id,
      user: userId,
      status: { $in: cancellableStatuses },
      paymentStatus: 'paid',
      refundStatus: { $in: ['not_requested', null] },
    },
    {
      $set: {
        refundStatus: 'pending',
        refundRequestedAt: new Date(),
      },
    },
    { new: true },
  )
  if (!claim) {
    throw new OrderError('This order cannot be cancelled or a refund is already in progress.', 409)
  }

  let refund
  try {
    refund = await client.payments.refund(claim.paymentId, {
      amount: Math.round(claim.total * 100),
      receipt: `cancel-${claim.orderNumber}`,
      notes: { orderNumber: claim.orderNumber },
    })
  } catch (error) {
    console.error('Razorpay refund request failed', error.message)
    throw new OrderError('Razorpay could not confirm the refund request. The order is locked for support review; do not retry cancellation.', 502)
  }

  if (
    refund.payment_id !== claim.paymentId
    || refund.amount !== Math.round(claim.total * 100)
    || !['pending', 'processed'].includes(refund.status)
  ) {
    throw new OrderError('Razorpay returned an unexpected refund result. Contact support before retrying.', 502)
  }

  return finalizePaidCancellation(claim._id, userId, refund)
}

async function finalizePaidCancellation(orderId, userId, refund) {
  const session = await mongoose.startSession()
  let order
  try {
    await session.withTransaction(async () => {
      order = await Order.findOne({ _id: orderId, user: userId }).session(session)
      if (!order) throw new OrderError('Order not found.', 404)
      if (order.status === 'cancelled') return
      if (
        !cancellableStatuses.includes(order.status)
        || order.paymentStatus !== 'paid'
        || order.refundStatus !== 'pending'
      ) {
        throw new OrderError('The order changed while its refund was being processed. Contact support.', 409)
      }

      await restoreCommittedInventory(order, session)
      await releaseConsumedCoupon(order, session)
      order.status = 'cancelled'
      order.cancelledAt = new Date()
      order.refundId = refund.id
      order.refundStatus = refund.status
      if (refund.status === 'processed') order.paymentStatus = 'refunded'
      order.statusHistory.push({
        status: 'cancelled',
        note: refund.status === 'processed' ? 'Cancelled and refunded' : 'Cancelled; refund is processing',
      })
      await order.save({ session })
    })
  } finally {
    await session.endSession()
  }

  return order
}

export async function cancelMyOrder(req, res) {
  const order = await Order.findOne({
    _id: req.params.orderId,
    user: req.user._id,
  })
  if (!order) throw new OrderError('Order not found.', 404)
  if (order.status === 'cancelled') {
    res.json({ order: toOrderDetail(order) })
    return
  }
  if (!cancellableStatuses.includes(order.status)) {
    throw new OrderError('This order can no longer be cancelled because it is already being delivered.', 409)
  }

  const cancelledOrder = order.paymentStatus === 'paid'
    ? await cancelPaidOrder(order, req.user._id)
    : await cancelWithoutRefund(order._id, req.user._id)
  res.json({ order: toOrderDetail(cancelledOrder) })
}
