import assert from 'node:assert/strict'
import test from 'node:test'
import Product from '../models/Product.js'
import Review from '../models/Review.js'
import { refreshProductReviewStats } from '../utils/reviewStats.js'

test('review aggregates use approved reviews and update the product summary', async (t) => {
  const productId = '0123456789abcdef01234567'
  const session = { id: 'test-session' }
  const pipeline = []
  let update
  const aggregate = {
    session(receivedSession) {
      assert.equal(receivedSession, session)
      return this
    },
    then(resolve, reject) {
      return Promise.resolve([{ average: 4.25, count: 2 }]).then(resolve, reject)
    },
  }
  t.mock.method(Review, 'aggregate', (stages) => {
    pipeline.push(...stages)
    return aggregate
  })
  t.mock.method(Product, 'updateOne', async (...args) => {
    update = args
  })

  await refreshProductReviewStats(productId, session)

  assert.deepEqual(pipeline[0], { $match: { product: productId, status: 'approved' } })
  assert.deepEqual(update[0], { _id: productId })
  assert.deepEqual(update[1].$set, { ratingsAverage: 4.3, ratingsCount: 2 })
  assert.deepEqual(update[2], { session })
})

test('review aggregates reset the product summary when no approved reviews remain', async (t) => {
  let update
  t.mock.method(Review, 'aggregate', () => ({
    then(resolve, reject) {
      return Promise.resolve([]).then(resolve, reject)
    },
  }))
  t.mock.method(Product, 'updateOne', async (...args) => {
    update = args
  })

  await refreshProductReviewStats('0123456789abcdef01234567')

  assert.deepEqual(update[1].$set, { ratingsAverage: 0, ratingsCount: 0 })
  assert.equal(update.length, 3)
  assert.equal(update[2], undefined)
})
