import Cart from '../models/Cart.js'
import Product from '../models/Product.js'

function toCartResponse(cart, products) {
  const productById = new Map(
    products.map((product) => [product._id.toString(), product]),
  )
  const items = (cart?.items || []).map((item) => {
    const productId = item.product.toString()
    const product = productById.get(productId) || null
    const unitPrice = product
      ? Number(product.discountPrice ?? product.price)
      : 0

    return {
      productId,
      product,
      quantity: item.quantity,
      unitPrice,
      lineTotal: unitPrice * item.quantity,
    }
  })

  return {
    items,
    itemCount: items.reduce((count, item) => count + item.quantity, 0),
    subtotal: items.reduce((total, item) => total + item.lineTotal, 0),
  }
}

async function sendCart(res, userId, statusCode = 200) {
  const cart = await Cart.findOne({ user: userId }).lean()
  const productIds = (cart?.items || []).map((item) => item.product)
  const products = productIds.length
    ? await Product.find({ _id: { $in: productIds }, status: 'active' })
        .populate('category', 'name slug')
        .lean()
    : []

  res.status(statusCode).json(toCartResponse(cart, products))
}

export async function getCart(req, res) {
  await sendCart(res, req.user._id)
}

export async function addCartItem(req, res) {
  const { productId, quantity } = req.validatedBody
  const product = await Product.findOne({ _id: productId, status: 'active' })
    .select('_id stock')
    .lean()

  if (!product) {
    res.status(404).json({ message: 'Product not found or unavailable' })
    return
  }

  let cart = await Cart.findOne({ user: req.user._id })
  if (!cart) {
    cart = new Cart({ user: req.user._id, items: [] })
  }

  const existingItem = cart.items.find(
    (item) => item.product.toString() === product._id.toString(),
  )
  const nextQuantity = (existingItem?.quantity || 0) + quantity

  if (nextQuantity > product.stock) {
    res.status(409).json({ message: `Only ${product.stock} item(s) are available` })
    return
  }

  if (existingItem) existingItem.quantity = nextQuantity
  else cart.items.push({ product: product._id, quantity })

  await cart.save()
  await sendCart(res, req.user._id)
}

export async function updateCartItem(req, res) {
  const product = await Product.findOne({
    _id: req.params.productId,
    status: 'active',
  })
    .select('_id stock')
    .lean()

  if (!product) {
    res.status(404).json({ message: 'Product not found or unavailable' })
    return
  }

  const cart = await Cart.findOne({ user: req.user._id })
  const item = cart?.items.find(
    (cartItem) => cartItem.product.toString() === product._id.toString(),
  )

  if (!item) {
    res.status(404).json({ message: 'Product is not in your cart' })
    return
  }

  if (req.validatedBody.quantity > product.stock) {
    res.status(409).json({ message: `Only ${product.stock} item(s) are available` })
    return
  }

  item.quantity = req.validatedBody.quantity
  await cart.save()
  await sendCart(res, req.user._id)
}

export async function removeCartItem(req, res) {
  await Cart.updateOne(
    { user: req.user._id },
    { $pull: { items: { product: req.params.productId } } },
  )
  await sendCart(res, req.user._id)
}

export async function clearCart(req, res) {
  await Cart.updateOne({ user: req.user._id }, { $set: { items: [] } })
  res.status(204).end()
}
