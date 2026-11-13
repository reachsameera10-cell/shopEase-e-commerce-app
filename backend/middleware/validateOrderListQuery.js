import { z } from 'zod'

const orderListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
}).strict()

export function validateOrderListQuery(req, res, next) {
  const result = orderListQuerySchema.safeParse(req.query)
  if (!result.success) {
    res.status(400).json({
      message: 'Invalid order-list query',
      errors: result.error.issues.map(({ path, message }) => ({
        field: path.join('.'),
        message,
      })),
    })
    return
  }

  req.validatedQuery = result.data
  next()
}
