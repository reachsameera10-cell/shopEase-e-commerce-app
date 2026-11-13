import Order from '../models/Order.js'
import Product from '../models/Product.js'
import Review from '../models/Review.js'
import mongoose from 'mongoose'
import { refreshProductReviewStats } from '../utils/reviewStats.js'

class ReviewError extends Error {
  constructor(message, statusCode) {
    super(message)
    this.statusCode = statusCode
  }
}

function findEligiblePurchase(userId, productId, session) {
  const query = Order.exists({
    user: userId,
    status: 'delivered',
    'items.product': productId,
    $or: [
      { paymentStatus: 'paid' },
      { paymentMethod: 'cod' },
    ],
  })
  return session ? query.session(session) : query
}

export async function listProductReviews(req, res) {
  const product = await Product.findOne({
    _id: req.params.productId,
    status: 'active',
  }).select('_id').lean()
  if (!product) throw new ReviewError('Product not found.', 404)

  const { page, limit } = req.validatedReviewQuery
  const filter = { product: product._id, status: 'approved' }
  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .select('rating title comment verifiedPurchase createdAt user')
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
  ])

  res.json({
    reviews: reviews.map((review) => ({
      id: review._id.toString(),
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      verifiedPurchase: review.verifiedPurchase,
      createdAt: review.createdAt,
      customerName: review.user?.name || 'Shopper',
    })),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  })
}

export async function getReviewEligibility(req, res) {
  const product = await Product.findOne({
    _id: req.params.productId,
    status: 'active',
  }).select('_id').lean()
  if (!product) throw new ReviewError('Product not found.', 404)

  const [purchase, existingReview] = await Promise.all([
    findEligiblePurchase(req.user._id, product._id),
    Review.findOne({ product: product._id, user: req.user._id })
      .select('rating title comment verifiedPurchase status createdAt updatedAt')
      .lean(),
  ])
  res.json({
    eligible: Boolean(purchase),
    canSubmit: Boolean(purchase) && (!existingReview || existingReview.status === 'rejected'),
    review: existingReview ? {
      id: existingReview._id.toString(),
      rating: existingReview.rating,
      title: existingReview.title,
      comment: existingReview.comment,
      verifiedPurchase: existingReview.verifiedPurchase,
      status: existingReview.status,
      createdAt: existingReview.createdAt,
      updatedAt: existingReview.updatedAt,
    } : null,
  })
}

export async function createProductReview(req, res) {
  const { productId, rating, title, comment } = req.validatedBody
  const product = await Product.findOne({
    _id: productId,
    status: 'active',
  }).select('_id').lean()
  if (!product) throw new ReviewError('Product not found.', 404)

  if (!(await findEligiblePurchase(req.user._id, product._id))) {
    throw new ReviewError('A delivered purchase is required before reviewing this product.', 403)
  }

  try {
    const existingReview = await Review.findOne({
      product: product._id,
      user: req.user._id,
    })

    if (existingReview && existingReview.status !== 'rejected') {
      throw new ReviewError('You have already submitted a review for this product.', 409)
    }

    const review = existingReview || new Review({
      product: product._id,
      user: req.user._id,
    })
    review.set({
      rating,
      title,
      comment,
      verifiedPurchase: true,
      status: 'pending',
    })
    await review.save()
    res.status(existingReview ? 200 : 201).json({
      review: toPrivateReview(review),
    })
  } catch (error) {
    if (error.code === 11000) {
      throw new ReviewError('You have already submitted a review for this product.', 409)
    }
    throw error
  }
}

function toPrivateReview(review) {
  return {
    id: review._id.toString(),
    rating: review.rating,
    title: review.title,
    comment: review.comment,
    verifiedPurchase: review.verifiedPurchase,
    status: review.status,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  }
}

export async function updateProductReview(req, res) {
  const session = await mongoose.startSession()
  let review
  let wasApproved = false
  try {
    await session.withTransaction(async () => {
      review = await Review.findOne({
        _id: req.params.reviewId,
        user: req.user._id,
      }).session(session)
      if (!review) throw new ReviewError('Review not found.', 404)

      if (!(await findEligiblePurchase(req.user._id, review.product, session))) {
        throw new ReviewError('A delivered purchase is required before reviewing this product.', 403)
      }

      wasApproved = review.status === 'approved'
      review.set({
        ...req.validatedBody,
        verifiedPurchase: true,
        status: 'pending',
      })
      await review.save({ session })
      if (wasApproved) await refreshProductReviewStats(review.product, session)
    })
  } finally {
    await session.endSession()
  }

  res.json({ review: toPrivateReview(review) })
}

export async function deleteProductReview(req, res) {
  const session = await mongoose.startSession()
  let productId
  try {
    await session.withTransaction(async () => {
      const review = await Review.findOneAndDelete({
        _id: req.params.reviewId,
        user: req.user._id,
      }).session(session)
      if (!review) throw new ReviewError('Review not found.', 404)
      productId = review.product
      await refreshProductReviewStats(productId, session)
    })
  } finally {
    await session.endSession()
  }

  res.json({ message: 'Review deleted.' })
}
