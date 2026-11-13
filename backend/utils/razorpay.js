import Razorpay from 'razorpay'
import { env } from '../config/env.js'

export function createRazorpayClient() {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    const error = new Error('Razorpay is not configured. Configure the Razorpay test credentials to use online payments.')
    error.statusCode = 503
    throw error
  }

  return new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  })
}
