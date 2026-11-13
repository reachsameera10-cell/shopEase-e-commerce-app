export function validateAdminIdParam(parameterName) {
  return (req, res, next) => {
    if (!/^[a-f\d]{24}$/i.test(req.params[parameterName])) {
      res.status(400).json({ message: `Invalid ${parameterName}` })
      return
    }

    next()
  }
}
