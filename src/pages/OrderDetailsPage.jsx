import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FiArrowLeft, FiBox, FiCheck, FiPackage, FiRefreshCw } from 'react-icons/fi'
import SiteFooter from '../components/SiteFooter.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import { cancelMyOrder, getApiErrorMessage, getMyOrder } from '../services/api.js'

const statusLabels = {
  pending: 'Payment pending',
  confirmed: 'Order confirmed',
  processing: 'Being prepared',
  shipped: 'On the way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

function formatPrice(price) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(price)
}

function formatDate(date) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))
}

function OrderDetailsPage({ onSearch }) {
  const { orderId } = useParams()
  const [order, setOrder] = useState(null)
  const [loadedOrderId, setLoadedOrderId] = useState(null)
  const [error, setError] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const loading = loadedOrderId !== orderId

  useEffect(() => {
    let active = true
    getMyOrder(orderId)
      .then((result) => {
        if (active) {
          setOrder(result)
          setError('')
        }
      })
      .catch((requestError) => {
        if (active) {
          setOrder(null)
          setError(getApiErrorMessage(requestError))
        }
      })
      .finally(() => {
        if (active) setLoadedOrderId(orderId)
      })
    return () => {
      active = false
    }
  }, [orderId])

  async function cancelOrder() {
    if (!window.confirm('Cancel this order? Paid Razorpay orders will be refunded to the original payment method.')) return
    setCancelling(true)
    setError('')
    try {
      setOrder(await cancelMyOrder(orderId))
    } catch (requestError) {
      const cancellationMessage = getApiErrorMessage(requestError)
      try {
        setOrder(await getMyOrder(orderId))
        setError(cancellationMessage)
      } catch (refreshError) {
        setError(`${cancellationMessage} ${getApiErrorMessage(refreshError)}`)
      }
    } finally {
      setCancelling(false)
    }
  }

  const canCancel = order
    && ['confirmed', 'processing'].includes(order.status)
    && order.refundStatus !== 'pending'

  return (
    <div className="app-shell">
      <SiteHeader onSearch={onSearch} />
      <main className="order-details-page page-container">
        <Link className="detail-back-link" to="/orders"><FiArrowLeft aria-hidden="true" /> All orders</Link>
        {loading ? (
          <div aria-label="Loading order details" className="orders-loading">
            <div className="skeleton order-card-skeleton" />
            <div className="skeleton order-card-skeleton" />
          </div>
        ) : error && !order ? (
          <div className="empty-state orders-empty" role="alert">
            <FiPackage aria-hidden="true" />
            <h1>We couldn't load this order.</h1>
            <p>{error}</p>
            <Link className="button button-dark" to="/orders">Back to your orders</Link>
          </div>
        ) : order && (
          <>
            <div className="order-detail-heading">
              <div>
                <p className="eyebrow">Order details</p>
                <h1>{order.orderNumber}</h1>
                <p>Placed {formatDate(order.createdAt)}</p>
              </div>
              <span className={`order-status order-status-${order.status}`}>{statusLabels[order.status] || order.status}</span>
            </div>
            {error && <p className="form-error order-detail-error" role="alert">{error}</p>}
            <div className="order-detail-layout">
              <div className="order-detail-main">
                <section className="order-detail-section">
                  <p className="eyebrow">Updates</p>
                  <h2>Order progress</h2>
                  <ol className="order-timeline">
                    {order.statusHistory.map((event, index) => (
                      <li className="order-timeline-event" key={`${event.status}-${event.changedAt}-${index}`}>
                        <span className="timeline-marker"><FiCheck aria-hidden="true" /></span>
                        <div>
                          <strong>{statusLabels[event.status] || event.status}</strong>
                          {event.note && <p>{event.note}</p>}
                          <time dateTime={event.changedAt}>{formatDate(event.changedAt)}</time>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
                <section className="order-detail-section">
                  <p className="eyebrow">In this order</p>
                  <h2>{order.items.length} {order.items.length === 1 ? 'product' : 'products'}</h2>
                  <div className="order-detail-items">
                    {order.items.map((item) => (
                      <article className="order-detail-item" key={item.productId}>
                        <div className="order-detail-image">
                          {item.image ? <img alt="" src={item.image} /> : <FiBox aria-hidden="true" />}
                        </div>
                        <div className="order-detail-item-copy">
                          <strong>{item.name}</strong>
                          <span>Qty {item.quantity} · {formatPrice(item.unitPrice)} each</span>
                        </div>
                        <strong>{formatPrice(item.lineTotal)}</strong>
                      </article>
                    ))}
                  </div>
                </section>
                <section className="order-detail-section">
                  <p className="eyebrow">Delivery</p>
                  <h2>Shipping address</h2>
                  <address className="order-address">
                    <strong>{order.shippingAddress.fullName}</strong>
                    <span>{order.shippingAddress.street}{order.shippingAddress.apartment ? `, ${order.shippingAddress.apartment}` : ''}</span>
                    <span>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</span>
                    <span>{order.shippingAddress.country}</span>
                    <span>{order.shippingAddress.phone}</span>
                  </address>
                </section>
              </div>
              <aside className="order-summary order-detail-summary">
                <p className="eyebrow">Payment</p>
                <h2>Order summary</h2>
                <div className="summary-line"><span>Subtotal</span><strong>{formatPrice(order.subtotal)}</strong></div>
                <div className="summary-line"><span>Delivery</span><strong>{order.shippingCost ? formatPrice(order.shippingCost) : 'Free'}</strong></div>
                {order.discount > 0 && <div className="summary-line summary-discount"><span>Discount{order.couponCode ? ` · ${order.couponCode}` : ''}</span><strong>−{formatPrice(order.discount)}</strong></div>}
                <div className="summary-total"><span>Total</span><strong>{formatPrice(order.total)}</strong></div>
                <p>{order.paymentMethod === 'cod' ? 'Cash on delivery' : 'Razorpay'} · {order.paymentStatus}</p>
                {order.refundStatus === 'pending' && <p className="refund-pending"><FiRefreshCw aria-hidden="true" /> Refund requested and processing.</p>}
                {canCancel && (
                  <button className="button button-light order-cancel-button" disabled={cancelling} onClick={cancelOrder} type="button">
                    {cancelling ? 'Cancelling…' : order.paymentStatus === 'paid' ? 'Cancel and request refund' : 'Cancel order'}
                  </button>
                )}
              </aside>
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}

export default OrderDetailsPage
