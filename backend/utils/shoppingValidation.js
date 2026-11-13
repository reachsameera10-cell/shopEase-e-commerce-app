import { z } from 'zod'

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid product ID')

export const addCartItemSchema = z
  .object({
    productId: objectIdSchema,
    quantity: z.coerce.number().int().min(1).max(50).default(1),
  })
  .strict()

export const updateCartItemSchema = z
  .object({
    quantity: z.coerce.number().int().min(1).max(50),
  })
  .strict()

export const wishlistItemSchema = z
  .object({
    productId: objectIdSchema,
  })
  .strict()
