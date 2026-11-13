import { z } from 'zod'

const productQuerySchema = z
  .object({
    search: z.string().trim().min(1).max(100).optional(),
    category: z.string().trim().min(1).max(100).optional(),
    minPrice: z.coerce.number().finite().min(0).optional(),
    maxPrice: z.coerce.number().finite().min(0).optional(),
    sort: z.enum([
      'newest',
      'price-asc',
      'price-desc',
      'discount-desc',
      'discount-asc',
      'popular',
      'rating',
    ]).default('newest'),
    page: z.coerce.number().int().min(1).max(1000000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(12),
  })
  .superRefine((query, context) => {
    if (
      query.minPrice !== undefined &&
      query.maxPrice !== undefined &&
      query.minPrice > query.maxPrice
    ) {
      context.addIssue({
        code: 'custom',
        path: ['maxPrice'],
        message: 'maxPrice must be greater than or equal to minPrice',
      })
    }
  })

export function validateProductQuery(req, res, next) {
  const result = productQuerySchema.safeParse(req.query)

  if (!result.success) {
    res.status(400).json({
      message: 'Invalid product query parameters',
      errors: result.error.issues.map(({ path, message }) => ({
        field: path.join('.'),
        message,
      })),
    })
    return
  }

  req.validatedProductQuery = result.data
  next()
}
