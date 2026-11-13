import { adminListQuerySchema } from '../utils/adminValidation.js'

export function validateAdminListQuery(req, res, next) {
  const result = adminListQuerySchema.safeParse(req.query)
  if (!result.success) {
    res.status(400).json({
      message: 'Invalid admin-list query',
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
