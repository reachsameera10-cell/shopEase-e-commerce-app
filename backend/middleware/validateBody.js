export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body)

    if (!result.success) {
      res.status(400).json({
        message: 'Invalid request body',
        errors: result.error.issues.map(({ path, message }) => ({
          field: path.join('.'),
          message,
        })),
      })
      return
    }

    req.validatedBody = result.data
    next()
  }
}
