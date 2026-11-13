const validDiscountExpression = {
  $and: [
    { $isNumber: '$price' },
    { $gte: ['$price', 0] },
    { $isNumber: '$discountPrice' },
    { $gte: ['$discountPrice', 0] },
    { $lt: ['$discountPrice', '$price'] },
  ],
}

export const effectiveSellingPriceExpression = {
  $cond: [
    validDiscountExpression,
    '$discountPrice',
    { $cond: [{ $and: [{ $isNumber: '$price' }, { $gte: ['$price', 0] }] }, '$price', null] },
  ],
}

export const discountPercentageExpression = {
  $cond: [
    { $and: [validDiscountExpression, { $gt: ['$price', 0] }] },
    {
      $round: [
        {
          $multiply: [
            { $divide: [{ $subtract: ['$price', '$discountPrice'] }, '$price'] },
            100,
          ],
        },
        0,
      ],
    },
    0,
  ],
}

export const catalogSortStages = {
  newest: { createdAt: -1, _id: 1 },
  popular: { soldCount: -1, createdAt: -1, _id: 1 },
  rating: { ratingsAverage: -1, ratingsCount: -1, createdAt: -1, _id: 1 },
  'price-asc': { _effectiveSellingPrice: 1, _id: 1 },
  'price-desc': { _effectiveSellingPrice: -1, _id: 1 },
  'discount-desc': { _discountPercentage: -1, _id: 1 },
  'discount-asc': { _discountPercentage: 1, _id: 1 },
}

export const catalogPricingFields = {
  _effectiveSellingPrice: effectiveSellingPriceExpression,
  _discountPercentage: discountPercentageExpression,
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function buildCatalogFilter({ search, category, categoryId, minPrice, maxPrice }) {
  const filter = { status: 'active' }

  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i')
    filter.$or = [{ name: pattern }, { description: pattern }, { brand: pattern }]
  }

  if (category) filter.category = categoryId || { $in: [] }

  if (minPrice !== undefined || maxPrice !== undefined) {
    const priceBounds = []
    if (minPrice !== undefined) priceBounds.push({ $gte: [effectiveSellingPriceExpression, minPrice] })
    if (maxPrice !== undefined) priceBounds.push({ $lte: [effectiveSellingPriceExpression, maxPrice] })
    filter.$expr = { $and: priceBounds }
  }

  return filter
}

export function buildCatalogPipeline(filter, sort, page, limit) {
  return [
    { $match: filter },
    { $addFields: catalogPricingFields },
    { $sort: catalogSortStages[sort] },
    { $skip: (page - 1) * limit },
    { $limit: limit },
    { $project: { _effectiveSellingPrice: 0, _discountPercentage: 0 } },
  ]
}

function validPrice(value) {
  if (value == null || value === '') return null
  const price = Number(value)
  return Number.isFinite(price) && price >= 0 ? price : null
}

export function getProductPricing(product) {
  const originalPrice = validPrice(product?.price)
  const discount = validPrice(product?.discountPrice)
  const discountPrice = originalPrice > 0
    && Number.isFinite(discount)
    && discount >= 0
    && discount < originalPrice
    ? discount
    : null

  return {
    originalPrice,
    sellingPrice: discountPrice ?? originalPrice,
    hasDiscount: discountPrice != null,
    discountPercentage: discountPrice == null
      ? 0
      : Math.round(((originalPrice - discountPrice) / originalPrice) * 100),
  }
}
