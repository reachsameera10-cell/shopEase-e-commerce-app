import { FiArrowUpRight, FiBox, FiStar } from 'react-icons/fi'
import { formatProductPrice, getProductPricing } from '../utils/productPricing.js'

function ProductSection({
  id,
  title,
  eyebrow,
  products,
  loading,
  error,
  onRetry,
  onSelectProduct,
  actionLabel,
  onAction,
}) {
  return (
    <section className="section page-container product-section" id={id}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        {actionLabel && (
          <button className="text-button section-link" onClick={onAction} type="button">
            {actionLabel} <FiArrowUpRight aria-hidden="true" />
          </button>
        )}
      </div>

      {loading ? (
        <div aria-label={`Loading ${title}`} className="product-grid">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="product-skeleton" key={index}>
              <div className="skeleton product-skeleton-image" />
              <div className="skeleton product-skeleton-line" />
              <div className="skeleton product-skeleton-line short" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="inline-state" role="alert">
          <p>{error}</p>
          <button className="text-button" onClick={onRetry} type="button">Try again</button>
        </div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <FiBox aria-hidden="true" />
          <p>Nothing to show just yet. New finds are on the way.</p>
        </div>
      ) : (
        <div className="product-grid">
          {products.slice(0, 4).map((product, index) => {
            const image = product.images?.[0]
            const pricing = getProductPricing(product)

            return (
              <button
                aria-label={`View ${product.name}`}
                className="product-card"
                key={product._id || product.slug}
                onClick={() => onSelectProduct(product)}
                type="button"
              >
                <span className={`product-image-wrap product-image-tone-${index % 4}`}>
                  {image?.url ? (
                    <img alt={image.alt || product.name} loading="lazy" src={image.url} />
                  ) : (
                    <span aria-hidden="true" className="product-image-placeholder">
                      <FiBox />
                    </span>
                  )}
                  {product.isFeatured && <span className="product-badge">Curated</span>}
                  {pricing.hasDiscount && (
                    <span aria-label={`${pricing.discountPercentage}% off`} className="product-discount-badge">
                      {pricing.discountPercentage}% OFF
                    </span>
                  )}
                  <span className="product-quick-view">Quick view <FiArrowUpRight /></span>
                </span>
                <span className="product-meta">
                  <span>{product.category?.name || product.brand || 'Just for you'}</span>
                  {Number(product.ratingsCount) > 0 && (
                    <span className="product-rating">
                      <FiStar aria-hidden="true" /> {Number(product.ratingsAverage).toFixed(1)}
                      <span className="product-rating-count">({Number(product.ratingsCount)})</span>
                    </span>
                  )}
                </span>
                <strong className="product-name">{product.name}</strong>
                <span className="product-price">
                  <strong>{formatProductPrice(pricing.sellingPrice)}</strong>
                  {pricing.hasDiscount && (
                    <del>{formatProductPrice(pricing.originalPrice)}</del>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default ProductSection
