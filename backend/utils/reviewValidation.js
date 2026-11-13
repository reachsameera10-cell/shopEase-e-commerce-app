import { z } from 'zod'

const productIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid product ID')

export const createReviewSchema = z.object({
  productId: productIdSchema,
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional().default(''),
  comment: z.string().trim().min(1).max(3000),
}).strict()

export const updateReviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional().default(''),
  comment: z.string().trim().min(1).max(3000),
}).strict()

export const reviewListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
}).strict()
