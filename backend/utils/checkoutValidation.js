import { z } from 'zod'

const shippingAddressSchema = z.object({
  fullName: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(7).max(30).regex(/^\+?[0-9][0-9\s()-]*$/),
  street: z.string().trim().min(1).max(200),
  apartment: z.string().trim().max(100).optional().default(''),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().min(3).max(20),
  country: z.string().trim().min(1).max(100),
}).strict()

const couponCodeSchema = z.string().trim().max(40).optional().transform((code) => code || undefined)

export const checkoutSchema = z.object({
  shippingAddress: shippingAddressSchema,
  paymentMethod: z.enum(['razorpay', 'cod']),
  couponCode: couponCodeSchema,
}).strict()

export const couponQuoteSchema = z.object({
  couponCode: couponCodeSchema,
}).strict()

export const paymentVerificationSchema = z.object({
  razorpay_order_id: z.string().min(5).max(100),
  razorpay_payment_id: z.string().min(5).max(100),
  razorpay_signature: z.string().regex(/^[a-f\d]{64}$/i),
}).strict()

export const paymentFailureSchema = z.object({
  orderId: z.string().regex(/^[a-f\d]{24}$/i),
  razorpayPaymentId: z.string().min(5).max(100),
}).strict()
