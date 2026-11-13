import mongoose from 'mongoose'
import addressSchema from './addressSchema.js'

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    image: { type: String, trim: true, maxlength: 2048 },
    quantity: { type: Number, required: true, min: 1, validate: Number.isInteger },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false },
)

const orderStatusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
      required: true,
    },
    note: { type: String, trim: true, maxlength: 160 },
    changedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
)

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, trim: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    items: { type: [orderItemSchema], required: true, validate: (items) => items.length > 0 },
    shippingAddress: { type: addressSchema, required: true },
    subtotal: { type: Number, required: true, min: 0 },
    shippingCost: { type: Number, required: true, min: 0, default: 0 },
    discount: { type: Number, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true, match: /^[A-Z]{3}$/, default: 'INR' },
    couponCode: { type: String, trim: true, uppercase: true },
    paymentMethod: { type: String, enum: ['razorpay', 'cod'], required: true },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentReference: { type: String, trim: true },
    gatewayOrderId: { type: String, trim: true },
    paymentId: { type: String, trim: true },
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
    couponReserved: { type: Boolean, default: false },
    couponConsumed: { type: Boolean, default: false },
    inventoryReserved: { type: Boolean, default: false },
    inventoryCommitted: { type: Boolean, default: false },
    reservationExpiresAt: { type: Date },
    refundId: { type: String, trim: true },
    refundStatus: {
      type: String,
      enum: ['not_requested', 'pending', 'processed', 'failed'],
      default: 'not_requested',
    },
    refundRequestedAt: { type: Date },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    statusHistory: { type: [orderStatusHistorySchema], default: [] },
    cancelledAt: { type: Date },
  },
  { timestamps: true },
)

orderSchema.index({ user: 1, createdAt: -1 })
orderSchema.index({ status: 1, createdAt: -1 })
orderSchema.index({ gatewayOrderId: 1 }, { unique: true, sparse: true })
orderSchema.index({ paymentStatus: 1, inventoryReserved: 1, reservationExpiresAt: 1 })

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema)

export default Order
