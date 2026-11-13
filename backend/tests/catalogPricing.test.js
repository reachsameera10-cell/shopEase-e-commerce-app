import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildCatalogFilter,
  buildCatalogPipeline,
  catalogSortStages,
  getProductPricing as getServerProductPricing,
} from '../utils/catalogPricing.js'
import { getProductPricing as getClientProductPricing } from '../../src/utils/productPricing.js'

const products = [
  { name: 'High MRP sale', price: 200, discountPrice: 100 },
  { name: 'Low MRP sale', price: 120, discountPrice: 90 },
  { name: 'No discount', price: 80, discountPrice: null },
  { name: 'Equal prices', price: 50, discountPrice: 50 },
  { name: 'Invalid discount', price: 70, discountPrice: -5 },
]

test('discount percentage uses original price and final selling price', () => {
  assert.equal(getServerProductPricing(products[0]).discountPercentage, 50)
  assert.equal(getServerProductPricing(products[1]).discountPercentage, 25)
  assert.equal(getServerProductPricing(products[0]).sellingPrice, 100)
  assert.equal(getServerProductPricing(products[2]).sellingPrice, 80)
  assert.equal(getServerProductPricing(products[3]).discountPercentage, 0)
  assert.equal(getServerProductPricing(products[4]).discountPercentage, 0)
  assert.equal(getServerProductPricing({ price: 456, discountPrice: 455.92 }).hasDiscount, true)
  assert.equal(getServerProductPricing({ price: 456, discountPrice: 455.92 }).discountPercentage, 0)
})

test('client and server pricing safely handle missing and invalid prices', () => {
  for (const product of [
    { price: 0, discountPrice: 0 },
    { price: -10, discountPrice: 5 },
    { price: 'invalid', discountPrice: 4 },
    { price: 100, discountPrice: 'invalid' },
    { price: 100, discountPrice: 0 },
  ]) {
    assert.deepEqual(getClientProductPricing(product), getServerProductPricing(product))
  }
  assert.equal(getClientProductPricing({ price: null }).sellingPrice, null)
  assert.equal(getClientProductPricing({ price: 100, discountPrice: 0 }).discountPercentage, 100)
})

test('catalog sorts use effective selling price and calculated discount percentage', () => {
  assert.equal(catalogSortStages['price-asc']._effectiveSellingPrice, 1)
  assert.equal(catalogSortStages['price-desc']._effectiveSellingPrice, -1)
  assert.equal(catalogSortStages['discount-desc']._discountPercentage, -1)
  assert.equal(catalogSortStages['discount-asc']._discountPercentage, 1)
  assert.equal(catalogSortStages.newest.createdAt, -1)

  const getNamesInPriceOrder = (direction) => products
    .map((product) => ({ ...product, ...getServerProductPricing(product) }))
    .sort((left, right) => direction * (left.sellingPrice - right.sellingPrice))
    .map(({ name }) => name)

  assert.deepEqual(getNamesInPriceOrder(1), [
    'Equal prices',
    'Invalid discount',
    'No discount',
    'Low MRP sale',
    'High MRP sale',
  ])
  assert.deepEqual(getNamesInPriceOrder(-1), [
    'High MRP sale',
    'Low MRP sale',
    'No discount',
    'Invalid discount',
    'Equal prices',
  ])

  const getNamesInDiscountOrder = (direction) => products
    .map((product) => ({ ...product, ...getServerProductPricing(product) }))
    .sort((left, right) => direction * (left.discountPercentage - right.discountPercentage))
    .map(({ name }) => name)

  assert.deepEqual(getNamesInDiscountOrder(-1).slice(0, 2), ['High MRP sale', 'Low MRP sale'])
  assert.deepEqual(getNamesInDiscountOrder(1).slice(-2), ['Low MRP sale', 'High MRP sale'])
})

test('catalog filters are matched before sort and pagination', () => {
  const categoryId = '0123456789abcdef01234567'
  const filter = buildCatalogFilter({
    search: 'mug+set',
    category: 'kitchen',
    categoryId,
    minPrice: 50,
    maxPrice: 150,
  })
  const pipeline = buildCatalogPipeline(filter, 'price-asc', 2, 12)

  assert.equal(filter.status, 'active')
  assert.equal(filter.category, categoryId)
  assert.equal(filter.$or[0].name.test('mug+set'), true)
  assert.equal(filter.$or[0].name.test('mug set'), false)
  assert.equal(filter.$expr.$and.length, 2)
  assert.deepEqual(pipeline[0], { $match: filter })
  assert.deepEqual(pipeline[2], { $sort: catalogSortStages['price-asc'] })
  assert.deepEqual(pipeline[3], { $skip: 12 })
  assert.deepEqual(pipeline[4], { $limit: 12 })
})

test('catalog query schema accepts discount sort options', async () => {
  const { validateProductQuery } = await import('../middleware/validateProductQuery.js')
  for (const sort of ['price-asc', 'price-desc', 'discount-asc', 'discount-desc', 'newest']) {
    const req = { query: { sort } }
    let nextCalled = false
    validateProductQuery(req, { status() { throw new Error('Unexpected validation error') }, json() {} }, () => {
      nextCalled = true
    })
    assert.equal(nextCalled, true)
    assert.equal(req.validatedProductQuery.sort, sort)
  }
})
