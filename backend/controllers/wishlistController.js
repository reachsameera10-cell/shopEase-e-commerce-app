import Product from '../models/Product.js'
import Wishlist from '../models/Wishlist.js'

async function sendWishlist(res, userId, statusCode = 200) {
  const wishlist = await Wishlist.findOne({ user: userId }).lean()
  const productIds = (wishlist?.items || []).map((item) => item.product)
  const products = productIds.length
    ? await Product.find({ _id: { $in: productIds }, status: 'active' })
        .populate('category', 'name slug')
        .lean()
    : []
  const productById = new Map(
    products.map((product) => [product._id.toString(), product]),
  )

  res.status(statusCode).json({
    items: (wishlist?.items || []).map((item) => ({
      productId: item.product.toString(),
      product: productById.get(item.product.toString()) || null,
      addedAt: item.addedAt,
    })),
  })
}

export async function getWishlist(req, res) {
  await sendWishlist(res, req.user._id)
}

export async function addWishlistItem(req, res) {
  const product = await Product.findOne({
    _id: req.validatedBody.productId,
    status: 'active',
  })
    .select('_id')
    .lean()

  if (!product) {
    res.status(404).json({ message: 'Product not found or unavailable' })
    return
  }

  let wishlist = await Wishlist.findOne({ user: req.user._id })
  if (!wishlist) wishlist = new Wishlist({ user: req.user._id, items: [] })

  const alreadySaved = wishlist.items.some(
    (item) => item.product.toString() === product._id.toString(),
  )

  if (!alreadySaved) {
    wishlist.items.push({ product: product._id })
    await wishlist.save()
  }

  await sendWishlist(res, req.user._id)
}

export async function removeWishlistItem(req, res) {
  await Wishlist.updateOne(
    { user: req.user._id },
    { $pull: { items: { product: req.params.productId } } },
  )
  await sendWishlist(res, req.user._id)
}
