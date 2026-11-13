import { randomBytes } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mongoose from 'mongoose'
import Category from '../models/Category.js'
import Order from '../models/Order.js'
import Product from '../models/Product.js'
import Review from '../models/Review.js'
import User from '../models/User.js'
import { env } from '../config/env.js'
import { deleteProductImage, uploadProductImage } from '../utils/cloudinary.js'
import { refreshProductReviewStats } from '../utils/reviewStats.js'

const uploadsDirectory = fileURLToPath(new URL('../uploads/', import.meta.url))
const orderStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']
const reviewStatuses = ['pending', 'approved', 'rejected']
const statusTransitions = {
  confirmed: ['processing'],
  processing: ['shipped'],
  shipped: ['delivered'],
}

class AdminError extends Error {
  constructor(message, statusCode) {
    super(message)
    this.statusCode = statusCode
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function pagination(page, limit, total) {
  return { page, limit, total, pages: Math.ceil(total / limit) }
}

function sendConflict(error, res) {
  if (error.code === 11000) {
    res.status(409).json({ message: 'That name or slug is already in use.' })
    return true
  }
  return false
}

export async function getDashboard(_req, res) {
  const start = new Date()
  start.setMonth(start.getMonth() - 5, 1)
  start.setHours(0, 0, 0, 0)
  const [customers, products, orders, revenueResult, monthlyRevenue, recentOrders, lowStock] = await Promise.all([
    User.countDocuments({ role: 'customer' }),
    Product.countDocuments({ status: { $ne: 'archived' } }),
    Order.countDocuments(),
    Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, revenue: { $sum: '$total' } } },
    ]),
    Order.aggregate([
      { $match: { paymentStatus: 'paid', createdAt: { $gte: start } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    Order.find().sort({ createdAt: -1 }).limit(8)
      .select('orderNumber user total currency status paymentStatus createdAt')
      .populate('user', 'name email')
      .lean(),
    Product.find({ status: { $ne: 'archived' }, stock: { $lte: 5 } })
      .select('name slug stock status')
      .sort({ stock: 1, name: 1 })
      .limit(8)
      .lean(),
  ])
  const [categories, reviewsPending] = await Promise.all([
    Category.countDocuments({ isActive: true }),
    Review.countDocuments({ status: 'pending' }),
  ])

  res.json({
    metrics: {
      revenue: revenueResult[0]?.revenue || 0,
      orders,
      customers,
      products,
      categories,
      reviewsPending,
    },
    monthlyRevenue,
    recentOrders,
    lowStock,
  })
}

export async function listAdminProducts(req, res) {
  const { page, limit, search, status } = req.validatedQuery
  const filter = {}
  if (status && ['draft', 'active', 'archived'].includes(status)) filter.status = status
  else if (status) throw new AdminError('Invalid product status filter.', 400)
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i')
    filter.$or = [{ name: pattern }, { slug: pattern }, { brand: pattern }]
  }
  const [products, total] = await Promise.all([
    Product.find(filter).populate('category', 'name slug').sort({ updatedAt: -1 })
      .skip((page - 1) * limit).limit(limit).lean(),
    Product.countDocuments(filter),
  ])
  res.json({ products, pagination: pagination(page, limit, total) })
}

async function ensureCategory(categoryId) {
  const category = await Category.findOne({ _id: categoryId, isActive: true }).select('_id').lean()
  if (!category) throw new AdminError('Select an active category for this product.', 400)
}

export async function createProduct(req, res) {
  try {
    await ensureCategory(req.validatedBody.category)
    const product = await Product.create(req.validatedBody)
    res.status(201).json({ product })
  } catch (error) {
    if (sendConflict(error, res)) return
    throw error
  }
}

export async function updateProduct(req, res) {
  try {
    const product = await Product.findById(req.params.productId)
    if (!product) throw new AdminError('Product not found.', 404)
    await ensureCategory(req.validatedBody.category || product.category.toString())

    if (req.validatedBody.discountPrice !== undefined || req.validatedBody.price !== undefined) {
      const nextPrice = req.validatedBody.price ?? product.price
      const nextDiscountPrice = Object.hasOwn(req.validatedBody, 'discountPrice')
        ? req.validatedBody.discountPrice
        : product.discountPrice
      if (nextDiscountPrice != null && nextDiscountPrice >= nextPrice) {
        throw new AdminError('Discount price must be less than the regular price.', 400)
      }
    }
    const nextProduct = { ...req.validatedBody }
    let removedCloudinaryImages = []
    if (nextProduct.images) {
      const currentImagesByUrl = new Map(product.images.map((image) => [image.url, image]))
      nextProduct.images = nextProduct.images.map((image) => {
        const existingImage = currentImagesByUrl.get(image.url)
        return {
          ...image,
          publicId: existingImage?.publicId || image.publicId,
        }
      })
      const retainedImageUrls = new Set(nextProduct.images.map((image) => image.url))
      removedCloudinaryImages = product.images
        .filter((image) => image.publicId && !retainedImageUrls.has(image.url))
        .map((image) => image.publicId)
    }
    product.set(nextProduct)
    await product.save()
    await product.populate('category', 'name slug')
    const warnings = []
    if (env.IMAGE_STORAGE_PROVIDER === 'cloudinary') {
      const deletionResults = await Promise.allSettled(
        removedCloudinaryImages.map((publicId) => deleteProductImage(publicId)),
      )
      if (deletionResults.some((result) => result.status === 'rejected' || !result.value)) {
        console.error('Product updated but one or more Cloudinary images could not be deleted')
        warnings.push('Product updated, but one or more removed images could not be deleted from Cloudinary.')
      }
    }
    res.json({ product, warnings })
  } catch (error) {
    if (sendConflict(error, res)) return
    throw error
  }
}

export async function archiveProduct(req, res) {
  const product = await Product.findByIdAndUpdate(
    req.params.productId,
    { $set: { status: 'archived' } },
    { new: true },
  ).select('_id name slug status')
  if (!product) throw new AdminError('Product not found.', 404)
  res.json({ product })
}

export async function listAdminCategories(_req, res) {
  const categories = await Category.find().sort({ sortOrder: 1, name: 1 }).lean()
  res.json({ categories })
}

export async function createCategory(req, res) {
  try {
    const category = await Category.create(req.validatedBody)
    res.status(201).json({ category })
  } catch (error) {
    if (sendConflict(error, res)) return
    throw error
  }
}

export async function updateCategory(req, res) {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.categoryId,
      { $set: req.validatedBody },
      { new: true, runValidators: true, context: 'query' },
    )
    if (!category) throw new AdminError('Category not found.', 404)
    res.json({ category })
  } catch (error) {
    if (sendConflict(error, res)) return
    throw error
  }
}

export async function deactivateCategory(req, res) {
  const category = await Category.findByIdAndUpdate(
    req.params.categoryId,
    { $set: { isActive: false } },
    { new: true },
  )
  if (!category) throw new AdminError('Category not found.', 404)
  res.json({ category })
}

export async function listAdminOrders(req, res) {
  const { page, limit, search, status } = req.validatedQuery
  const filter = {}
  if (status && orderStatuses.includes(status)) filter.status = status
  else if (status) throw new AdminError('Invalid order status filter.', 400)
  if (search) {
    const matchingUsers = await User.find({
      $or: [
        { name: new RegExp(escapeRegex(search), 'i') },
        { email: new RegExp(escapeRegex(search), 'i') },
      ],
    }).select('_id').lean()
    const matchingUserIds = matchingUsers.map((user) => user._id)
    filter.$or = [
      { orderNumber: new RegExp(escapeRegex(search), 'i') },
      { user: { $in: matchingUserIds } },
    ]
  }
  const [orders, total] = await Promise.all([
    Order.find(filter).populate('user', 'name email').sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(limit).lean(),
    Order.countDocuments(filter),
  ])
  res.json({ orders, pagination: pagination(page, limit, total) })
}

export async function updateAdminOrderStatus(req, res) {
  const { status, cashCollected } = req.validatedBody
  const order = await Order.findById(req.params.orderId)
  if (!order) throw new AdminError('Order not found.', 404)
  const collectingCashForDeliveredOrder =
    order.status === 'delivered'
    && status === 'delivered'
    && order.paymentMethod === 'cod'
    && order.paymentStatus !== 'paid'
    && cashCollected
  if (!collectingCashForDeliveredOrder && !statusTransitions[order.status]?.includes(status)) {
    throw new AdminError(`An order in "${order.status}" cannot move to "${status}".`, 409)
  }
  if (cashCollected && (order.paymentMethod !== 'cod' || status !== 'delivered')) {
    throw new AdminError('Cash can only be recorded for a COD order marked delivered.', 400)
  }

  const updatedOrder = await Order.findOneAndUpdate(
    { _id: order._id, status: order.status },
    {
      $set: {
        status,
        ...(cashCollected ? { paymentStatus: 'paid' } : {}),
      },
      $push: {
        statusHistory: {
          status,
          note: collectingCashForDeliveredOrder
            ? 'Cash received after delivery'
            : cashCollected ? 'Delivered; cash received' : `Order marked ${status}`,
          changedAt: new Date(),
        },
      },
    },
    { new: true, runValidators: true },
  ).populate('user', 'name email')
  if (!updatedOrder) throw new AdminError('The order changed; refresh and try again.', 409)
  res.json({ order: updatedOrder })
}

export async function listAdminCustomers(req, res) {
  const { page, limit, search } = req.validatedQuery
  const filter = { role: 'customer' }
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i')
    filter.$or = [{ name: pattern }, { email: pattern }, { phone: pattern }]
  }
  const [customers, total] = await Promise.all([
    User.find(filter).select('_id name email phone isActive createdAt')
      .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(filter),
  ])
  const customerIds = customers.map((customer) => customer._id)
  const orderCounts = await Order.aggregate([
    { $match: { user: { $in: customerIds } } },
    { $group: { _id: '$user', count: { $sum: 1 } } },
  ])
  const countByUser = new Map(orderCounts.map((entry) => [entry._id.toString(), entry.count]))
  res.json({
    customers: customers.map((customer) => ({
      ...customer,
      orderCount: countByUser.get(customer._id.toString()) || 0,
    })),
    pagination: pagination(page, limit, total),
  })
}

export async function listAdminReviews(req, res) {
  const { page, limit, search, status } = req.validatedQuery
  const filter = {}
  if (status && reviewStatuses.includes(status)) filter.status = status
  else if (status) throw new AdminError('Invalid review status filter.', 400)
  if (search) {
    const matchingProducts = await Product.find({
      name: new RegExp(escapeRegex(search), 'i'),
    }).select('_id').lean()
    const matchingUsers = await User.find({
      name: new RegExp(escapeRegex(search), 'i'),
    }).select('_id').lean()
    filter.$or = [
      { product: { $in: matchingProducts.map((product) => product._id) } },
      { user: { $in: matchingUsers.map((user) => user._id) } },
    ]
  }
  const [reviews, total] = await Promise.all([
    Review.find(filter).populate('product', 'name slug').populate('user', 'name email')
      .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Review.countDocuments(filter),
  ])
  res.json({ reviews, pagination: pagination(page, limit, total) })
}

export async function updateAdminReviewStatus(req, res) {
  const { status } = req.validatedBody
  const session = await mongoose.startSession()
  let review
  try {
    await session.withTransaction(async () => {
      review = await Review.findById(req.params.reviewId).session(session)
      if (!review) throw new AdminError('Review not found.', 404)
      if (review.status === status) return

      review.status = status
      await review.save({ session })
      await refreshProductReviewStats(review.product, session)
    })
  } finally {
    await session.endSession()
  }

  await review.populate('product', 'name slug')
  await review.populate('user', 'name email')
  res.json({ review })
}

function imageType(buffer) {
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return { ext: 'jpg', mime: 'image/jpeg' }
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { ext: 'png', mime: 'image/png' }
  }
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return { ext: 'webp', mime: 'image/webp' }
  }
  return null
}

export async function uploadAdminImage(req, res) {
  if (!req.file) throw new AdminError('Choose an image to upload.', 400)
  const type = imageType(req.file.buffer)
  if (!type || type.mime !== req.file.mimetype) {
    throw new AdminError('The uploaded file is not a valid JPEG, PNG, or WebP image.', 400)
  }

  if (env.IMAGE_STORAGE_PROVIDER === 'cloudinary') {
    const image = await uploadProductImage(req.file.buffer, type.ext)
    res.status(201).json({ image })
    return
  }

  await mkdir(uploadsDirectory, { recursive: true })
  const filename = `${randomBytes(18).toString('hex')}.${type.ext}`
  await writeFile(path.join(uploadsDirectory, filename), req.file.buffer, { flag: 'wx' })
  res.status(201).json({
    image: { url: `${env.API_PUBLIC_URL.replace(/\/$/, '')}/uploads/${filename}` },
  })
}
