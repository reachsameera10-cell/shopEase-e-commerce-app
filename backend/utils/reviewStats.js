import Product from '../models/Product.js'
import Review from '../models/Review.js'

export async function refreshProductReviewStats(productId, session) {
  const aggregate = Review.aggregate([
    { $match: { product: productId, status: 'approved' } },
    {
      $group: {
        _id: '$product',
        average: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ])
  if (session) aggregate.session(session)
  const [rating] = await aggregate

  await Product.updateOne(
    { _id: productId },
    {
      $set: {
        ratingsAverage: rating ? Math.round(rating.average * 10) / 10 : 0,
        ratingsCount: rating?.count || 0,
      },
    },
    session ? { session } : undefined,
  )
}
