export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    next(error)
    return
  }

  const reportedStatus = error.statusCode ?? error.status
  const statusCode =
    Number.isInteger(reportedStatus) && reportedStatus >= 400 && reportedStatus < 600
      ? reportedStatus
      : 500

  if (statusCode >= 500) {
    console.error(`${req.method} ${req.path}`, error)
  }

  res.status(statusCode).json({
    message:
      statusCode === 500
        ? 'Internal server error'
        : error.message || 'Request failed',
  })
}
