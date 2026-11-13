import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FiArrowUpRight, FiEye, FiEyeOff, FiLogOut, FiPackage, FiShield, FiUser } from 'react-icons/fi'
import SiteFooter from '../components/SiteFooter.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { getApiErrorMessage } from '../services/api.js'

function AccountPage({ onSearch }) {
  const { user, loading, error: sessionError, signIn, signUp, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const requestedPath = location.state?.from?.pathname
  const requestedPage = requestedPath === '/cart'
    ? 'your shopping bag'
    : requestedPath === '/wishlist'
      ? 'your wishlist'
      : requestedPath?.startsWith('/orders')
        ? 'your orders'
        : requestedPath === '/admin'
          ? 'the administrator dashboard'
          : requestedPath === '/checkout'
            ? 'checkout'
            : ''
  const [mode, setMode] = useState('login')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const credentials = Object.fromEntries(formData.entries())
    setFormError('')
    setSubmitting(true)

    try {
      if (mode === 'register') await signUp(credentials)
      else await signIn(credentials)
      const destination = requestedPath || '/cart'
      navigate(destination, { replace: true })
    } catch (requestError) {
      setFormError(getApiErrorMessage(requestError))
    } finally {
      setSubmitting(false)
    }
  }

  async function logout() {
    setFormError('')
    try {
      await signOut()
    } catch (requestError) {
      setFormError(getApiErrorMessage(requestError))
    }
  }

  return (
    <div className="app-shell">
      <SiteHeader onSearch={onSearch} />
      <main className="account-page page-container">
        <div className="account-panel">
          <div className="account-icon"><FiUser aria-hidden="true" /></div>
          {user ? (
            <div className="account-signed-in">
              <p className="eyebrow">Good to have you here</p>
              <h1>Welcome, {user.name}.</h1>
              <p className="account-intro">{user.email}</p>
              {sessionError && <p className="form-error" role="alert">{sessionError}</p>}
              {formError && <p className="form-error" role="alert">{formError}</p>}
              <div className="account-actions">
                <Link className="button button-dark" to="/cart">Go to your bag <FiArrowUpRight aria-hidden="true" /></Link>
                <Link className="text-button" to="/orders"><FiPackage aria-hidden="true" /> Your orders</Link>
                {user.role === 'admin' && <Link className="text-button" to="/admin"><FiShield aria-hidden="true" /> Admin dashboard</Link>}
                <button className="text-button" onClick={logout} type="button"><FiLogOut aria-hidden="true" /> Sign out</button>
              </div>
            </div>
          ) : (
            <>
              <p className="eyebrow">{mode === 'register' ? 'Make yourself at home' : 'Your little corner'}</p>
              <h1>{mode === 'register' ? 'Create an account.' : 'Welcome back.'}</h1>
              <p className="account-intro">
                {mode === 'register'
                  ? 'Save your favorites and keep your shopping bag close.'
                  : 'Sign in to pick up right where you left off.'}
              </p>
              {requestedPage && (
                <p className="account-redirect-notice" role="status">
                  Sign in or create an account to continue to {requestedPage}.
                </p>
              )}
              {sessionError && <p className="form-error" role="alert">{sessionError}</p>}
              <form className="account-form" onSubmit={submit}>
                {mode === 'register' && (
                  <label>
                    Your name
                    <input autoComplete="name" maxLength={80} name="name" required />
                  </label>
                )}
                <label>
                  Email address
                  <input autoComplete="email" maxLength={254} name="email" required type="email" />
                </label>
                <label className="account-password-label">
                  Password
                  <span className="account-password-input">
                    <input
                      autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                      minLength={8}
                      name="password"
                      required
                      type={passwordVisible ? 'text' : 'password'}
                    />
                    <button
                      aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                      aria-pressed={passwordVisible}
                      className="account-password-toggle"
                      onClick={() => setPasswordVisible((visible) => !visible)}
                      type="button"
                    >
                      {passwordVisible
                        ? <FiEyeOff aria-hidden="true" />
                        : <FiEye aria-hidden="true" />}
                    </button>
                  </span>
                </label>
                {formError && <p className="form-error" role="alert">{formError}</p>}
                <button className="button button-dark account-submit" disabled={submitting || loading} type="submit">
                  {submitting ? 'One moment…' : mode === 'register' ? 'Create account' : 'Sign in'}
                  {!submitting && <FiArrowUpRight aria-hidden="true" />}
                </button>
              </form>
              {mode === 'login' && (
                <p className="account-forgot-password">
                  <Link to="/forgot-password">Forgot password?</Link>
                </p>
              )}
              <p className="account-switch">
                {mode === 'register' ? 'Already have an account?' : 'New around here?'}
                {' '}
                <button
                  onClick={() => {
                    setMode((current) => current === 'register' ? 'login' : 'register')
                    setPasswordVisible(false)
                    setFormError('')
                  }}
                  type="button"
                >
                  {mode === 'register' ? 'Sign in' : 'Create one'}
                </button>
              </p>
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

export default AccountPage
