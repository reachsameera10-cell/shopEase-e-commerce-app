import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiArrowLeft, FiArrowRight, FiCheck, FiCreditCard, FiPackage } from 'react-icons/fi'
import SiteFooter from '../components/SiteFooter.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { useShopping } from '../hooks/useShopping.js'
import {
  getApiErrorMessage,
  getCheckoutConfig,
  getCheckoutQuote,
  markCheckoutPaymentFailed,
  submitCheckout,
  verifyCheckoutPayment,
} from '../services/api.js'

function formatPrice(price) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(price)
}

function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve()
  const existingScript = document.querySelector('#razorpay-checkout-script')
  if (existingScript) {
    return new Promise((resolve, reject) => {
      existingScript.addEventListener('load', resolve, { once: true })
      existingScript.addEventListener('error', reject, { once: true })
    })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.id = 'razorpay-checkout-script'
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = resolve
    script.onerror = () => {
      script.remove()
      reject(new Error('The secure payment window could not be loaded. Please try again.'))
    }
    document.body.appendChild(script)
  })
}

const addressFields = [
  { name: 'fullName', label: 'Full name', autoComplete: 'name' },
  { name: 'phone', label: 'Phone number', autoComplete: 'tel', type: 'tel' },
  { name: 'street', label: 'Street address', autoComplete: 'address-line1' },
  { name: 'apartment', label: 'Apartment, suite, etc. (optional)', autoComplete: 'address-line2', required: false },
  { name: 'city', label: 'City', autoComplete: 'address-level2' },
  { name: 'state', label: 'State / province', autoComplete: 'address-level1' },
  { name: 'postalCode', label: 'Postal code', autoComplete: 'postal-code' },
  { name: 'country', label: 'Country', autoComplete: 'country-name', defaultValue: 'India' },
]

function CheckoutPage({ onSearch }) {
  const { user } = useAuth()
  const { cart, loading: cartLoading, refreshShopping } = useShopping()
  const [config, setConfig] = useState(null)
  const [quote, setQuote] = useState(null)
  const [quoteLoading, setQuoteLoading] = useState(true)
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentProof, setPaymentProof] = useState(null)
  const [completedOrder, setCompletedOrder] = useState(null)
  const paymentHandled = useRef(false)

  useEffect(() => {
    let active = true
    Promise.all([getCheckoutConfig(), getCheckoutQuote()])
      .then(([checkoutConfig, checkoutQuote]) => {
        if (!active) return
        setConfig(checkoutConfig)
        setQuote(checkoutQuote)
        setQuoteLoading(false)
      })
      .catch((requestError) => {
        if (!active) return
        setError(getApiErrorMessage(requestError))
        setQuoteLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function applyCoupon(event) {
    event.preventDefault()
    setError('')
    setQuoteLoading(true)
    try {
      const nextQuote = await getCheckoutQuote(couponCode.trim())
      setQuote(nextQuote)
      setAppliedCoupon(nextQuote.couponCode || '')
    } catch (requestError) {
      setError(
        requestError instanceof Error && !requestError.response && !requestError.code
          ? requestError.message
          : getApiErrorMessage(requestError),
      )
    } finally {
      setQuoteLoading(false)
    }
  }

  async function retryPaymentVerification() {
    if (!paymentProof) return
    setSubmitting(true)
    setError('')
    try {
      const result = await verifyCheckoutPayment(paymentProof)
      setCompletedOrder(result.order)
      setPaymentProof(null)
      await refreshShopping()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setSubmitting(false)
    }
  }

  async function submitOrder(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const formData = new FormData(event.currentTarget)
    const values = Object.fromEntries(formData.entries())
    const { paymentMethod, ...shippingAddress } = values

    try {
      if (paymentMethod === 'razorpay') await loadRazorpayScript()
      const result = await submitCheckout({
        shippingAddress,
        paymentMethod,
        ...(appliedCoupon ? { couponCode: appliedCoupon } : {}),
      })

      if (paymentMethod === 'cod') {
        setCompletedOrder(result.order)
        await refreshShopping()
        return
      }

      paymentHandled.current = false
      const paymentResponse = new window.Razorpay({
        key: result.gateway.keyId,
        amount: result.gateway.amount,
        currency: result.gateway.currency,
        name: 'ShopEase',
        description: `Order ${result.order.orderNumber}`,
        order_id: result.gateway.orderId,
        prefill: {
          name: shippingAddress.fullName,
          email: user.email,
          contact: shippingAddress.phone,
        },
        theme: { color: '#425f52' },
        modal: {
          ondismiss: () => {
            setPaymentOpen(false)
            if (paymentHandled.current) return
            setError('Payment was cancelled. Your bag is unchanged; you can try checkout again.')
          },
        },
        handler: async (proof) => {
          paymentHandled.current = true
          setPaymentOpen(false)
          setPaymentProof(proof)
          try {
            const verified = await verifyCheckoutPayment(proof)
            setCompletedOrder(verified.order)
            setPaymentProof(null)
            await refreshShopping()
          } catch (requestError) {
            if (requestError.response?.status === 400) {
              setPaymentProof(null)
              setError(getApiErrorMessage(requestError))
              return
            }
            setError(`${getApiErrorMessage(requestError)} Your payment proof is kept so you can retry verification.`)
          }
        },
      })
      paymentResponse.on('payment.failed', async (failure) => {
        paymentHandled.current = true
        setPaymentOpen(false)
        const razorpayPaymentId = failure.error?.metadata?.payment_id
        if (!razorpayPaymentId) {
          setError('Payment did not complete. Your inventory will be released automatically after the checkout reservation expires.')
          return
        }
        try {
          await markCheckoutPaymentFailed(result.order.id, razorpayPaymentId)
        } catch (requestError) {
          setError(
            requestError instanceof Error && !requestError.response
              ? requestError.message
              : getApiErrorMessage(requestError),
          )
          return
        }
        setError('Payment did not complete. Your bag is unchanged; you can try checkout again.')
      })
      setPaymentOpen(true)
      paymentResponse.open()
    } catch (requestError) {
      setError(
        requestError instanceof Error && !requestError.response && !requestError.code
          ? requestError.message
          : getApiErrorMessage(requestError),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const items = cart?.items || []
  const isEmpty = !cartLoading && items.length === 0

  return (
    <div className="app-shell">
      <SiteHeader onSearch={onSearch} />
      <main className="checkout-page page-container">
        <Link className="detail-back-link" to="/cart"><FiArrowLeft aria-hidden="true" /> Back to your bag</Link>
        {completedOrder ? (
          <section aria-live="polite" className="checkout-complete">
            <div className="checkout-complete-icon"><FiCheck aria-hidden="true" /></div>
            <p className="eyebrow">All set</p>
            <h1>Thank you for your order.</h1>
            <p>Your order <strong>{completedOrder.orderNumber}</strong> is confirmed.</p>
            <p className="checkout-complete-total">{formatPrice(completedOrder.total)}</p>
            <p className="checkout-complete-note">
              {completedOrder.paymentMethod === 'cod'
                ? 'Payment is due when your order arrives.'
                : 'Your Razorpay payment was verified securely.'}
            </p>
            <div className="checkout-complete-actions">
              <Link className="button button-dark" to={`/orders/${encodeURIComponent(completedOrder.id)}`}>Track this order <FiArrowRight aria-hidden="true" /></Link>
              <Link className="text-button" to="/products">Keep browsing</Link>
            </div>
          </section>
        ) : isEmpty ? (
          <section className="empty-state checkout-empty">
            <FiPackage aria-hidden="true" />
            <h1>Your bag is empty.</h1>
            <p>Add something to your bag before checking out.</p>
            <Link className="button button-dark" to="/products">Browse the collection <FiArrowRight aria-hidden="true" /></Link>
          </section>
        ) : (
          <>
            <div className="shopping-heading checkout-heading">
              <div>
                <p className="eyebrow">Almost yours</p>
                <h1>Checkout</h1>
              </div>
              <span className="checkout-secure-note"><FiCreditCard aria-hidden="true" /> Secure checkout</span>
            </div>
            {error && <p className="form-error checkout-error" role="alert">{error}</p>}
            {paymentProof && (
              <button className="text-button checkout-verify-retry" disabled={submitting} onClick={retryPaymentVerification} type="button">
                {submitting ? 'Verifying payment…' : 'Retry secure payment verification'}
              </button>
            )}
            <div className="checkout-layout">
              <form className="checkout-form" onSubmit={submitOrder}>
                <section className="checkout-section">
                  <p className="eyebrow">Where to?</p>
                  <h2>Delivery details</h2>
                  <div className="checkout-fields">
                    {addressFields.map((field) => (
                      <label className={field.name === 'street' || field.name === 'apartment' ? 'checkout-field checkout-field-wide' : 'checkout-field'} key={field.name}>
                        {field.label}
                        <input
                          autoComplete={field.autoComplete}
                          defaultValue={field.name === 'fullName' ? user.name : field.name === 'phone' ? user.phone || '' : field.defaultValue || ''}
                          maxLength={field.name === 'phone' ? 30 : 200}
                          name={field.name}
                          required={field.required !== false}
                          type={field.type || 'text'}
                        />
                      </label>
                    ))}
                  </div>
                </section>
                <section className="checkout-section">
                  <p className="eyebrow">How would you like to pay?</p>
                  <h2>Payment method</h2>
                  <label className={`payment-option${config?.razorpayEnabled ? '' : ' payment-option-disabled'}`}>
                    <input
                      disabled={!config?.razorpayEnabled}
                      name="paymentMethod"
                      type="radio"
                      value="razorpay"
                    />
                    <span><strong>Razorpay</strong><small>{config?.razorpayEnabled ? 'UPI, cards, and net banking in secure test checkout' : 'Temporarily unavailable — configure Razorpay test keys'}</small></span>
                  </label>
                  <label className="payment-option">
                    <input defaultChecked name="paymentMethod" type="radio" value="cod" />
                    <span><strong>Cash on delivery</strong><small>Pay when your order arrives</small></span>
                  </label>
                </section>
                <button className="button button-dark checkout-submit" disabled={submitting || paymentOpen || !quote || Boolean(paymentProof)} type="submit">
                  {submitting || paymentOpen ? 'Preparing secure checkout…' : 'Place order'}
                  {!submitting && !paymentOpen && <FiArrowRight aria-hidden="true" />}
                </button>
              </form>

              <aside className="order-summary checkout-summary">
                <p className="eyebrow">A quick recap</p>
                <h2>Your order</h2>
                {quoteLoading ? (
                  <div aria-label="Updating order total" className="skeleton checkout-summary-skeleton" />
                ) : quote?.items.map((item) => (
                  <div className="checkout-item" key={item.productId}>
                    <span>{item.name} <small>× {item.quantity}</small></span>
                    <strong>{formatPrice(item.lineTotal)}</strong>
                  </div>
                ))}
                <form className="coupon-form" onSubmit={applyCoupon}>
                  <label htmlFor="checkout-coupon">Have a coupon?</label>
                  <div>
                    <input
                      autoCapitalize="characters"
                      id="checkout-coupon"
                      maxLength={40}
                      onChange={(event) => setCouponCode(event.target.value)}
                      placeholder="Enter code"
                      value={couponCode}
                    />
                    <button className="text-button" disabled={quoteLoading} type="submit">{appliedCoupon ? 'Update' : 'Apply'}</button>
                  </div>
                  {appliedCoupon && <small className="coupon-applied">Applied: {appliedCoupon}</small>}
                </form>
                {quote && (
                  <>
                    <div className="summary-line"><span>Subtotal</span><strong>{formatPrice(quote.subtotal)}</strong></div>
                    <div className="summary-line"><span>Delivery</span><strong>{quote.shippingCost ? formatPrice(quote.shippingCost) : 'Free'}</strong></div>
                    {quote.discount > 0 && <div className="summary-line summary-discount"><span>Discount</span><strong>−{formatPrice(quote.discount)}</strong></div>}
                    <div className="summary-total"><span>Total</span><strong>{formatPrice(quote.total)}</strong></div>
                  </>
                )}
                <p>Prices, discounts, and stock are verified by the store when you place your order.</p>
              </aside>
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}

export default CheckoutPage
