// Runtime validation coverage for server-side product and payment request rules.
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createProductSchema,
  updateOrderStatusSchema,
} from '../utils/adminValidation.js'
import {
  checkoutSchema,
  paymentVerificationSchema,
} from '../utils/checkoutValidation.js'
import { createReviewSchema, updateReviewSchema } from '../utils/reviewValidation.js'

const validProduct = {
  name: 'Everyday mug',
  slug: 'EVERYDAY-MUG',
  description: 'A ceramic mug.',
  images: [{ url: 'https://example.com/mug.webp' }],
  price: '100',
  discountPrice: '',
  category: '0123456789abcdef01234567',
  stock: '3',
}

const validCheckout = {
  shippingAddress: {
    fullName: 'Test Customer',
    phone: '+1 555 123 4567',
    street: '1 Market Street',
    city: 'San Francisco',
    state: 'California',
    postalCode: '94105',
    country: 'United States',
  },
  paymentMethod: 'cod',
}

test('product validation normalizes typed fields and rejects invalid discounts', () => {
  const parsed = createProductSchema.safeParse(validProduct)

  assert.equal(parsed.success, true)
  assert.equal(parsed.data.slug, 'everyday-mug')
  assert.equal(parsed.data.price, 100)
  assert.equal(parsed.data.stock, 3)
  assert.equal(parsed.data.discountPrice, null)
  assert.equal(createProductSchema.safeParse({
    ...validProduct,
    images: [{
      url: 'https://res.cloudinary.com/example/image/upload/v1/shopease/products/product-image.png',
      publicId: 'shopease/products/product-image',
    }],
  }).success, true)
  assert.equal(createProductSchema.safeParse({
    ...validProduct,
    images: [{
      url: 'https://example.com/image.png',
      publicId: 'another-folder/image',
    }],
  }).success, false)
  assert.equal(createProductSchema.safeParse({
    ...validProduct,
    discountPrice: 100,
  }).success, false)
})

test('admin order updates accept only supported fulfillment states', () => {
  assert.equal(updateOrderStatusSchema.safeParse({
    status: 'shipped',
  }).success, true)
  assert.equal(updateOrderStatusSchema.safeParse({
    status: 'cancelled',
  }).success, false)
})

test('checkout rejects unsupported payment methods and malformed signatures', () => {
  assert.equal(checkoutSchema.safeParse({
    ...validCheckout,
    paymentMethod: 'wire-transfer',
  }).success, false)

  assert.equal(paymentVerificationSchema.safeParse({
    razorpay_order_id: 'order_12345',
    razorpay_payment_id: 'pay_12345',
    razorpay_signature: 'not-a-signature',
  }).success, false)
})

test('review validation enforces a valid product, rating, and comment', () => {
  const validReview = {
    productId: '0123456789abcdef01234567',
    rating: '5',
    title: 'Lovely quality',
    comment: 'The item matched the description.',
  }

  const parsed = createReviewSchema.safeParse(validReview)
  assert.equal(parsed.success, true)
  assert.equal(parsed.data.rating, 5)
  assert.equal(createReviewSchema.safeParse({
    ...validReview,
    rating: 6,
  }).success, false)
  assert.equal(createReviewSchema.safeParse({
    ...validReview,
    comment: ' ',
  }).success, false)
  assert.equal(updateReviewSchema.safeParse({
    rating: 1,
    title: '',
    comment: 'Updated review text.',
  }).success, true)
  assert.equal(updateReviewSchema.safeParse({
    rating: 0,
    comment: 'Invalid rating.',
  }).success, false)
})
