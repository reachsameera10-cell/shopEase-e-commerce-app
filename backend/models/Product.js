import mongoose from 'mongoose'

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true, maxlength: 2048 },
    alt: { type: String, trim: true, maxlength: 160 },
    publicId: { type: String, trim: true, maxlength: 255 },
  },
  { _id: false },
)

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    description: { type: String, required: true, trim: true, maxlength: 10000 },
    brand: { type: String, trim: true, maxlength: 100 },
    images: {
      type: [imageSchema],
      validate: {
        validator: (images) => images.length > 0,
        message: 'A product must have at least one image',
      },
    },
    price: { type: Number, required: true, min: 0 },
    discountPrice: {
      type: Number,
      min: 0,
      validate: {
        validator(value) {
          return value == null || value < this.price
        },
        message: 'Discount price must be less than the regular price',
      },
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    stock: { type: Number, required: true, min: 0, validate: Number.isInteger },
    soldCount: { type: Number, min: 0, default: 0 },
    ratingsAverage: { type: Number, min: 0, max: 5, default: 0 },
    ratingsCount: { type: Number, min: 0, default: 0 },
    isFeatured: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['draft', 'active', 'archived'],
      default: 'draft',
      index: true,
    },
  },
  { timestamps: true },
)

productSchema.index({ status: 1, category: 1, price: 1 })
productSchema.index({ status: 1, soldCount: -1, createdAt: -1 })
productSchema.index({ status: 1, ratingsAverage: -1 })
productSchema.index({ name: 'text', description: 'text', brand: 'text' })

const Product = mongoose.models.Product || mongoose.model('Product', productSchema)

export default Product
