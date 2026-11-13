import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiArrowLeft, FiArrowRight, FiBox, FiPackage } from 'react-icons/fi'
import SiteFooter from '../components/SiteFooter.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import { getApiErrorMessage, getMyOrders } from '../services/api.js'

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

function OrderHistoryPage({ onSearch }) {
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [loadedPage, setLoadedPage] = useState(null)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const loading = loadedPage !== page

  useEffect(() => {
    let active = true
    getMyOrders({ page, limit: 10 })
      .then((result) => {
        if (!active) return
        setData(result)
        setError('')
      })
      .catch((requestError) => {
        if (!active) return
        setError(getApiErrorMessage(requestError))
      })
      .finally(() => {
        if (active) setLoadedPage(page)
      })

    return () => {
      active = false
    }
  }, [page, refreshKey])

  const orders = data?.orders || []

  return (
    <div className="app-shell">
      <SiteHeader onSearch={onSearch} />
      <main className="orders-page page-container">
        <Link className="detail-back-link" to="/account"><FiArrowLeft aria-hidden="true" /> Your account</Link>
        <div className="shopping-heading">
          <div>
            <p className="eyebrow">Good things, on their way</p>
            <h1>Your orders</h1>
          </div>
        </div>
        {loading ? (
          <div aria-label="Loading your orders" className="orders-loading">
            <div className="skeleton order-card-skeleton" />
            <div className="skeleton order-card-skeleton" />
          </div>
        ) : error ? (
          <div className="empty-state orders-empty" role="alert">
            <p>{error}</p>
            <button className="text-button" onClick={() => { setLoadedPage(null); setRefreshKey((key) => key + 1) }} type="button">Try again</button>
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-state orders-empty">
            <FiPackage aria-hidden="true" />
            <h2>No orders just yet.</h2>
            <p>Your completed checkouts will appear here.</p>
            <Link className="button button-dark" to="/products">Browse the collection <FiArrowRight aria-hidden="true" /></Link>
          </div>
        ) : (
          <>
            <div aria-label="Your orders" className="order-list">
              {orders.map((order) => (
                <article className="order-card" key={order.id}>
                  <div className="order-card-top">
                    <div>
                      <p className="eyebrow">Order placed</p>
                      <time dateTime={order.createdAt}>{formatDate(order.createdAt)}</time>
                    </div>
                    <span className={`order-status order-status-${order.status}`}>{order.status}</span>
                  </div>
                  <div className="order-card-middle">
                    <div className="order-card-preview">
                      {order.previewItems.map((item, index) => (
                        <div className="order-preview-item" key={`${order.id}-${index}`}>
                          {item.image
                            ? <img alt="" src={item.image} />
                            : <FiBox aria-hidden="true" />}
                        </div>
                      ))}
                    </div>
                    <div className="order-card-description">
                      <strong>{order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}</strong>
                      <span>{order.previewItems.map((item) => item.name).join(', ')}</span>
                    </div>
                    <strong className="order-card-total">{formatPrice(order.total)}</strong>
                  </div>
                  <div className="order-card-bottom">
                    <span>{order.paymentMethod === 'cod' ? 'Cash on delivery' : 'Razorpay'} · {order.paymentStatus}</span>
                    {order.refundStatus === 'pending' && <span className="refund-pending">Refund processing</span>}
                    <Link className="text-button" to={`/orders/${encodeURIComponent(order.id)}`}>View order <FiArrowRight aria-hidden="true" /></Link>
                  </div>
                </article>
              ))}
            </div>
            {data.pagination.pages > 1 && (
              <nav aria-label="Order pages" className="orders-pagination">
                <button disabled={page <= 1} onClick={() => { setLoadedPage(null); setPage((current) => current - 1) }} type="button">Previous</button>
                <span>Page {page} of {data.pagination.pages}</span>
                <button disabled={page >= data.pagination.pages} onClick={() => { setLoadedPage(null); setPage((current) => current + 1) }} type="button">Next</button>
              </nav>
            )}
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}

export default OrderHistoryPage
