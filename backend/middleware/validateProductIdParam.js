export function validateProductIdParam(paramName = 'productId') {
  return function validateProductId(req, res, next) {
    if (!/^[a-f\d]{24}$/i.test(req.params[paramName])) {
      res.status(400).json({ message: `Invalid ${paramName === 'reviewId' ? 'review' : 'product'} ID` })
      return
    }

    next()
  }
}
