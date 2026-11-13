import { Link } from 'react-router-dom'
import { FiArrowLeft, FiArrowRight, FiBox, FiMinus, FiPlus, FiTrash2 } from 'react-icons/fi'
import SiteFooter from '../components/SiteFooter.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import { useShopping } from '../hooks/useShopping.js'

function formatPrice(price) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(price)
}

function CartPage({ onSearch }) {
  const { cart, loading, error, updateCartQuantity, removeFromCart, clearCart } = useShopping()
  const items = cart?.items || []

  return (
    <div className="app-shell">
      <SiteHeader onSearch={onSearch} />
      <main className="shopping-page page-container">
        <Link className="detail-back-link" to="/products"><FiArrowLeft aria-hidden="true" /> Keep looking</Link>
        <div className="shopping-heading">
          <div>
            <p className="eyebrow">Things you found</p>
            <h1>Your bag<span>{cart?.itemCount ? ` (${cart.itemCount})` : ''}</span></h1>
          </div>
          {items.length > 0 && (
            <button className="text-button" onClick={clearCart} type="button"><FiTrash2 aria-hidden="true" /> Clear bag</button>
          )}
        </div>

        {loading ? (
          <div aria-label="Loading your bag" className="shopping-loading">
            <div className="skeleton shopping-row-skeleton" />
            <div className="skeleton shopping-row-skeleton" />
          </div>
        ) : error ? (
          <div className="empty-state shopping-empty" role="alert"><FiBox aria-hidden="true" /><p>{error}</p></div>
        ) : items.length === 0 ? (
          <div className="empty-state shopping-empty">
            <FiBox aria-hidden="true" />
            <h2>Your bag is taking a little breather.</h2>
            <p>When something feels just right, you can find it here.</p>
            <Link className="button button-dark" to="/products">Browse the collection <FiArrowRight aria-hidden="true" /></Link>
          </div>
        ) : (
          <div className="shopping-layout">
            <div aria-label="Items in your bag" className="shopping-items">
              {items.map((item) => {
                const product = item.product
                const id = product?._id
                const image = product?.images?.[0]

                return (
                  <article className="shopping-item" key={item.productId}>
                    <Link className="shopping-item-image" to={product ? `/products/${encodeURIComponent(product.slug || id)}` : '/products'}>
                      {image?.url ? <img alt={image.alt || product.name} src={image.url} /> : <FiBox aria-hidden="true" />}
                    </Link>
                    <div className="shopping-item-copy">
                      <p className="eyebrow">{product?.category?.name || 'ShopEase find'}</p>
                      <Link className="shopping-item-name" to={product ? `/products/${encodeURIComponent(product.slug || id)}` : '/products'}>
                        {product?.name || 'Unavailable product'}
                      </Link>
                      <span className="shopping-item-price">{formatPrice(item.unitPrice)}</span>
                      {product ? (
                        <div aria-label={`Quantity for ${product.name}`} className="quantity-control">
                          <button
                            aria-label={`Decrease ${product.name} quantity`}
                            onClick={() => item.quantity === 1 ? removeFromCart(id) : updateCartQuantity(id, item.quantity - 1)}
                            type="button"
                          ><FiMinus aria-hidden="true" /></button>
                          <span>{item.quantity}</span>
                          <button
                            aria-label={`Increase ${product.name} quantity`}
                            disabled={item.quantity >= product.stock}
                            onClick={() => updateCartQuantity(id, item.quantity + 1)}
                            type="button"
                          ><FiPlus aria-hidden="true" /></button>
                        </div>
                      ) : (
                        <button className="text-button" onClick={() => removeFromCart(item.productId)} type="button">Remove unavailable item</button>
                      )}
                    </div>
                    <div className="shopping-item-end">
                      <strong>{formatPrice(item.lineTotal)}</strong>
                      {product && <button aria-label={`Remove ${product.name}`} className="icon-text-button" onClick={() => removeFromCart(id)} type="button"><FiTrash2 aria-hidden="true" /></button>}
                    </div>
                  </article>
                )
              })}
            </div>

            <aside className="order-summary">
              <p className="eyebrow">A quick recap</p>
              <h2>Bag summary</h2>
              <div className="summary-line"><span>Subtotal</span><strong>{formatPrice(cart?.subtotal || 0)}</strong></div>
              <div className="summary-line"><span>Delivery</span><span>Calculated at checkout</span></div>
              <div className="summary-total"><span>Estimated total</span><strong>{formatPrice(cart?.subtotal || 0)}</strong></div>
              <Link className="button button-dark checkout-placeholder" to="/checkout">Continue to checkout <FiArrowRight aria-hidden="true" /></Link>
              <p>Prices, delivery, discounts, and stock are confirmed at checkout.</p>
            </aside>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}

export default CartPage
