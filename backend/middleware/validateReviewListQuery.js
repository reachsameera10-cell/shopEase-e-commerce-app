import { reviewListQuerySchema } from '../utils/reviewValidation.js'

export function validateReviewListQuery(req, res, next) {
  const result = reviewListQuerySchema.safeParse(req.query)
  if (!result.success) {
    res.status(400).json({
      message: 'Invalid review query',
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    })
    return
  }

  req.validatedReviewQuery = result.data
  next()
}
