import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FiArrowUpRight, FiCheck, FiHeart, FiShoppingBag, FiX } from 'react-icons/fi'
import { formatProductPrice, getProductPricing } from '../utils/productPricing.js'

function ProductQuickView({ product, onClose, onAddToCart, onAddToWishlist }) {
  useEffect(() => {
    if (!product) return undefined

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.classList.add('modal-open')

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.classList.remove('modal-open')
    }
  }, [product, onClose])

  if (!product) return null

  const image = product.images?.[0]
  const pricing = getProductPricing(product)

  return (
    <div
      className="modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      role="presentation"
    >
      <section aria-labelledby="quick-view-title" aria-modal="true" className="quick-view" role="dialog">
        <button aria-label="Close product details" className="modal-close" onClick={onClose} type="button">
          <FiX aria-hidden="true" />
        </button>
        <div className="quick-view-image">
          {image?.url ? (
            <img alt={image.alt || product.name} src={image.url} />
          ) : (
            <span aria-hidden="true" className="product-image-placeholder"><FiArrowUpRight /></span>
          )}
          {pricing.hasDiscount && (
            <span className="product-discount-badge">{pricing.discountPercentage}% OFF</span>
          )}
        </div>
        <div className="quick-view-copy">
          <p className="eyebrow">{product.category?.name || product.brand || 'A ShopEase find'}</p>
          <h2 id="quick-view-title">{product.name}</h2>
          <p className="quick-view-description">{product.description}</p>
          <div className="quick-view-price">
            <strong>{formatProductPrice(pricing.sellingPrice)}</strong>
            {pricing.hasDiscount && <del>{formatProductPrice(pricing.originalPrice)}</del>}
          </div>
          <p className={`stock-note${product.stock > 0 ? '' : ' is-out-of-stock'}`}>
            {product.stock > 0 ? <FiCheck aria-hidden="true" /> : null}
            {product.stock > 0 ? 'In stock and ready to find a home' : 'Currently out of stock'}
          </p>
          <div className="quick-view-actions">
            <button
              className="button button-dark"
              disabled={product.stock < 1}
              onClick={() => onAddToCart(product._id, 1)}
              type="button"
            >
              <FiShoppingBag aria-hidden="true" /> Add to bag
            </button>
            <button
              aria-label={`Save ${product.name} to wishlist`}
              className="wishlist-action-button"
              onClick={() => onAddToWishlist(product._id)}
              type="button"
            >
              <FiHeart aria-hidden="true" />
            </button>
          </div>
          <Link className="quick-view-detail-link" onClick={onClose} to={`/products/${encodeURIComponent(product.slug || product._id)}`}>
            See all the details <FiArrowUpRight aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  )
}

export default ProductQuickView
