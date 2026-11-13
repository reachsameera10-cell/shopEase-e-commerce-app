import Category from '../models/Category.js'
import Product from '../models/Product.js'
import {
  buildCatalogFilter,
  buildCatalogPipeline,
} from '../utils/catalogPricing.js'

export async function listProducts(req, res) {
  const { search, category, minPrice, maxPrice, sort, page, limit } =
    req.validatedProductQuery
  let categoryId
  if (category) {
    const isObjectId = /^[a-f\d]{24}$/i.test(category)
    const categoryDocument = isObjectId
      ? null
      : await Category.findOne({ slug: category, isActive: true })
          .select('_id')
          .lean()
    categoryId = isObjectId ? category : categoryDocument?._id
  }

  const filter = buildCatalogFilter({ search, category, categoryId, minPrice, maxPrice })

  const [products, total] = await Promise.all([
    Product.aggregate(buildCatalogPipeline(filter, sort, page, limit)),
    Product.countDocuments(filter),
  ])
  await Product.populate(products, { path: 'category', select: 'name slug' })

  res.json({
    products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}

export async function getProduct(req, res) {
  const { idOrSlug } = req.params
  const filter = {
    status: 'active',
    ...(/^[a-f\d]{24}$/i.test(idOrSlug)
      ? { _id: idOrSlug }
      : { slug: idOrSlug }),
  }
  const product = await Product.findOne(filter)
    .populate('category', 'name slug')
    .lean()

  if (!product) {
    res.status(404).json({ message: 'Product not found' })
    return
  }

  res.json({ product })
}
