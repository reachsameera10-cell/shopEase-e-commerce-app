import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FiArrowUpRight, FiMail, FiUser } from 'react-icons/fi'
import SiteFooter from '../components/SiteFooter.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import { getApiErrorMessage, requestPasswordReset } from '../services/api.js'

function ForgotPasswordPage({ onSearch }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await requestPasswordReset(email)
      setSubmitted(true)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="app-shell">
      <SiteHeader onSearch={onSearch} />
      <main className="account-page page-container">
        <section className="account-panel" aria-labelledby="forgot-password-heading">
          <div className="account-icon"><FiMail aria-hidden="true" /></div>
          <p className="eyebrow">A fresh start</p>
          <h1 id="forgot-password-heading">Forgot your password?</h1>
          {submitted ? (
            <>
              <p className="account-intro" role="status">
                If an account exists for that email, a password reset link has been sent.
              </p>
              <Link className="button button-dark account-submit account-back-link" to="/account">
                Back to sign in <FiArrowUpRight aria-hidden="true" />
              </Link>
            </>
          ) : (
            <>
              <p className="account-intro">
                Enter the email address for your account. If it matches, we’ll send you a reset link.
              </p>
              <form className="account-form" onSubmit={submit}>
                <label>
                  Email address
                  <input
                    autoComplete="email"
                    maxLength={254}
                    name="email"
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    type="email"
                    value={email}
                  />
                </label>
                {error && <p className="form-error" role="alert">{error}</p>}
                <button className="button button-dark account-submit" disabled={submitting} type="submit">
                  {submitting ? 'Sending…' : 'Send reset link'}
                  {!submitting && <FiArrowUpRight aria-hidden="true" />}
                </button>
              </form>
              <p className="account-switch">
                Remembered it? <Link to="/account"><FiUser aria-hidden="true" /> Sign in</Link>
              </p>
            </>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}

export default ForgotPasswordPage
