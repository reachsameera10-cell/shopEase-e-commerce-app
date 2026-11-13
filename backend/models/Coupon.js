import mongoose from 'mongoose'

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    type: { type: String, enum: ['percent', 'fixed'], required: true },
    value: { type: Number, required: true, min: 0 },
    minimumOrderAmount: { type: Number, min: 0, default: 0 },
    maximumDiscountAmount: { type: Number, min: 0 },
    startsAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    usageLimit: { type: Number, min: 1 },
    usedCount: { type: Number, min: 0, default: 0 },
    applicableCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    applicableProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

couponSchema.path('value').validate(function validateCouponValue(value) {
  return this.type !== 'percent' || value <= 100
}, 'Percentage coupon value cannot exceed 100')

couponSchema.pre('validate', function validateCouponDates() {
  if (this.expiresAt <= this.startsAt) {
    this.invalidate('expiresAt', 'Coupon expiry must be after its start date')
  }
})

const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', couponSchema)

export default Coupon
