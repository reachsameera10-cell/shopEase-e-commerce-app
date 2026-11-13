import mongoose from 'mongoose'

const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: { type: Number, required: true, min: 1, max: 5, validate: Number.isInteger },
    title: { type: String, trim: true, maxlength: 120 },
    comment: { type: String, required: true, trim: true, maxlength: 3000 },
    verifiedPurchase: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true },
)

reviewSchema.index({ product: 1, user: 1 }, { unique: true })
reviewSchema.index({ product: 1, status: 1, createdAt: -1 })

const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema)

export default Review
