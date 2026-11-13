export function validateOrderIdParam(req, res, next) {
  if (!/^[a-f\d]{24}$/i.test(req.params.orderId)) {
    res.status(400).json({ message: 'Invalid order ID' })
    return
  }

  next()
}
