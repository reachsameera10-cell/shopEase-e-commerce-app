import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FiStar } from 'react-icons/fi'
import { useAuth } from '../hooks/useAuth.js'
import {
  deleteProductReview,
  fetchProductReviews,
  getApiErrorMessage,
  getProductReviewEligibility,
  submitProductReview,
  updateProductReview,
} from '../services/api.js'

function ReviewStarPicker({ rating, hoveredRating, onRatingChange, onHover }) {
  return (
    <div aria-label="Choose a rating" className="product-review-star-picker" role="radiogroup">
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          aria-checked={rating === value}
          aria-label={`${value} ${value === 1 ? 'star' : 'stars'}`}
          className={value <= (hoveredRating || rating) ? 'is-selected' : ''}
          key={value}
          onBlur={() => onHover(0)}
          onClick={() => onRatingChange(value)}
          onFocus={() => onHover(value)}
          onMouseEnter={() => onHover(value)}
          onMouseLeave={() => onHover(0)}
          role="radio"
          type="button"
        >
          <FiStar aria-hidden="true" />
        </button>
      ))}
    </div>
  )
}

function ProductReviews({ productId }) {
  const { user } = useAuth()
  const location = useLocation()
  const [reviewData, setReviewData] = useState(null)
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [rating, setRating] = useState(5)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [title, setTitle] = useState('')
  const [comment, setComment] = useState('')
  const [editing, setEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const requestKey = `${productId}:${user?.id || 'anonymous'}`
  const currentReviewData = reviewData?.key === requestKey ? reviewData : null
  const reviews = currentReviewData?.reviews || []
  const eligibility = currentReviewData?.eligibility || null
  const ownReview = eligibility?.review || null
  const visibleReviews = reviews.filter((review) => review.id !== ownReview?.id)
  const loading = !currentReviewData || currentReviewData.loading
  const error = currentReviewData?.error || ''
  const showReviewForm = Boolean(eligibility?.eligible && (!ownReview || editing))

  useEffect(() => {
    const controller = new AbortController()

    Promise.all([
      fetchProductReviews(productId, { page: 1, limit: 10 }, { signal: controller.signal }),
      user
        ? getProductReviewEligibility(productId, { signal: controller.signal })
        : Promise.resolve(null),
    ])
      .then(([reviewData, eligibilityData]) => {
        if (controller.signal.aborted) return
        setReviewData({
          key: requestKey,
          reviews: reviewData.reviews,
          eligibility: eligibilityData,
          loading: false,
          error: '',
        })
      })
      .catch((requestError) => {
        if (controller.signal.aborted) return
        setReviewData({
          key: requestKey,
          reviews: [],
          eligibility: null,
          loading: false,
          error: getApiErrorMessage(requestError),
        })
      })

    return () => controller.abort()
  }, [productId, refreshKey, user, requestKey])

  function startEditing() {
    setRating(ownReview?.rating || 5)
    setTitle(ownReview?.title || '')
    setComment(ownReview?.comment || '')
    setFormError('')
    setEditing(true)
  }

  async function submitReview(event) {
    event.preventDefault()
    setFormError('')
    setNotice('')
    setSubmitting(true)

    try {
      const review = { rating, title, comment }
      if (ownReview) {
        await updateProductReview(ownReview.id, review)
        setNotice('Your review was updated and is waiting for moderation.')
      } else {
        await submitProductReview({ productId, ...review })
        setNotice('Thank you. Your verified-purchase review is waiting for moderation.')
      }
      setEditing(false)
      setRefreshKey((key) => key + 1)
    } catch (requestError) {
      setFormError(getApiErrorMessage(requestError))
    } finally {
      setSubmitting(false)
    }
  }

  async function removeReview() {
    if (!ownReview || !window.confirm('Delete your review? This cannot be undone.')) return
    setFormError('')
    setNotice('')
    setDeleting(true)
    try {
      await deleteProductReview(ownReview.id)
      setEditing(false)
      setNotice('Your review was deleted.')
      setRefreshKey((key) => key + 1)
    } catch (requestError) {
      setFormError(getApiErrorMessage(requestError))
    } finally {
      setDeleting(false)
    }
  }

  function renderReview(review, isOwn = false) {
    return (
      <article className="product-review" key={review.id}>
        <div className="product-review-meta">
          <span>{isOwn ? 'Your review' : review.customerName}</span>
          <span aria-label={`${review.rating} out of 5 stars`} className="product-review-rating">
            <FiStar aria-hidden="true" /> {review.rating}/5
          </span>
          {review.createdAt && (
            <time dateTime={review.createdAt}>
              {new Date(review.createdAt).toLocaleDateString()}
            </time>
          )}
          {review.verifiedPurchase && <span className="product-review-verified">Verified purchase</span>}
          {isOwn && <span className={`product-review-status product-review-status-${review.status}`}>{review.status}</span>}
        </div>
        {review.title && <h3>{review.title}</h3>}
        <p>{review.comment}</p>
        {isOwn && !editing && (
          <div className="product-review-actions">
            {eligibility?.eligible && (
              <button className="button button-outline" onClick={startEditing} type="button">Edit</button>
            )}
            <button className="button button-outline" disabled={deleting} onClick={removeReview} type="button">
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        )}
      </article>
    )
  }

  return (
    <section aria-labelledby="product-reviews-heading" className="product-reviews">
      <div className="product-reviews-heading">
        <p className="eyebrow">From the community</p>
        <h2 id="product-reviews-heading">Customer reviews</h2>
      </div>

      {loading ? (
        <p className="product-reviews-state">Loading reviews…</p>
      ) : error ? (
        <p className="product-reviews-state form-error" role="alert">{error}</p>
      ) : visibleReviews.length || ownReview ? (
        <div className="product-review-list">
          {ownReview && renderReview(ownReview, true)}
          {visibleReviews.map((review) => renderReview(review))}
        </div>
      ) : (
        <p className="product-reviews-state">No approved reviews yet. Be the first to share your experience.</p>
      )}

      {!user ? (
        <p className="product-review-signin">
          <Link to="/account" state={{ from: location }}>Sign in</Link> with the account used for your delivered order to write a review.
        </p>
      ) : showReviewForm ? (
        <form className="product-review-form" onSubmit={submitReview}>
          <h3>{ownReview ? 'Edit your review' : 'Share your experience'}</h3>
          <label className="product-review-rating-label">Rating</label>
          <ReviewStarPicker
            hoveredRating={hoveredRating}
            onHover={setHoveredRating}
            onRatingChange={setRating}
            rating={rating}
          />
          <label>
            Title (optional)
            <input maxLength={120} onChange={(event) => setTitle(event.target.value)} value={title} />
          </label>
          <label>
            Review
            <textarea maxLength={3000} minLength={1} onChange={(event) => setComment(event.target.value)} required rows={4} value={comment} />
          </label>
          {formError && <p className="form-error" role="alert">{formError}</p>}
          <div className="product-review-actions">
            <button className="button button-dark" disabled={submitting} type="submit">
              {submitting ? (ownReview ? 'Saving…' : 'Submitting…') : (ownReview ? 'Save review' : 'Submit review')}
            </button>
            {ownReview && (
              <button className="button button-outline" onClick={() => setEditing(false)} type="button">Cancel</button>
            )}
          </div>
        </form>
      ) : ownReview ? null : eligibility ? (
        <p className="product-reviews-state">You can review this item after an order containing it has been delivered.</p>
      ) : null}

      {formError && ownReview && !editing && <p className="form-error" role="alert">{formError}</p>}
      {notice && <p className="product-reviews-notice" role="status">{notice}</p>}
    </section>
  )
}

export default ProductReviews
