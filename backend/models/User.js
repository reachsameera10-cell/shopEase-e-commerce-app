import mongoose from 'mongoose'
import addressSchema from './addressSchema.js'

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    password: { type: String, required: true, minlength: 8, select: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    phone: { type: String, trim: true, maxlength: 30 },
    addresses: { type: [addressSchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

const User = mongoose.models.User || mongoose.model('User', userSchema)

export default User;
