import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import mongoose from 'mongoose'
import Cart from '../models/Cart.js'
import Coupon from '../models/Coupon.js'
import Order from '../models/Order.js'
import Product from '../models/Product.js'
import { env } from '../config/env.js'
import { createRazorpayClient } from '../utils/razorpay.js'

const SHIPPING_FEE_MINOR = 9900
const FREE_SHIPPING_THRESHOLD_MINOR = 99900
const RESERVATION_DURATION_MS = 15 * 60 * 1000

class CheckoutError extends Error {
  constructor(message, statusCode) {
    super(message)
    this.statusCode = statusCode
  }
}

function toMinorUnits(amount) {
  return Math.round(Number(amount) * 100)
}

function fromMinorUnits(amount) {
  return amount / 100
}

async function createQuote(userId, couponCode) {
  const cart = await Cart.findOne({ user: userId }).lean()
  if (!cart?.items.length) throw new CheckoutError('Your bag is empty.', 400)

  const productIds = cart.items.map((item) => item.product)
  const products = await Product.find({ _id: { $in: productIds }, status: 'active' })
    .populate('category', '_id')
    .lean()
  const productById = new Map(products.map((product) => [product._id.toString(), product]))

  const items = cart.items.map((item) => {
    const productId = item.product.toString()
    const product = productById.get(productId)
    if (!product) {
      throw new CheckoutError('A product in your bag is no longer available. Update your bag and try again.', 409)
    }
    if (item.quantity > product.stock) {
      throw new CheckoutError(`${product.name} has only ${product.stock} item(s) available. Update your bag and try again.`, 409)
    }

    const unitPriceMinor = toMinorUnits(product.discountPrice ?? product.price)
    return {
      product: product._id,
      productData: product,
      name: product.name,
      image: product.images[0]?.url || '',
      quantity: item.quantity,
      unitPrice: fromMinorUnits(unitPriceMinor),
      unitPriceMinor,
      lineTotalMinor: unitPriceMinor * item.quantity,
    }
  })

  const subtotalMinor = items.reduce((total, item) => total + item.lineTotalMinor, 0)
  const shippingMinor = subtotalMinor >= FREE_SHIPPING_THRESHOLD_MINOR ? 0 : SHIPPING_FEE_MINOR
  let coupon
  let discountMinor = 0

  if (couponCode) {
    coupon = await Coupon.findOne({ code: couponCode.toUpperCase() }).lean()
    const now = new Date()
    if (
      !coupon
      || !coupon.isActive
      || coupon.startsAt > now
      || coupon.expiresAt <= now
      || (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit)
    ) {
      throw new CheckoutError('That coupon is invalid, expired, or has reached its usage limit.', 400)
    }
    if (subtotalMinor < toMinorUnits(coupon.minimumOrderAmount)) {
      throw new CheckoutError(`This coupon requires a minimum order of ₹${coupon.minimumOrderAmount}.`, 400)
    }

    const applicableProducts = coupon.applicableProducts.map(String)
    const applicableCategories = coupon.applicableCategories.map(String)
    const eligibleSubtotalMinor = items.reduce((total, item) => {
      const productMatches = !applicableProducts.length
        || applicableProducts.includes(item.product.toString())
      const categoryMatches = !applicableCategories.length
        || applicableCategories.includes(item.productData.category?._id.toString())
      return productMatches && categoryMatches ? total + item.lineTotalMinor : total
    }, 0)

    if (eligibleSubtotalMinor === 0) {
      throw new CheckoutError('This coupon does not apply to the products in your bag.', 400)
    }

    discountMinor = coupon.type === 'percent'
      ? Math.round(eligibleSubtotalMinor * coupon.value / 100)
      : Math.min(eligibleSubtotalMinor, toMinorUnits(coupon.value))
    if (coupon.maximumDiscountAmount != null) {
      discountMinor = Math.min(discountMinor, toMinorUnits(coupon.maximumDiscountAmount))
    }
    discountMinor = Math.min(discountMinor, subtotalMinor)
  }

  return {
    items,
    subtotalMinor,
    shippingMinor,
    discountMinor,
    totalMinor: subtotalMinor + shippingMinor - discountMinor,
    coupon,
    couponCode: coupon?.code,
  }
}

function quoteResponse(quote) {
  return {
    subtotal: fromMinorUnits(quote.subtotalMinor),
    shippingCost: fromMinorUnits(quote.shippingMinor),
    discount: fromMinorUnits(quote.discountMinor),
    total: fromMinorUnits(quote.totalMinor),
    currency: 'INR',
    couponCode: quote.couponCode || null,
    itemCount: quote.items.reduce((count, item) => count + item.quantity, 0),
    items: quote.items.map(({ product, name, image, quantity, unitPrice, lineTotalMinor }) => ({
      productId: product.toString(),
      name,
      image,
      quantity,
      unitPrice,
      lineTotal: fromMinorUnits(lineTotalMinor),
    })),
  }
}

function createOrderNumber() {
  return `SE-${Date.now()}-${randomBytes(4).toString('hex').toUpperCase()}`
}

async function reserveInventory(items, session) {
  for (const item of items) {
    const result = await Product.updateOne(
      { _id: item.product, status: 'active', stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity } },
      { session },
    )
    if (result.modifiedCount !== 1) {
      throw new CheckoutError(`${item.name} is no longer available in the requested quantity. Please review your bag.`, 409)
    }
  }
}

async function reserveCoupon(coupon, session) {
  if (!coupon) return
  const now = new Date()
  const filter = {
    _id: coupon._id,
    isActive: true,
    startsAt: { $lte: now },
    expiresAt: { $gt: now },
  }
  if (coupon.usageLimit != null) filter.usedCount = { $lt: coupon.usageLimit }
  const result = await Coupon.updateOne(filter, { $inc: { usedCount: 1 } }, { session })
  if (result.modifiedCount !== 1) {
    throw new CheckoutError('That coupon is no longer available. Review your order and try again.', 409)
  }
}

function orderItems(quote) {
  return quote.items.map(({ product, name, image, quantity, unitPrice }) => ({
    product,
    name,
    image,
    quantity,
    unitPrice,
  }))
}

function publicOrder(order) {
  return {
    id: order._id.toString(),
    orderNumber: order.orderNumber,
    total: order.total,
    currency: order.currency,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    status: order.status,
  }
}

export function getCheckoutConfig(_req, res) {
  res.json({
    razorpayEnabled: Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET),
    cashOnDeliveryEnabled: true,
  })
}

export async function getCheckoutQuote(req, res) {
  const quote = await createQuote(req.user._id, req.validatedBody.couponCode)
  res.json(quoteResponse(quote))
}

export async function createCheckout(req, res) {
  const { shippingAddress, paymentMethod } = req.validatedBody
  const quote = await createQuote(req.user._id, req.validatedBody.couponCode)
  const orderNumber = createOrderNumber()
  const expiresAt = new Date(Date.now() + RESERVATION_DURATION_MS)
  let gatewayOrder

  if (paymentMethod === 'razorpay') {
    if (quote.totalMinor < 100) {
      throw new CheckoutError('Razorpay cannot process a zero-value order. Choose cash on delivery.', 400)
    }
    const client = createRazorpayClient()
    try {
      gatewayOrder = await client.orders.create({
        amount: quote.totalMinor,
        currency: 'INR',
        receipt: orderNumber,
        notes: { customerId: req.user._id.toString() },
        expire_by: Math.floor(expiresAt.getTime() / 1000),
      })
    } catch (error) {
      console.error('Razorpay order creation failed', error.message)
      throw new CheckoutError('The payment provider could not start checkout. Please try again.', 502)
    }
  }

  const session = await mongoose.startSession()
  let order
  try {
    await session.withTransaction(async () => {
      await reserveInventory(quote.items, session)
      if (paymentMethod === 'razorpay') await reserveCoupon(quote.coupon, session)

      const [createdOrder] = await Order.create([{
        orderNumber,
        user: req.user._id,
        items: orderItems(quote),
        shippingAddress,
        subtotal: fromMinorUnits(quote.subtotalMinor),
        shippingCost: fromMinorUnits(quote.shippingMinor),
        discount: fromMinorUnits(quote.discountMinor),
        total: fromMinorUnits(quote.totalMinor),
        currency: 'INR',
        couponCode: quote.couponCode,
        coupon: quote.coupon?._id,
        couponReserved: paymentMethod === 'razorpay' && Boolean(quote.coupon),
        couponConsumed: paymentMethod === 'cod' && Boolean(quote.coupon),
        paymentMethod,
        paymentStatus: 'pending',
        status: paymentMethod === 'cod' ? 'confirmed' : 'pending',
        statusHistory: [{
          status: paymentMethod === 'cod' ? 'confirmed' : 'pending',
          note: 'Order placed',
        }],
        gatewayOrderId: gatewayOrder?.id,
        paymentReference: gatewayOrder?.id,
        inventoryReserved: paymentMethod === 'razorpay',
        inventoryCommitted: paymentMethod === 'cod',
        reservationExpiresAt: paymentMethod === 'razorpay' ? expiresAt : undefined,
      }], { session })
      order = createdOrder

      if (paymentMethod === 'cod') {
        await reserveCoupon(quote.coupon, session)
        for (const item of quote.items) {
          await Product.updateOne(
            { _id: item.product },
            { $inc: { soldCount: item.quantity } },
            { session },
          )
        }
        await Cart.updateOne({ user: req.user._id }, { $set: { items: [] } }, { session })
      }
    })
  } finally {
    await session.endSession()
  }

  if (gatewayOrder) {
    res.status(201).json({
      order: publicOrder(order),
      gateway: {
        keyId: env.RAZORPAY_KEY_ID,
        orderId: gatewayOrder.id,
        amount: gatewayOrder.amount,
        currency: gatewayOrder.currency,
      },
    })
    return
  }

  res.status(201).json({ order: publicOrder(order) })
}

export function verifyRazorpaySignature(orderId, paymentId, signature) {
  const expected = createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest()
  const received = Buffer.from(signature, 'hex')
  return received.length === expected.length && timingSafeEqual(received, expected)
}

export async function verifyCheckoutPayment(req, res) {
  if (!env.RAZORPAY_KEY_SECRET) {
    throw new CheckoutError('Razorpay payment verification is not configured.', 503)
  }

  const { razorpay_order_id: gatewayOrderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.validatedBody
  const existingOrder = await Order.findOne({ user: req.user._id, gatewayOrderId })
  if (!existingOrder) throw new CheckoutError('The payment order could not be found.', 404)
  if (!verifyRazorpaySignature(gatewayOrderId, paymentId, signature)) {
    throw new CheckoutError('Payment verification failed. Do not retry payment; contact support if your account was charged.', 400)
  }
  if (
    existingOrder.paymentStatus !== 'paid'
    && (
      !existingOrder.inventoryReserved
      || !existingOrder.reservationExpiresAt
      || existingOrder.reservationExpiresAt <= new Date()
      || existingOrder.status === 'cancelled'
    )
  ) {
    throw new CheckoutError('This checkout reservation expired. Contact support if your payment was captured.', 409)
  }
  const client = createRazorpayClient()
  let payment
  try {
    payment = await client.payments.fetch(paymentId)
    if (
      payment.order_id !== gatewayOrderId
      || payment.amount !== toMinorUnits(existingOrder.total)
      || payment.currency !== existingOrder.currency
    ) {
      throw new CheckoutError('The payment details do not match this order.', 400)
    }
    if (payment.status === 'authorized') {
      payment = await client.payments.capture(
        paymentId,
        toMinorUnits(existingOrder.total),
        existingOrder.currency,
      )
    }
  } catch (error) {
    if (error instanceof CheckoutError) throw error
    console.error('Razorpay payment verification failed', error.message)
    throw new CheckoutError('The payment provider could not confirm your payment. Retry verification shortly.', 502)
  }
  if (payment.status !== 'captured') {
    throw new CheckoutError('The payment has not been captured. Your order remains pending.', 409)
  }
  if (existingOrder.paymentStatus === 'paid') {
    if (existingOrder.paymentId !== paymentId) {
      throw new CheckoutError('A different payment has already completed this order. Contact support if you were charged more than once.', 409)
    }
    res.json({ order: publicOrder(existingOrder), alreadyVerified: true })
    return
  }

  const session = await mongoose.startSession()
  let order
  try {
    await session.withTransaction(async () => {
      order = await Order.findOne({
        _id: existingOrder._id,
        user: req.user._id,
      }).session(session)

      if (order.paymentStatus === 'paid') return
      if (
        order.paymentMethod !== 'razorpay'
        || !order.inventoryReserved
        || order.reservationExpiresAt <= new Date()
        || order.status === 'cancelled'
      ) {
        throw new CheckoutError('This checkout reservation expired. Contact support if your payment was captured.', 409)
      }

      for (const item of order.items) {
        await Product.updateOne(
          { _id: item.product },
          { $inc: { soldCount: item.quantity } },
          { session },
        )
      }
      await Cart.updateOne({ user: req.user._id }, { $set: { items: [] } }, { session })
      order.paymentStatus = 'paid'
      order.status = 'confirmed'
      order.statusHistory.push({ status: 'confirmed', note: 'Payment received and verified' })
      order.paymentId = paymentId
      order.paymentReference = paymentId
      order.inventoryReserved = false
      order.inventoryCommitted = true
      order.couponReserved = false
      order.couponConsumed = Boolean(order.coupon)
      order.reservationExpiresAt = undefined
      await order.save({ session })
    })
  } finally {
    await session.endSession()
  }

  res.json({ order: publicOrder(order) })
}

async function releaseOrderReservation(orderId, userId) {
  const session = await mongoose.startSession()
  let order
  try {
    await session.withTransaction(async () => {
      order = await Order.findOne({ _id: orderId, user: userId }).session(session)
      if (!order) throw new CheckoutError('Order not found.', 404)
      if (order.paymentStatus === 'paid') {
        throw new CheckoutError('A paid order cannot be marked as a failed payment.', 409)
      }
      if (order.paymentMethod !== 'razorpay') {
        throw new CheckoutError('Only Razorpay checkouts can be marked as a failed payment.', 409)
      }
      if (!order.inventoryReserved) return

      for (const item of order.items) {
        await Product.updateOne(
          { _id: item.product },
          { $inc: { stock: item.quantity } },
          { session },
        )
      }
      if (order.couponReserved && order.coupon) {
        const couponResult = await Coupon.updateOne(
          { _id: order.coupon, usedCount: { $gt: 0 } },
          { $inc: { usedCount: -1 } },
          { session },
        )
        if (couponResult.modifiedCount !== 1) {
          throw new Error(`Could not release coupon reservation for order ${order.orderNumber}`)
        }
      }

      order.inventoryReserved = false
      order.couponReserved = false
      order.reservationExpiresAt = undefined
      order.paymentStatus = 'failed'
      order.status = 'cancelled'
      order.statusHistory.push({ status: 'cancelled', note: 'Payment failed or checkout expired' })
      order.cancelledAt = new Date()
      await order.save({ session })
    })
  } finally {
    await session.endSession()
  }

  return order
}

export async function markCheckoutPaymentFailed(req, res) {
  const { orderId, razorpayPaymentId } = req.validatedBody
  const checkoutOrder = await Order.findOne({ _id: orderId, user: req.user._id })
  if (!checkoutOrder || !checkoutOrder.gatewayOrderId) {
    throw new CheckoutError('Checkout order not found.', 404)
  }
  const client = createRazorpayClient()
  let payment
  try {
    payment = await client.payments.fetch(razorpayPaymentId)
  } catch (error) {
    console.error('Razorpay payment status lookup failed', error.message)
    throw new CheckoutError('The payment provider could not confirm the payment status. Your inventory remains reserved temporarily.', 502)
  }
  if (payment.order_id !== checkoutOrder.gatewayOrderId || payment.status !== 'failed') {
    throw new CheckoutError('The payment provider has not confirmed this payment as failed.', 409)
  }
  const order = await releaseOrderReservation(orderId, req.user._id)
  res.json({ order: publicOrder(order) })
}

export async function releaseExpiredReservations() {
  const expiredOrders = await Order.find({
    paymentStatus: 'pending',
    inventoryReserved: true,
    reservationExpiresAt: { $lte: new Date() },
  })
    .select('_id orderNumber user')
    .limit(50)
    .lean()

  for (const order of expiredOrders) {
    try {
      await releaseOrderReservation(order._id, order.user)
    } catch (error) {
      console.error(`Could not release expired checkout reservation ${order.orderNumber}`, error)
    }
  }
}
