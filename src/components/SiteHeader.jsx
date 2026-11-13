import { useState } from 'react'
import { FiArrowUpRight, FiGrid, FiHeart, FiMenu, FiMoon, FiSearch, FiShoppingBag, FiSun, FiUser, FiX } from 'react-icons/fi'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { useShopping } from '../hooks/useShopping.js'
import { useTheme } from '../hooks/useTheme.js'

function SiteHeader({ onSearch }) {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const { cart, wishlist } = useShopping()
  const { theme, toggleTheme } = useTheme()
  const [query, setQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

  function submitSearch(event) {
    event.preventDefault()
    onSearch(query.trim())
    setMenuOpen(false)
    setMobileSearchOpen(false)
  }

  return (
    <header className="site-header">
      <div className="announcement">
        <span>Thoughtful finds for everyday living</span>
        <a href="#new-arrivals">
          Discover what&apos;s new <FiArrowUpRight aria-hidden="true" />
        </a>
      </div>

      <div className="header-main page-container">
        <Link className="brand" to="/" aria-label="ShopEase home">
          <span className="brand-mark">s.</span>
          <span>shopease</span>
        </Link>

        <nav className={`main-nav${menuOpen ? ' is-open' : ''}`} aria-label="Main navigation">
          <a href={pathname === '/' ? '#categories' : '/products'} onClick={() => setMenuOpen(false)}>Categories</a>
          <a href={pathname === '/' ? '#featured' : '/products?sort=rating'} onClick={() => setMenuOpen(false)}>Curated picks</a>
          <a href={pathname === '/' ? '#new-arrivals' : '/products?sort=newest'} onClick={() => setMenuOpen(false)}>New arrivals</a>
        </nav>

        <form className={`header-search${mobileSearchOpen ? ' is-mobile-open' : ''}`} onSubmit={submitSearch} role="search">
          <FiSearch aria-hidden="true" />
          <input
            aria-label="Search products"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search for something lovely"
            type="search"
            value={query}
          />
          <button aria-label="Submit search" type="submit">
            <span>Search</span>
            <FiArrowUpRight aria-hidden="true" />
          </button>
        </form>

        <button
          aria-expanded={mobileSearchOpen}
          aria-label={mobileSearchOpen ? 'Close product search' : 'Open product search'}
          className="mobile-search-toggle"
          onClick={() => {
            setMobileSearchOpen((open) => !open)
            setMenuOpen(false)
          }}
          type="button"
        >
          {mobileSearchOpen ? <FiX aria-hidden="true" /> : <FiSearch aria-hidden="true" />}
        </button>

        <button
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          className="mobile-menu-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          type="button"
        >
          {menuOpen ? <FiX aria-hidden="true" /> : <FiMenu aria-hidden="true" />}
        </button>

        <nav aria-label="Your account and shopping" className="shop-actions">
          <button
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            aria-pressed={theme === 'dark'}
            className="theme-toggle"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            type="button"
          >
            {theme === 'dark' ? <FiSun aria-hidden="true" /> : <FiMoon aria-hidden="true" />}
          </button>
          {user?.role === 'admin' && (
            <Link aria-label="Admin dashboard" className="admin-link" title="Admin dashboard" to="/admin">
              <FiGrid aria-hidden="true" />
              <span>Admin</span>
            </Link>
          )}
          <Link aria-label="Account" to="/account" title={user ? `Account: ${user.name}` : 'Sign in'}>
            <FiUser aria-hidden="true" />
          </Link>
          <Link aria-label={`Wishlist${wishlist?.items?.length ? `, ${wishlist.items.length} saved` : ''}`} to="/wishlist">
            <FiHeart aria-hidden="true" />
            {wishlist?.items?.length > 0 && <span className="header-count">{wishlist.items.length}</span>}
          </Link>
          <Link aria-label={`Shopping bag${cart?.itemCount ? `, ${cart.itemCount} items` : ''}`} to="/cart">
            <FiShoppingBag aria-hidden="true" />
            {cart?.itemCount > 0 && <span className="header-count">{cart.itemCount}</span>}
          </Link>
        </nav>
      </div>
    </header>
  )
}

export default SiteHeader
