import assert from 'node:assert/strict'
import test from 'node:test'
import mongoose from 'mongoose'
import Review from '../models/Review.js'
import { deleteProductReview, updateProductReview } from '../controllers/reviewsController.js'

test('customers cannot update or delete another customer’s review', async (t) => {
  const reviewOwnerId = '0123456789abcdef01234567'
  const otherUserId = 'abcdef0123456789abcdef01'
  const reviewId = 'fedcba9876543210fedcba98'
  const session = {
    async withTransaction(callback) {
      await callback()
    },
    async endSession() {},
  }
  t.mock.method(mongoose, 'startSession', async () => session)
  t.mock.method(Review, 'findOne', (filter) => {
    assert.deepEqual(filter, { _id: reviewId, user: otherUserId })
    assert.notEqual(reviewOwnerId, filter.user)
    return { session: async () => null }
  })
  t.mock.method(Review, 'findOneAndDelete', (filter) => {
    assert.deepEqual(filter, { _id: reviewId, user: otherUserId })
    assert.notEqual(reviewOwnerId, filter.user)
    return { session: () => Promise.resolve(null) }
  })

  await assert.rejects(
    updateProductReview({
      params: { reviewId },
      user: { _id: otherUserId },
      validatedBody: { rating: 5, title: '', comment: 'Unauthorized edit' },
    }, {}),
    (error) => error.statusCode === 404,
  )
  await assert.rejects(
    deleteProductReview({
      params: { reviewId },
      user: { _id: otherUserId },
    }, {}),
    (error) => error.statusCode === 404,
  )
})
