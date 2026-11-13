function validPrice(value) {
  if (value == null || value === '') return null
  const price = Number(value)
  return Number.isFinite(price) && price >= 0 ? price : null
}

export function getProductPricing(product) {
  const originalPrice = validPrice(product?.price)
  const discountPrice = validPrice(product?.discountPrice)
  const hasDiscount = originalPrice > 0
    && discountPrice != null
    && discountPrice < originalPrice

  return {
    originalPrice,
    sellingPrice: hasDiscount ? discountPrice : originalPrice,
    hasDiscount,
    discountPercentage: hasDiscount
      ? Math.round(((originalPrice - discountPrice) / originalPrice) * 100)
      : 0,
  }
}

export function formatProductPrice(price) {
  if (!Number.isFinite(price) || price < 0) return 'Price unavailable'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(price)
}
