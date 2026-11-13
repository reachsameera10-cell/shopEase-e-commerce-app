import { Link } from 'react-router-dom'
import { FiArrowRight, FiBox, FiHeart, FiShoppingBag, FiTrash2 } from 'react-icons/fi'
import SiteFooter from '../components/SiteFooter.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import { useShopping } from '../hooks/useShopping.js'
import { formatProductPrice, getProductPricing } from '../utils/productPricing.js'

function WishlistPage({ onSearch }) {
  const { wishlist, loading, error, moveWishlistItemToCart, removeFromWishlist } = useShopping()
  const items = wishlist?.items || []

  return (
    <div className="app-shell">
      <SiteHeader onSearch={onSearch} />
      <main className="shopping-page page-container">
        <div className="shopping-heading">
          <div>
            <p className="eyebrow">Keep the good ones close</p>
            <h1>Your wishlist<span>{items.length ? ` (${items.length})` : ''}</span></h1>
          </div>
        </div>

        {loading ? (
          <div aria-label="Loading your wishlist" className="shopping-loading">
            <div className="skeleton shopping-row-skeleton" />
            <div className="skeleton shopping-row-skeleton" />
          </div>
        ) : error ? (
          <div className="empty-state shopping-empty" role="alert"><FiBox aria-hidden="true" /><p>{error}</p></div>
        ) : items.length === 0 ? (
          <div className="empty-state shopping-empty">
            <FiHeart aria-hidden="true" />
            <h2>Nothing on your wishlist just yet.</h2>
            <p>Save a find you love and it will be waiting here.</p>
            <Link className="button button-dark" to="/products">Find something lovely <FiArrowRight aria-hidden="true" /></Link>
          </div>
        ) : (
          <div className="wishlist-grid">
            {items.map(({ product, productId }) => {
              if (!product) {
                return (
                  <article className="wishlist-card wishlist-unavailable" key={productId}>
                    <div className="wishlist-image"><FiBox aria-hidden="true" /></div>
                    <div className="wishlist-card-copy">
                      <p className="eyebrow">No longer available</p>
                      <span className="shopping-item-name">This saved item is unavailable.</span>
                      <button className="text-button" onClick={() => removeFromWishlist(productId)} type="button">Remove from wishlist</button>
                    </div>
                  </article>
                )
              }
              const image = product.images?.[0]
              const id = product._id
              const pricing = getProductPricing(product)

              return (
                <article className="wishlist-card" key={id}>
                  <Link className="wishlist-image" to={`/products/${encodeURIComponent(product.slug || id)}`}>
                    {image?.url ? <img alt={image.alt || product.name} src={image.url} /> : <FiBox aria-hidden="true" />}
                    {pricing.hasDiscount && (
                      <span className="product-discount-badge">{pricing.discountPercentage}% OFF</span>
                    )}
                  </Link>
                  <div className="wishlist-card-copy">
                    <p className="eyebrow">{product.category?.name || 'ShopEase find'}</p>
                    <Link className="shopping-item-name" to={`/products/${encodeURIComponent(product.slug || id)}`}>{product.name}</Link>
                    <span className="product-price">
                      <strong>{formatProductPrice(pricing.sellingPrice)}</strong>
                      {pricing.hasDiscount && <del>{formatProductPrice(pricing.originalPrice)}</del>}
                    </span>
                    <div className="wishlist-actions">
                      <button className="button button-dark" onClick={() => moveWishlistItemToCart(id)} type="button">
                        <FiShoppingBag aria-hidden="true" /> Move to bag
                      </button>
                      <button aria-label={`Remove ${product.name} from wishlist`} className="icon-text-button" onClick={() => removeFromWishlist(id)} type="button">
                        <FiTrash2 aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}

export default WishlistPage
