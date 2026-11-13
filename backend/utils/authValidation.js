import { z } from 'zod'

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .refine(
    (password) => Buffer.byteLength(password, 'utf8') <= 72,
    'Password must not exceed 72 UTF-8 bytes',
  )

const emailSchema = z
  .string()
  .trim()
  .email('Enter a valid email address')
  .max(254)
  .transform((email) => email.toLowerCase())

const newPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .refine((password) => Buffer.byteLength(password, 'utf8') <= 72, 'Password must not exceed 72 UTF-8 bytes')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/[0-9]/, 'Password must include a number')
  .regex(/[^A-Za-z0-9]/, 'Password must include a symbol')

export const forgotPasswordSchema = z.object({
  email: emailSchema,
}).strict()

export const resetPasswordSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/, 'Invalid or expired reset link'),
  newPassword: newPasswordSchema,
}).strict()

export const registerSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    email: emailSchema,
    password: passwordSchema,
  })
  .strict()

export const loginSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
  })
  .strict()

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    phone: z.string().trim().max(30).optional(),
  })
  .strict()
  .refine((profile) => Object.values(profile).some((value) => value !== undefined), {
    message: 'Provide at least one profile field to update',
  })
