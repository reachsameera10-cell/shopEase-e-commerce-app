import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiArrowUpRight, FiEye, FiEyeOff, FiLock } from 'react-icons/fi'
import SiteFooter from '../components/SiteFooter.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import { getApiErrorMessage, resetPassword } from '../services/api.js'

function ResetPasswordPage({ onSearch }) {
  const [token] = useState(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1))
    return fragment.get('token') || ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [newPasswordVisible, setNewPasswordVisible] = useState(false)
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false)

  useEffect(() => {
    if (window.location.hash.includes('token=')) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    }
  }, [])

  async function submit(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const newPassword = formData.get('newPassword')
    const confirmPassword = formData.get('confirmPassword')
    setError('')

    if (newPassword !== confirmPassword) {
      setError('The passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      await resetPassword({ token, newPassword })
      setSuccess(true)
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
        <section className="account-panel" aria-labelledby="reset-password-heading">
          <div className="account-icon"><FiLock aria-hidden="true" /></div>
          <p className="eyebrow">Secure your account</p>
          <h1 id="reset-password-heading">Choose a new password.</h1>
          {success ? (
            <>
              <p className="account-intro" role="status">Your password has been reset. You can now sign in.</p>
              <Link className="button button-dark account-submit account-back-link" to="/account">
                Sign in <FiArrowUpRight aria-hidden="true" />
              </Link>
            </>
          ) : !token ? (
            <>
              <p className="account-intro" role="alert">This password reset link is invalid or has expired.</p>
              <Link className="button button-dark account-submit account-back-link" to="/forgot-password">
                Request a new link <FiArrowUpRight aria-hidden="true" />
              </Link>
            </>
          ) : (
            <>
              <p className="account-intro">
                Use at least 8 characters with an uppercase letter, lowercase letter, number, and symbol.
              </p>
              <form className="account-form" onSubmit={submit}>
                <label className="account-password-label">
                  New password
                  <span className="account-password-input">
                    <input
                      autoComplete="new-password"
                      maxLength={72}
                      minLength={8}
                      name="newPassword"
                      required
                      type={newPasswordVisible ? 'text' : 'password'}
                    />
                    <button
                      aria-label={newPasswordVisible ? 'Hide new password' : 'Show new password'}
                      aria-pressed={newPasswordVisible}
                      className="account-password-toggle"
                      onClick={() => setNewPasswordVisible((visible) => !visible)}
                      type="button"
                    >
                      {newPasswordVisible ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
                    </button>
                  </span>
                </label>
                <label className="account-password-label">
                  Confirm new password
                  <span className="account-password-input">
                    <input
                      autoComplete="new-password"
                      maxLength={72}
                      minLength={8}
                      name="confirmPassword"
                      required
                      type={confirmPasswordVisible ? 'text' : 'password'}
                    />
                    <button
                      aria-label={confirmPasswordVisible ? 'Hide confirmed password' : 'Show confirmed password'}
                      aria-pressed={confirmPasswordVisible}
                      className="account-password-toggle"
                      onClick={() => setConfirmPasswordVisible((visible) => !visible)}
                      type="button"
                    >
                      {confirmPasswordVisible ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
                    </button>
                  </span>
                </label>
                {error && <p className="form-error" role="alert">{error}</p>}
                <button className="button button-dark account-submit" disabled={submitting} type="submit">
                  {submitting ? 'Updating…' : 'Reset password'}
                  {!submitting && <FiArrowUpRight aria-hidden="true" />}
                </button>
              </form>
              <p className="account-switch">
                <Link to="/account">Back to sign in</Link>
              </p>
            </>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}

export default ResetPasswordPage
