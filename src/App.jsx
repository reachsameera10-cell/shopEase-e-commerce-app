import { useCallback, useEffect, useState } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { FiArrowUpRight, FiRefreshCw } from 'react-icons/fi'
import CategoryGrid from './components/CategoryGrid.jsx'
import HeroBanner from './components/HeroBanner.jsx'
import ProductQuickView from './components/ProductQuickView.jsx'
import ProductSection from './components/ProductSection.jsx'
import SiteFooter from './components/SiteFooter.jsx'
import SiteHeader from './components/SiteHeader.jsx'
import AccountPage from './pages/AccountPage.jsx'
import CartPage from './pages/CartPage.jsx'
import CheckoutPage from './pages/CheckoutPage.jsx'
import ProductDetailsPage from './pages/ProductDetailsPage.jsx'
import ProductsPage from './pages/ProductsPage.jsx'
import WishlistPage from './pages/WishlistPage.jsx'
import AdminDashboardPage from './pages/AdminDashboardPage.jsx'
import OrderDetailsPage from './pages/OrderDetailsPage.jsx'
import OrderHistoryPage from './pages/OrderHistoryPage.jsx'
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx'
import ResetPasswordPage from './pages/ResetPasswordPage.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ShoppingProvider } from './context/ShoppingContext.jsx'
import ThemeProvider from './context/ThemeProvider.jsx'
import { useAuth } from './hooks/useAuth.js'
import { useShopping } from './hooks/useShopping.js'
import { fetchCategories, fetchProducts, getApiErrorMessage } from './services/api.js'
import './App.css'

const initialProductState = { data: [], loading: true, error: '' }

function HomePage() {
  const navigate = useNavigate()
  const { addToCart, addToWishlist } = useShopping()
  const [categories, setCategories] = useState([])
  const [categoryState, setCategoryState] = useState({ loading: true, error: '' })
  const [featured, setFeatured] = useState(initialProductState)
  const [trending, setTrending] = useState(initialProductState)
  const [latest, setLatest] = useState(initialProductState)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    fetchCategories({ signal: controller.signal })
      .then((data) => {
        setCategories(data)
        setCategoryState({ loading: false, error: '' })
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setCategoryState({ loading: false, error: getApiErrorMessage(error) })
      })

    return () => controller.abort()
  }, [refreshKey])

  useEffect(() => {
    const controller = new AbortController()
    const sections = [
      { params: { sort: 'rating', limit: 4 }, setter: setFeatured },
      { params: { sort: 'popular', limit: 4 }, setter: setTrending },
      { params: { sort: 'newest', limit: 4 }, setter: setLatest },
    ]

    for (const section of sections) {
      fetchProducts(section.params, { signal: controller.signal })
        .then((data) => section.setter({ data, loading: false, error: '' }))
        .catch((error) => {
          if (controller.signal.aborted) return
          section.setter({ data: [], loading: false, error: getApiErrorMessage(error) })
        })
    }

    return () => controller.abort()
  }, [refreshKey])

  const runSearch = useCallback((query, category = null) => {
    const params = new URLSearchParams()
    if (query) params.set('search', query)
    if (category?.slug || category?._id) params.set('category', category.slug || category._id)
    navigate(`/products${params.size ? `?${params}` : ''}`)
  }, [navigate])

  function startBrowsing() {
    document.getElementById('featured')?.scrollIntoView({ behavior: 'smooth' })
  }

  function retryAll() {
    setCategoryState({ loading: true, error: '' })
    setFeatured({ data: [], loading: true, error: '' })
    setTrending({ data: [], loading: true, error: '' })
    setLatest({ data: [], loading: true, error: '' })
    setRefreshKey((key) => key + 1)
  }

  return (
    <div className="app-shell">
      <SiteHeader onSearch={(query) => runSearch(query)} />
      <main>
        <HeroBanner onShopClick={startBrowsing} />

        <div className="promise-strip page-container">
          <span><span className="promise-icon">✳</span> Thoughtfully selected</span>
          <span><span className="promise-icon">↗</span> New finds, often</span>
          <span><span className="promise-icon">♡</span> Made for real life</span>
        </div>

        <CategoryGrid
          categories={categories}
          error={categoryState.error}
          loading={categoryState.loading}
          onRetry={retryAll}
          onSelectCategory={(category) => runSearch('', category)}
        />

        <div className="editorial-band page-container">
          <span className="editorial-spark" aria-hidden="true">✳</span>
          <p className="eyebrow">The ShopEase point of view</p>
          <p className="editorial-quote">“The best things aren&apos;t always the loudest.<br />They&apos;re the ones you reach for every day.”</p>
          <span className="editorial-signature">A little note from us <FiArrowUpRight aria-hidden="true" /></span>
        </div>

        <ProductSection
          id="featured"
          title="A few good finds"
          eyebrow="Chosen with you in mind"
          products={featured.data}
          loading={featured.loading}
          error={featured.error}
          onRetry={retryAll}
          onSelectProduct={setSelectedProduct}
          actionLabel="Explore all"
          onAction={() => runSearch('')}
        />

        <section className="trend-panel page-container">
          <div className="trend-panel-copy">
            <p className="eyebrow">The ones everyone loves</p>
            <h2>Good taste<br />gets around.</h2>
            <p>See what shoppers are reaching for right now.</p>
            <button className="button button-light" onClick={() => runSearch('')} type="button">
              Browse bestsellers <FiArrowUpRight aria-hidden="true" />
            </button>
          </div>
          <div className="trend-panel-products">
            <ProductSection
              id="trending"
              title="Trending now"
              eyebrow="The current favorites"
              products={trending.data}
              loading={trending.loading}
              error={trending.error}
              onRetry={retryAll}
              onSelectProduct={setSelectedProduct}
            />
          </div>
        </section>

        <ProductSection
          id="new-arrivals"
          title="Just found their way here"
          eyebrow="Fresh on the shelves"
          products={latest.data}
          loading={latest.loading}
          error={latest.error}
          onRetry={retryAll}
          onSelectProduct={setSelectedProduct}
          actionLabel="See what’s new"
          onAction={() => runSearch('')}
        />

        <section className="newsletter page-container">
          <div className="newsletter-mark" aria-hidden="true">s.</div>
          <div>
            <p className="eyebrow">Good things, occasionally</p>
            <h2>A little note from us.</h2>
            <p>Our newsletter sign-up is coming soon. In the meantime, have a look around.</p>
          </div>
          <button className="button button-dark" onClick={startBrowsing} type="button">
            Explore the store <FiArrowUpRight aria-hidden="true" />
          </button>
        </section>

        <div className="api-retry page-container">
          <button className="text-button" onClick={retryAll} type="button">
            <FiRefreshCw aria-hidden="true" /> Refresh store data
          </button>
        </div>
      </main>
      <SiteFooter />
      <ProductQuickView
        product={selectedProduct}
        onAddToCart={addToCart}
        onClose={() => setSelectedProduct(null)}
        onAddToWishlist={addToWishlist}
      />
    </div>
  )
}

function App() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const handleSearch = useCallback((query) => {
    const params = new URLSearchParams()
    if (query) params.set('search', query)
    navigate(`/products${params.size ? `?${params}` : ''}`)
  }, [navigate])

  return (
    <Routes>
      <Route element={<HomePage />} path="/" />
      <Route element={<ProductsPage onSearch={handleSearch} />} path="/products" />
      <Route element={<ProductDetailsPage onSearch={handleSearch} />} path="/products/:idOrSlug" />
      <Route element={<AccountPage onSearch={handleSearch} />} path="/account" />
      <Route element={<ForgotPasswordPage onSearch={handleSearch} />} path="/forgot-password" />
      <Route element={<ResetPasswordPage onSearch={handleSearch} />} path="/reset-password" />
      <Route element={<RequireAuth loading={loading} user={user}><CartPage onSearch={handleSearch} /></RequireAuth>} path="/cart" />
      <Route element={<RequireAuth loading={loading} user={user}><CheckoutPage onSearch={handleSearch} /></RequireAuth>} path="/checkout" />
      <Route element={<RequireAuth loading={loading} user={user}><WishlistPage onSearch={handleSearch} /></RequireAuth>} path="/wishlist" />
      <Route element={<RequireAuth loading={loading} user={user}><OrderHistoryPage onSearch={handleSearch} /></RequireAuth>} path="/orders" />
      <Route element={<RequireAuth loading={loading} user={user}><OrderDetailsPage onSearch={handleSearch} /></RequireAuth>} path="/orders/:orderId" />
      <Route element={<RequireAdmin loading={loading} onSearch={handleSearch} user={user}><AdminDashboardPage onSearch={handleSearch} /></RequireAdmin>} path="/admin" />
      <Route element={<NotFoundPage onSearch={handleSearch} />} path="*" />
    </Routes>
  )
}

function RequireAuth({ loading, user, children }) {
  const location = useLocation()
  if (loading) {
    return <main aria-label="Checking your account" className="auth-route-loading page-container"><div className="skeleton auth-route-skeleton" /></main>
  }
  if (!user) {
    return <Navigate replace state={{ from: location }} to="/account" />
  }
  return children
}

function RequireAdmin({ loading, onSearch, user, children }) {
  const location = useLocation()
  if (loading) {
    return <main aria-label="Checking administrator access" className="auth-route-loading page-container"><div className="skeleton auth-route-skeleton" /></main>
  }
  if (!user) {
    return <Navigate replace state={{ from: location }} to="/account" />
  }
  if (user.role !== 'admin') {
    return (
      <div className="app-shell">
        <SiteHeader onSearch={onSearch} />
        <main className="not-found-page page-container" role="alert">
          <p className="eyebrow">Admin access only</p>
          <h1>This area is for authorized administrators.</h1>
          <Link className="button button-dark" to="/">Back to storefront</Link>
        </main>
        <SiteFooter />
      </div>
    )
  }
  return children
}

function NotFoundPage({ onSearch }) {
  return (
    <div className="app-shell">
      <SiteHeader onSearch={onSearch} />
      <main className="not-found-page page-container">
        <p className="eyebrow">Looks like a wrong turn</p>
        <h1>We couldn&apos;t find that page.</h1>
        <a className="button button-dark" href="/">Back to ShopEase</a>
      </main>
      <SiteFooter />
    </div>
  )
}

function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <ShoppingProvider>
            <App />
            <ShoppingToast />
          </ShoppingProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

function ShoppingToast() {
  const { notice } = useShopping()
  return notice ? <div className="toast-message" role="status">{notice}</div> : null
}

export default AppRouter
