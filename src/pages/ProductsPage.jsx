import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FiArrowLeft, FiArrowRight, FiBox, FiSearch, FiStar } from 'react-icons/fi'
import SiteFooter from '../components/SiteFooter.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import { fetchCategories, fetchProductPage, getApiErrorMessage } from '../services/api.js'
import { formatProductPrice, getProductPricing } from '../utils/productPricing.js'

const emptyPage = { products: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 0 } }

function ProductCard({ product, index }) {
  const image = product.images?.[0]
  const pricing = getProductPricing(product)

  return (
    <Link className="catalog-product-card" to={`/products/${encodeURIComponent(product.slug || product._id)}`}>
      <span className={`catalog-product-image product-image-tone-${index % 4}`}>
        {image?.url ? (
          <img alt={image.alt || product.name} loading="lazy" src={image.url} />
        ) : (
          <span aria-hidden="true" className="product-image-placeholder"><FiBox /></span>
        )}
        {product.isFeatured && <span className="product-badge">Curated</span>}
        {pricing.hasDiscount && (
          <span aria-label={`${pricing.discountPercentage}% off`} className="product-discount-badge">
            {pricing.discountPercentage}% OFF
          </span>
        )}
      </span>
      <span className="catalog-product-meta">
        <span>{product.category?.name || product.brand || 'ShopEase find'}</span>
        {Number(product.ratingsCount) > 0 && (
          <span className="product-rating">
            <FiStar aria-hidden="true" /> {Number(product.ratingsAverage).toFixed(1)}
            <span className="product-rating-count">({Number(product.ratingsCount)})</span>
          </span>
        )}
      </span>
      <strong className="product-name">{product.name}</strong>
      <span className="product-price">
        <strong>{formatProductPrice(pricing.sellingPrice)}</strong>
        {pricing.hasDiscount && <del>{formatProductPrice(pricing.originalPrice)}</del>}
      </span>
    </Link>
  )
}

function ProductsPage({ onSearch }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('search') || ''
  const category = searchParams.get('category') || ''
  const sort = searchParams.get('sort') || 'newest'
  const page = Number(searchParams.get('page') || 1)
  const minPriceParam = searchParams.get('minPrice') || ''
  const maxPriceParam = searchParams.get('maxPrice') || ''

  const [categories, setCategories] = useState([])
  const [categoriesError, setCategoriesError] = useState('')
  const [result, setResult] = useState(emptyPage)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetchCategories({ signal: controller.signal })
      .then(setCategories)
      .catch((requestError) => {
        if (!controller.signal.aborted) setCategoriesError(getApiErrorMessage(requestError))
      })

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const params = { page, limit: 12, sort }
    if (search) params.search = search
    if (category) params.category = category
    if (minPriceParam) params.minPrice = minPriceParam
    if (maxPriceParam) params.maxPrice = maxPriceParam

    fetchProductPage(params, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) {
          setResult(data)
          setError('')
          setLoading(false)
        }
      })
      .catch((requestError) => {
        if (controller.signal.aborted) return
        setError(getApiErrorMessage(requestError))
        setLoading(false)
      })

    return () => controller.abort()
  }, [page, search, category, sort, minPriceParam, maxPriceParam, retryKey])

  function applyFilters(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const nextSearch = String(formData.get('search') || '').trim()
    const minPrice = String(formData.get('minPrice') || '').trim()
    const maxPrice = String(formData.get('maxPrice') || '').trim()
    const minimum = minPrice === '' ? undefined : Number(minPrice)
    const maximum = maxPrice === '' ? undefined : Number(maxPrice)

    if (
      (minimum !== undefined && (!Number.isFinite(minimum) || minimum < 0)) ||
      (maximum !== undefined && (!Number.isFinite(maximum) || maximum < 0))
    ) {
      setFormError('Enter valid, non-negative prices.')
      return
    }
    if (minimum !== undefined && maximum !== undefined && minimum > maximum) {
      setFormError('The minimum price must not exceed the maximum price.')
      return
    }

    setFormError('')
    setLoading(true)
    setError('')
    const next = new URLSearchParams()
    if (nextSearch) next.set('search', nextSearch)
    if (category) next.set('category', category)
    if (minimum !== undefined) next.set('minPrice', String(minimum))
    if (maximum !== undefined) next.set('maxPrice', String(maximum))
    if (sort !== 'newest') next.set('sort', sort)
    setSearchParams(next)
  }

  function updateSort(value) {
    setLoading(true)
    setError('')
    const next = new URLSearchParams(searchParams)
    next.set('sort', value)
    next.delete('page')
    setSearchParams(next)
  }

  function selectPage(nextPage) {
    setLoading(true)
    setError('')
    const next = new URLSearchParams(searchParams)
    if (nextPage === 1) next.delete('page')
    else next.set('page', String(nextPage))
    setSearchParams(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function clearFilters() {
    setFormError('')
    setLoading(true)
    setError('')
    setSearchParams({})
  }

  function retryProducts() {
    setLoading(true)
    setError('')
    setRetryKey((key) => key + 1)
  }

  const selectedCategory = categories.find((item) => item.slug === category || item._id === category)
  const resultLabel = search
    ? `Results for “${search}”`
    : selectedCategory?.name || 'All products'

  return (
    <div className="app-shell">
      <SiteHeader onSearch={onSearch} />
      <main className="catalog-page page-container">
        <div className="catalog-breadcrumb">
          <Link to="/">Home</Link><span>/</span><span>Shop</span>
          {selectedCategory && <><span>/</span><span>{selectedCategory.name}</span></>}
        </div>
        <div className="catalog-heading">
          <div>
            <p className="eyebrow">Take your time, find your thing</p>
            <h1>{resultLabel}</h1>
          </div>
          {!loading && !error && (
            <span className="catalog-count">
              {result.pagination.total} {result.pagination.total === 1 ? 'good find' : 'good finds'}
            </span>
          )}
        </div>

        <div className="catalog-layout">
          <aside className="catalog-sidebar">
            <form className="filter-form" onSubmit={applyFilters}>
              <div className="filter-group">
                <label htmlFor="catalog-search">Search</label>
                <div className="catalog-search-control">
                  <FiSearch aria-hidden="true" />
                  <input
                    id="catalog-search"
                    key={`search-${search}`}
                    maxLength={100}
                    name="search"
                    placeholder="What are you looking for?"
                    defaultValue={search}
                  />
                </div>
              </div>

              <div className="filter-group">
                <label htmlFor="catalog-category">Category</label>
                <select
                  id="catalog-category"
                  onChange={(event) => {
                    setLoading(true)
                    setError('')
                    const next = new URLSearchParams(searchParams)
                    if (event.target.value) next.set('category', event.target.value)
                    else next.delete('category')
                    next.delete('page')
                    setSearchParams(next)
                  }}
                  value={category}
                >
                  <option value="">All categories</option>
                  {categories.map((item) => (
                    <option key={item._id || item.slug} value={item.slug || item._id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                {categoriesError && <span className="filter-hint" role="status">{categoriesError}</span>}
              </div>

              <fieldset className="filter-group price-filter">
                <legend>Price range</legend>
                <div className="price-inputs">
                  <label>
                    <span className="sr-only">Minimum price</span>
                    <span aria-hidden="true">₹</span>
                    <input
                      key={`min-${minPriceParam}`}
                      inputMode="decimal"
                      min="0"
                      name="minPrice"
                      placeholder="Min"
                      type="number"
                      defaultValue={minPriceParam}
                    />
                  </label>
                  <span className="price-divider">to</span>
                  <label>
                    <span className="sr-only">Maximum price</span>
                    <span aria-hidden="true">₹</span>
                    <input
                      key={`max-${maxPriceParam}`}
                      inputMode="decimal"
                      min="0"
                      name="maxPrice"
                      placeholder="Max"
                      type="number"
                      defaultValue={maxPriceParam}
                    />
                  </label>
                </div>
              </fieldset>

              {formError && <p className="filter-error" role="alert">{formError}</p>}
              <button className="button button-dark filter-apply" type="submit">Apply filters</button>
              <button className="text-button filter-clear" onClick={clearFilters} type="button">Clear all filters</button>
            </form>
          </aside>

          <section aria-label="Product results" className="catalog-results">
            <div className="catalog-toolbar">
              <span>{loading ? 'Finding your next favorite…' : `Showing ${result.products.length} of ${result.pagination.total}`}</span>
              <label>
                <span>Sort by</span>
                <select aria-label="Sort products" onChange={(event) => updateSort(event.target.value)} value={sort}>
                  <option value="newest">Newest</option>
                  <option value="popular">Most popular</option>
                  <option value="rating">Top rated</option>
                  <option value="price-asc">Price: low to high</option>
                  <option value="price-desc">Price: high to low</option>
                  <option value="discount-desc">Highest discount</option>
                  <option value="discount-asc">Lowest discount</option>
                </select>
              </label>
            </div>

            {loading ? (
              <div aria-label="Loading products" className="catalog-product-grid">
                {Array.from({ length: 8 }, (_, index) => (
                  <div className="product-skeleton" key={index}>
                    <div className="skeleton product-skeleton-image" />
                    <div className="skeleton product-skeleton-line" />
                    <div className="skeleton product-skeleton-line short" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="empty-state catalog-state" role="alert">
                <FiBox aria-hidden="true" />
                <p>{error}</p>
                <button className="text-button" onClick={retryProducts} type="button">
                  Retry loading products
                </button>
              </div>
            ) : result.products.length === 0 ? (
              <div className="empty-state catalog-state">
                <FiBox aria-hidden="true" />
                <p>No products match those filters yet.</p>
                <button className="text-button" onClick={clearFilters} type="button">Clear filters and start again</button>
              </div>
            ) : (
              <div className="catalog-product-grid">
                {result.products.map((product, index) => (
                  <ProductCard index={index} key={product._id || product.slug} product={product} />
                ))}
              </div>
            )}

            {!loading && !error && result.pagination.totalPages > 1 && (
              <nav aria-label="Product pages" className="catalog-pagination">
                <button
                  aria-label="Previous page"
                  disabled={page <= 1}
                  onClick={() => selectPage(page - 1)}
                  type="button"
                >
                  <FiArrowLeft aria-hidden="true" /> Previous
                </button>
                <span>Page {page} of {result.pagination.totalPages}</span>
                <button
                  aria-label="Next page"
                  disabled={page >= result.pagination.totalPages}
                  onClick={() => selectPage(page + 1)}
                  type="button"
                >
                  Next <FiArrowRight aria-hidden="true" />
                </button>
              </nav>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

export default ProductsPage
