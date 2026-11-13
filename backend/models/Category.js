import mongoose from 'mongoose'

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    description: { type: String, trim: true, maxlength: 500 },
    image: { type: String, trim: true, maxlength: 2048 },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true },
)

categorySchema.index({ isActive: 1, sortOrder: 1, name: 1 })

const Category =
  mongoose.models.Category || mongoose.model('Category', categorySchema)

export default Category
