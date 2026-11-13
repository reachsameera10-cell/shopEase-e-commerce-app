import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FiArrowLeft, FiBox, FiCheck, FiHeart, FiShoppingBag, FiStar } from 'react-icons/fi'
import ProductReviews from '../components/ProductReviews.jsx'
import SiteFooter from '../components/SiteFooter.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import { useShopping } from '../hooks/useShopping.js'
import { fetchProduct, getApiErrorMessage } from '../services/api.js'
import { formatProductPrice, getProductPricing } from '../utils/productPricing.js'

function ProductDetailsPage({ onSearch }) {
  const { idOrSlug } = useParams()
  const { addToCart, addToWishlist } = useShopping()
  const [product, setProduct] = useState(null)
  const [loadedProductKey, setLoadedProductKey] = useState('')
  const [error, setError] = useState('')
  const [retryKey, setRetryKey] = useState(0)
  const loading = loadedProductKey !== idOrSlug
  const pricing = getProductPricing(product)

  useEffect(() => {
    const controller = new AbortController()
    fetchProduct(idOrSlug, { signal: controller.signal })
      .then((item) => {
        if (!controller.signal.aborted) {
          setProduct(item)
          setError('')
          setLoadedProductKey(idOrSlug)
        }
      })
      .catch((requestError) => {
        if (controller.signal.aborted) return
        setError(getApiErrorMessage(requestError))
        setLoadedProductKey(idOrSlug)
      })

    return () => controller.abort()
  }, [idOrSlug, retryKey])

  return (
    <div className="app-shell">
      <SiteHeader onSearch={onSearch} />
      <main className="product-detail-page page-container">
        <Link className="detail-back-link" to="/products"><FiArrowLeft aria-hidden="true" /> Back to the collection</Link>
        {loading ? (
          <div aria-label="Loading product details" className="detail-loading">
            <div className="skeleton detail-skeleton-image" />
            <div className="detail-skeleton-copy">
              <div className="skeleton product-skeleton-line" />
              <div className="skeleton detail-skeleton-title" />
              <div className="skeleton detail-skeleton-description" />
            </div>
          </div>
        ) : error ? (
          <div className="empty-state catalog-state" role="alert">
            <FiBox aria-hidden="true" />
            <p>{error}</p>
            <button className="text-button" onClick={() => setRetryKey((key) => key + 1)} type="button">Try again</button>
          </div>
        ) : product ? (
          <>
            <div className="catalog-breadcrumb detail-breadcrumb">
              <Link to="/">Home</Link><span>/</span><Link to="/products">Shop</Link>
              {product.category?.name && <><span>/</span><Link to={`/products?category=${encodeURIComponent(product.category.slug || product.category._id)}`}>{product.category.name}</Link></>}
              <span>/</span><span>{product.name}</span>
            </div>
            <article className="product-detail">
              <div className="detail-gallery">
                {product.images?.length ? product.images.map((image, index) => (
                  <div className="detail-gallery-image" key={`${image.url}-${index}`}>
                    <img alt={image.alt || product.name} src={image.url} />
                  </div>
                )) : (
                  <div className="detail-gallery-image detail-image-empty">
                    <FiBox aria-hidden="true" />
                  </div>
                )}
              </div>
              <div className="detail-copy">
                <p className="eyebrow">{product.category?.name || product.brand || 'A ShopEase find'}</p>
                <h1>{product.name}</h1>
                <a className="detail-review-link" href="#product-reviews-heading">
                  <FiStar aria-hidden="true" />
                  {Number(product.ratingsCount) > 0
                    ? `Read ${product.ratingsCount} reviews · Write a review`
                    : 'Read reviews · Write a review'}
                </a>
                {product.brand && <p className="detail-brand">{product.brand}</p>}
                {Number(product.ratingsCount) > 0 && (
                  <p className="detail-rating"><FiStar aria-hidden="true" /> {Number(product.ratingsAverage).toFixed(1)} <span>({product.ratingsCount} reviews)</span></p>
                )}
                <div className="detail-price">
                  <strong>{formatProductPrice(pricing.sellingPrice)}</strong>
                  {pricing.hasDiscount && <del>{formatProductPrice(pricing.originalPrice)}</del>}
                  {pricing.hasDiscount && (
                    <span className="detail-discount-badge">{pricing.discountPercentage}% OFF</span>
                  )}
                </div>
                <p className={`detail-stock${product.stock > 0 ? '' : ' is-out-of-stock'}`}>
                  {product.stock > 0 && <FiCheck aria-hidden="true" />}
                  {product.stock > 0 ? 'In stock' : 'Currently out of stock'}
                </p>
                <div className="detail-shopping-actions">
                  <button
                    className="button button-dark"
                    disabled={product.stock < 1}
                    onClick={() => addToCart(product._id, 1)}
                    type="button"
                  >
                    <FiShoppingBag aria-hidden="true" /> Add to bag
                  </button>
                  <button
                    className="button button-outline"
                    onClick={() => addToWishlist(product._id)}
                    type="button"
                  >
                    <FiHeart aria-hidden="true" /> Save for later
                  </button>
                </div>
                <div className="detail-description">
                  <h2>A little about it</h2>
                  <p>{product.description}</p>
                </div>
                <p className="detail-next-phase">Bag quantities are confirmed against live store inventory.</p>
              </div>
            </article>
            <ProductReviews productId={product._id} />
          </>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  )
}

export default ProductDetailsPage
