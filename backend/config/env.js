import { config as loadDotenv } from 'dotenv'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'

loadDotenv({ path: fileURLToPath(new URL('../.env', import.meta.url)) })

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  API_PUBLIC_URL: z.string().url().default('http://localhost:5000'),
  IMAGE_STORAGE_PROVIDER: z.enum(['local', 'cloudinary']).default(
    process.env.CLOUDINARY_CLOUD_NAME
    && process.env.CLOUDINARY_API_KEY
    && process.env.CLOUDINARY_API_SECRET
      ? 'cloudinary'
      : 'local',
  ),
  CLOUDINARY_CLOUD_NAME: z.string().default(''),
  CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),
  RESEND_API_KEY: z.string().trim().default(''),
  EMAIL_FROM: z.string().trim().default(''),
  RAZORPAY_KEY_ID: z.string().default(''),
  RAZORPAY_KEY_SECRET: z.string().default(''),
}).superRefine((settings, context) => {
  const hasKeyId = Boolean(settings.RAZORPAY_KEY_ID)
  const hasKeySecret = Boolean(settings.RAZORPAY_KEY_SECRET)
  const hasResendApiKey = Boolean(settings.RESEND_API_KEY)
  const hasEmailFrom = Boolean(settings.EMAIL_FROM)

  if (hasResendApiKey !== hasEmailFrom) {
    context.addIssue({
      code: 'custom',
      path: [hasResendApiKey ? 'EMAIL_FROM' : 'RESEND_API_KEY'],
      message: 'Both Resend API key and sender address must be configured together',
    })
  }
  if (hasKeyId !== hasKeySecret) {
    context.addIssue({
      code: 'custom',
      path: [hasKeyId ? 'RAZORPAY_KEY_SECRET' : 'RAZORPAY_KEY_ID'],
      message: 'Both Razorpay credentials must be configured together',
    })
  }
  if (
    settings.NODE_ENV !== 'production'
    && hasKeyId
    && !settings.RAZORPAY_KEY_ID.startsWith('rzp_test_')
  ) {
    context.addIssue({
      code: 'custom',
      path: ['RAZORPAY_KEY_ID'],
      message: 'Use a Razorpay test key outside production',
    })
  }

  const cloudinaryCredentials = [
    settings.CLOUDINARY_CLOUD_NAME,
    settings.CLOUDINARY_API_KEY,
    settings.CLOUDINARY_API_SECRET,
  ]
  const hasCloudinaryCredentials = cloudinaryCredentials.some(Boolean)
  const hasCompleteCloudinaryCredentials = cloudinaryCredentials.every(Boolean)

  if (
    (settings.IMAGE_STORAGE_PROVIDER === 'cloudinary' || hasCloudinaryCredentials)
    && !hasCompleteCloudinaryCredentials
  ) {
    context.addIssue({
      code: 'custom',
      path: ['CLOUDINARY_CLOUD_NAME'],
      message: 'Cloudinary image storage requires cloud name, API key, and API secret',
    })
  }
})

const result = envSchema.safeParse(process.env)

if (!result.success) {
  const issues = result.error.issues
    .map(({ path, message }) => `${path.join('.')}: ${message}`)
    .join('; ')

  throw new Error(`Invalid environment configuration: ${issues}`)
}

export const env = result.data
