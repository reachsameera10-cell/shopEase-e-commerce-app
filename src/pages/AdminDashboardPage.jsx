import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FiAlertCircle,
  FiArrowUpRight,
  FiBox,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiGrid,
  FiImage,
  FiLayers,
  FiRefreshCw,
  FiShoppingBag,
  FiStar,
  FiUsers,
} from 'react-icons/fi'
import SiteFooter from '../components/SiteFooter.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import { getApiErrorMessage } from '../services/api.js'
import {
  archiveAdminProduct,
  deactivateAdminCategory,
  getAdminCategories,
  getAdminCustomers,
  getAdminDashboard,
  getAdminOrders,
  getAdminProducts,
  getAdminReviews,
  saveAdminCategory,
  saveAdminProduct,
  updateAdminOrderStatus,
  updateAdminReviewStatus,
  uploadAdminImage,
} from '../services/api.js'

const tabs = [
  { id: 'overview', label: 'Overview', icon: FiGrid },
  { id: 'products', label: 'Products', icon: FiBox },
  { id: 'categories', label: 'Categories', icon: FiLayers },
  { id: 'orders', label: 'Orders', icon: FiShoppingBag },
  { id: 'customers', label: 'Customers', icon: FiUsers },
  { id: 'reviews', label: 'Reviews', icon: FiStar },
]

const initialProductForm = {
  name: '',
  slug: '',
  description: '',
  brand: '',
  images: '',
  price: '',
  discountPrice: '',
  category: '',
  stock: '0',
  isFeatured: false,
  status: 'draft',
}

const initialCategoryForm = {
  name: '',
  slug: '',
  description: '',
  image: '',
  sortOrder: '0',
  isActive: true,
}

function formatPrice(price) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(price || 0)
}

function formatDate(date) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))
}

function toSlug(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function AdminDashboardPage({ onSearch }) {
  const [tab, setTab] = useState('overview')
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [data, setData] = useState(null)
  const [loadedKey, setLoadedKey] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [categories, setCategories] = useState([])
  const [productForm, setProductForm] = useState(initialProductForm)
  const [imageMetadata, setImageMetadata] = useState([])
  const [editingProductId, setEditingProductId] = useState('')
  const [productFormOpen, setProductFormOpen] = useState(false)
  const [categoryForm, setCategoryForm] = useState(initialCategoryForm)
  const [editingCategoryId, setEditingCategoryId] = useState('')
  const [categoryFormOpen, setCategoryFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const queryKey = `${tab}:${page}:${search}:${refreshKey}`
  const loading = loadedKey !== queryKey

  const loadData = useCallback(async () => {
    if (tab === 'overview') return getAdminDashboard()
    if (tab === 'products') return getAdminProducts({ page, limit: 20, search })
    if (tab === 'categories') return getAdminCategories()
    if (tab === 'orders') return getAdminOrders({ page, limit: 20, search })
    if (tab === 'customers') return getAdminCustomers({ page, limit: 20, search })
    return getAdminReviews({ page, limit: 20, search })
  }, [page, search, tab])

  useEffect(() => {
    let active = true
    loadData()
      .then((result) => {
        if (!active) return
        setData(result)
        setError('')
        setLoadedKey(queryKey)
      })
      .catch((requestError) => {
        if (!active) return
        setError(getApiErrorMessage(requestError))
        setLoadedKey(queryKey)
      })
    return () => {
      active = false
    }
  }, [loadData, queryKey])

  useEffect(() => {
    let active = true
    getAdminCategories()
      .then((result) => {
        if (active) setCategories(result.filter((category) => category.isActive))
      })
      .catch((requestError) => {
        if (active) setError(getApiErrorMessage(requestError))
      })
    return () => {
      active = false
    }
  }, [])

  function refresh() {
    setLoadedKey('')
    setRefreshKey((key) => key + 1)
  }

  function selectTab(nextTab) {
    setTab(nextTab)
    setPage(1)
    setSearch('')
    setSearchInput('')
    setError('')
    setNotice('')
  }

  function submitSearch(event) {
    event.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
    setLoadedKey('')
  }

  function beginProductEdit(product) {
    setEditingProductId(product._id)
    setImageMetadata(product.images.map(({ url, publicId }) => ({ url, publicId })))
    setProductForm({
      name: product.name,
      slug: product.slug,
      description: product.description,
      brand: product.brand || '',
      images: product.images.map((image) => image.url).join('\n'),
      price: String(product.price),
      discountPrice: product.discountPrice == null ? '' : String(product.discountPrice),
      category: product.category?._id || product.category,
      stock: String(product.stock),
      isFeatured: Boolean(product.isFeatured),
      status: product.status,
    })
    setProductFormOpen(true)
    setError('')
  }

  function resetProductForm() {
    setProductForm(initialProductForm)
    setImageMetadata([])
    setEditingProductId('')
    setProductFormOpen(false)
  }

  async function submitProduct(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    const images = productForm.images.split(/\r?\n/).map((url) => url.trim()).filter(Boolean)
    try {
      const result = await saveAdminProduct({
        ...productForm,
        images: images.map((url) => ({
          url,
          ...imageMetadata.find((image) => image.url === url),
        })),
        price: Number(productForm.price),
        discountPrice: productForm.discountPrice === '' ? null : Number(productForm.discountPrice),
        stock: Number(productForm.stock),
      }, editingProductId)
      resetProductForm()
      setNotice(result.warnings?.length
        ? result.warnings.join(' ')
        : editingProductId ? 'Product updated.' : 'Product created.')
      refresh()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  async function uploadImage(event) {
    const [file] = event.target.files || []
    event.target.value = ''
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const image = await uploadAdminImage(file)
      setImageMetadata((current) => [...current, image])
      setProductForm((current) => ({
        ...current,
        images: [current.images, image.url].filter(Boolean).join('\n'),
      }))
      setNotice('Image uploaded.')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setUploading(false)
    }
  }

  function beginCategoryEdit(category) {
    setEditingCategoryId(category._id)
    setCategoryForm({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      image: category.image || '',
      sortOrder: String(category.sortOrder || 0),
      isActive: category.isActive,
    })
    setCategoryFormOpen(true)
    setError('')
  }

  function resetCategoryForm() {
    setCategoryForm(initialCategoryForm)
    setEditingCategoryId('')
    setCategoryFormOpen(false)
  }

  async function submitCategory(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await saveAdminCategory({
        ...categoryForm,
        sortOrder: Number(categoryForm.sortOrder),
      }, editingCategoryId)
      resetCategoryForm()
      setNotice(editingCategoryId ? 'Category updated.' : 'Category created.')
      refresh()
      getAdminCategories().then((result) => setCategories(result.filter((category) => category.isActive)))
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  async function archiveProduct(product) {
    if (!window.confirm(`Archive "${product.name}"? It will no longer appear in the storefront.`)) return
    try {
      await archiveAdminProduct(product._id)
      setNotice('Product archived.')
      refresh()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    }
  }

  async function deactivateCategory(category) {
    if (!window.confirm(`Deactivate "${category.name}"?`)) return
    try {
      await deactivateAdminCategory(category._id)
      setNotice('Category deactivated.')
      refresh()
      getAdminCategories().then((result) => setCategories(result.filter((entry) => entry.isActive)))
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    }
  }

  async function changeReviewStatus(reviewId, status) {
    try {
      await updateAdminReviewStatus(reviewId, status)
      setNotice(`Review ${status}.`)
      refresh()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    }
  }

  const pagination = data?.pagination
  const selectedTab = tabs.find((entry) => entry.id === tab)

  return (
    <div className="app-shell">
      <SiteHeader onSearch={onSearch} />
      <main className="admin-page page-container">
        <div className="admin-heading">
          <div>
            <p className="eyebrow">ShopEase management</p>
            <h1>Admin dashboard</h1>
          </div>
          <button aria-label="Refresh dashboard" className="admin-refresh" onClick={refresh} type="button"><FiRefreshCw aria-hidden="true" /> Refresh</button>
        </div>

        <div className="admin-layout">
          <nav aria-label="Admin sections" className="admin-sidebar">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                aria-current={tab === id ? 'page' : undefined}
                className={tab === id ? 'is-active' : ''}
                key={id}
                onClick={() => selectTab(id)}
                type="button"
              >
                <Icon aria-hidden="true" />
                {label}
              </button>
            ))}
            <Link to="/" className="admin-store-link"><FiArrowUpRight aria-hidden="true" /> View storefront</Link>
          </nav>

          <section aria-labelledby="admin-section-heading" className="admin-content">
            <div className="admin-section-heading">
              <div>
                <p className="eyebrow">Manage your store</p>
                <h2 id="admin-section-heading">{selectedTab?.label}</h2>
              </div>
              {tab !== 'overview' && tab !== 'categories' && (
                <form className="admin-search" onSubmit={submitSearch} role="search">
                  <input
                    aria-label={`Search ${selectedTab?.label.toLowerCase()}`}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder={`Search ${selectedTab?.label.toLowerCase()}`}
                    value={searchInput}
                  />
                  <button className="button button-dark" type="submit">Search</button>
                </form>
              )}
              {tab === 'products' && (
                <button className="button button-dark admin-new-button" onClick={() => {
                  setEditingProductId('')
                  setProductForm(initialProductForm)
                  setProductFormOpen((open) => !open)
                }} type="button">Add product</button>
              )}
              {tab === 'categories' && (
                <button className="button button-dark admin-new-button" onClick={() => {
                  setEditingCategoryId('')
                  setCategoryForm(initialCategoryForm)
                  setCategoryFormOpen((open) => !open)
                }} type="button">Add category</button>
              )}
            </div>

            {error && <p className="form-error admin-error" role="alert">{error}</p>}
            {notice && <p className="admin-notice" role="status"><FiCheck aria-hidden="true" /> {notice}</p>}
            {loading ? (
              <div aria-label={`Loading ${selectedTab?.label.toLowerCase()}`} className="admin-loading">
                <div className="skeleton admin-skeleton" />
                <div className="skeleton admin-skeleton" />
              </div>
            ) : error && !data ? (
              <div className="empty-state admin-empty"><FiAlertCircle aria-hidden="true" /><p>We couldn't load this section.</p></div>
            ) : (
              <>
                {tab === 'overview' && <OverviewPanel data={data} />}
                {tab === 'products' && (
                  <>
                    {productFormOpen && (
                      <ProductForm
                        categories={categories}
                        editing={Boolean(editingProductId)}
                        form={productForm}
                        onCancel={resetProductForm}
                        onChange={setProductForm}
                        onSubmit={submitProduct}
                        onUpload={uploadImage}
                        saving={saving}
                        uploading={uploading}
                      />
                    )}
                    <ProductTable
                      onArchive={archiveProduct}
                      onEdit={beginProductEdit}
                      products={data?.products || []}
                    />
                  </>
                )}
                {tab === 'categories' && (
                  <>
                    {categoryFormOpen && (
                      <CategoryForm
                        editing={Boolean(editingCategoryId)}
                        form={categoryForm}
                        onCancel={resetCategoryForm}
                        onChange={setCategoryForm}
                        onSubmit={submitCategory}
                        saving={saving}
                      />
                    )}
                    <CategoryTable
                      categories={data?.categories || []}
                      onDeactivate={deactivateCategory}
                      onEdit={beginCategoryEdit}
                    />
                  </>
                )}
                {tab === 'orders' && (
                  <OrderTable orders={data?.orders || []} onUpdated={() => {
                    setNotice('Order status updated.')
                    refresh()
                  }} />
                )}
                {tab === 'customers' && <CustomerTable customers={data?.customers || []} />}
                {tab === 'reviews' && <ReviewTable onUpdate={changeReviewStatus} reviews={data?.reviews || []} />}
              </>
            )}

            {!loading && pagination?.pages > 1 && (
              <nav aria-label={`${selectedTab?.label} pages`} className="admin-pagination">
                <button disabled={page <= 1} onClick={() => {
                  setLoadedKey('')
                  setPage((current) => current - 1)
                }} type="button"><FiChevronLeft aria-hidden="true" /> Previous</button>
                <span>Page {page} of {pagination.pages} · {pagination.total} total</span>
                <button disabled={page >= pagination.pages} onClick={() => {
                  setLoadedKey('')
                  setPage((current) => current + 1)
                }} type="button">Next <FiChevronRight aria-hidden="true" /></button>
              </nav>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

function OverviewPanel({ data }) {
  const metrics = data?.metrics || {}
  const cards = [
    { label: 'Paid revenue', value: formatPrice(metrics.revenue), icon: FiArrowUpRight },
    { label: 'Orders', value: metrics.orders || 0, icon: FiShoppingBag },
    { label: 'Customers', value: metrics.customers || 0, icon: FiUsers },
    { label: 'Products', value: metrics.products || 0, icon: FiBox },
    { label: 'Categories', value: metrics.categories || 0, icon: FiLayers },
    { label: 'Pending reviews', value: metrics.reviewsPending || 0, icon: FiStar },
  ]
  const maxRevenue = Math.max(1, ...(data?.monthlyRevenue || []).map((entry) => entry.revenue))
  const months = useMemo(() => {
    const byMonth = new Map((data?.monthlyRevenue || []).map((entry) => [
      `${entry._id.year}-${entry._id.month}`,
      entry,
    ]))
    return Array.from({ length: 6 }, (_value, index) => {
      const date = new Date()
      date.setDate(1)
      date.setMonth(date.getMonth() - (5 - index))
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`
      return {
        key,
        label: new Intl.DateTimeFormat('en', { month: 'short' }).format(date),
        revenue: byMonth.get(key)?.revenue || 0,
      }
    })
  }, [data?.monthlyRevenue])

  return (
    <div className="admin-overview">
      <div className="admin-metric-grid">
        {cards.map(({ label, value, icon: Icon }) => (
          <article className="admin-metric-card" key={label}>
            <span className="admin-metric-icon"><Icon aria-hidden="true" /></span>
            <p>{label}</p>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <div className="admin-overview-grid">
        <section className="admin-panel">
          <p className="eyebrow">Paid orders only</p>
          <h3>Revenue · last 6 months</h3>
          <div aria-label="Monthly revenue chart" className="admin-revenue-chart">
            {months.map((month) => (
              <div className="admin-revenue-bar-group" key={month.key}>
                <span>{formatPrice(month.revenue)}</span>
                <div className="admin-revenue-bar-track">
                  <div className="admin-revenue-bar" style={{ height: `${month.revenue ? Math.max(5, month.revenue / maxRevenue * 100) : 0}%` }} />
                </div>
                <small>{month.label}</small>
              </div>
            ))}
          </div>
        </section>
        <section className="admin-panel">
          <p className="eyebrow">Needs attention</p>
          <h3>Low inventory</h3>
          {data?.lowStock?.length ? (
            <ul className="admin-low-stock">
              {data.lowStock.map((product) => (
                <li key={product._id}>
                  <Link to={`/products/${encodeURIComponent(product.slug)}`}>{product.name}</Link>
                  <span>{product.stock} left</span>
                </li>
              ))}
            </ul>
          ) : <p className="admin-muted">No products at low stock.</p>}
        </section>
      </div>
      <section className="admin-panel admin-recent-orders">
        <p className="eyebrow">Latest activity</p>
        <h3>Recent orders</h3>
        <OrderTable compact orders={data?.recentOrders || []} />
      </section>
    </div>
  )
}

function ProductForm({ categories, editing, form, onCancel, onChange, onSubmit, onUpload, saving, uploading }) {
  function setField(name, value) {
    onChange((current) => ({
      ...current,
      [name]: value,
      ...(name === 'name' && !editing ? { slug: toSlug(value) } : {}),
    }))
  }

  return (
    <form className="admin-editor-form" onSubmit={onSubmit}>
      <div className="admin-editor-heading"><h3>{editing ? 'Edit product' : 'New product'}</h3><span>Product details and inventory</span></div>
      <div className="admin-form-grid">
        <label>Product name<input maxLength={160} onChange={(event) => setField('name', event.target.value)} required value={form.name} /></label>
        <label>Slug<input maxLength={100} onChange={(event) => setField('slug', event.target.value)} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required value={form.slug} /></label>
        <label>Brand<input maxLength={100} onChange={(event) => setField('brand', event.target.value)} value={form.brand} /></label>
        <label>Category
          <select onChange={(event) => setField('category', event.target.value)} required value={form.category}>
            <option value="">Select category</option>
            {categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
          </select>
        </label>
        <label>Description<textarea maxLength={10000} onChange={(event) => setField('description', event.target.value)} required rows={4} value={form.description} /></label>
        <label>Images (one URL per line)
          <textarea maxLength={16000} onChange={(event) => setField('images', event.target.value)} placeholder="https://… or upload below" required rows={4} value={form.images} />
          <span className="admin-field-hint">Upload JPEG, PNG, or WebP (max 5 MB).</span>
        </label>
        <label className="admin-file-upload"><FiImage aria-hidden="true" />{uploading ? 'Uploading image…' : 'Upload image'}
          <input accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={onUpload} type="file" />
        </label>
        <label>Price (INR)<input min="0" onChange={(event) => setField('price', event.target.value)} required step="0.01" type="number" value={form.price} /></label>
        <label>Discount price (optional)<input min="0" onChange={(event) => setField('discountPrice', event.target.value)} step="0.01" type="number" value={form.discountPrice} /></label>
        <label>Stock<input min="0" onChange={(event) => setField('stock', event.target.value)} required step="1" type="number" value={form.stock} /></label>
        <label>Status<select onChange={(event) => setField('status', event.target.value)} value={form.status}><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select></label>
        <label className="admin-checkbox"><input checked={form.isFeatured} onChange={(event) => setField('isFeatured', event.target.checked)} type="checkbox" /> Featured product</label>
      </div>
      {form.images && <div className="admin-image-preview">{form.images.split(/\r?\n/).filter(Boolean).map((url) => <img alt="" key={url} src={url} />)}</div>}
      <div className="admin-form-actions">
        <button className="button button-dark" disabled={saving || uploading} type="submit">{saving ? 'Saving…' : editing ? 'Save changes' : 'Create product'}</button>
        <button className="admin-cancel-button" onClick={onCancel} type="button">Cancel</button>
      </div>
    </form>
  )
}

function ProductTable({ products, onArchive, onEdit }) {
  if (!products.length) return <div className="empty-state admin-empty"><FiBox aria-hidden="true" /><p>No products found.</p></div>
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {products.map((product) => (
            <tr key={product._id}>
              <td><div className="admin-product-cell"><img alt="" src={product.images?.[0]?.url} /><span><strong>{product.name}</strong><small>{product.slug}</small></span></div></td>
              <td>{product.category?.name || '—'}</td>
              <td>{formatPrice(product.discountPrice ?? product.price)}</td>
              <td className={product.stock <= 5 ? 'admin-low-stock-value' : ''}>{product.stock}</td>
              <td><span className={`admin-pill admin-pill-${product.status}`}>{product.status}</span></td>
              <td><div className="admin-row-actions"><button onClick={() => onEdit(product)} type="button">Edit</button>{product.status !== 'archived' && <button className="is-danger" onClick={() => onArchive(product)} type="button">Archive</button>}</div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CategoryForm({ editing, form, onCancel, onChange, onSubmit, saving }) {
  function setField(name, value) {
    onChange((current) => ({
      ...current,
      [name]: value,
      ...(name === 'name' && !editing ? { slug: toSlug(value) } : {}),
    }))
  }

  return (
    <form className="admin-editor-form" onSubmit={onSubmit}>
      <div className="admin-editor-heading"><h3>{editing ? 'Edit category' : 'New category'}</h3><span>Storefront category settings</span></div>
      <div className="admin-form-grid">
        <label>Name<input maxLength={80} onChange={(event) => setField('name', event.target.value)} required value={form.name} /></label>
        <label>Slug<input maxLength={100} onChange={(event) => setField('slug', event.target.value)} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required value={form.slug} /></label>
        <label>Description<input maxLength={500} onChange={(event) => setField('description', event.target.value)} value={form.description} /></label>
        <label>Image URL<input maxLength={2048} onChange={(event) => setField('image', event.target.value)} value={form.image} /></label>
        <label>Sort order<input min="0" onChange={(event) => setField('sortOrder', event.target.value)} step="1" type="number" value={form.sortOrder} /></label>
        <label className="admin-checkbox"><input checked={form.isActive} onChange={(event) => setField('isActive', event.target.checked)} type="checkbox" /> Active on storefront</label>
      </div>
      <div className="admin-form-actions">
        <button className="button button-dark" disabled={saving} type="submit">{saving ? 'Saving…' : editing ? 'Save changes' : 'Create category'}</button>
        <button className="admin-cancel-button" onClick={onCancel} type="button">Cancel</button>
      </div>
    </form>
  )
}

function CategoryTable({ categories, onDeactivate, onEdit }) {
  if (!categories.length) return <div className="empty-state admin-empty"><FiLayers aria-hidden="true" /><p>No categories found.</p></div>
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead><tr><th>Category</th><th>Slug</th><th>Order</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{categories.map((category) => (
          <tr key={category._id}>
            <td>{category.name}</td><td>{category.slug}</td><td>{category.sortOrder}</td>
            <td><span className={`admin-pill ${category.isActive ? 'admin-pill-active' : 'admin-pill-archived'}`}>{category.isActive ? 'Active' : 'Inactive'}</span></td>
            <td><div className="admin-row-actions"><button onClick={() => onEdit(category)} type="button">Edit</button>{category.isActive && <button className="is-danger" onClick={() => onDeactivate(category)} type="button">Deactivate</button>}</div></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

function OrderTable({ orders, onUpdated, compact = false }) {
  if (!orders.length) return <div className="empty-state admin-empty"><FiShoppingBag aria-hidden="true" /><p>No orders found.</p></div>
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th><th>{compact ? 'Placed' : 'Update'}</th></tr></thead>
        <tbody>{orders.map((order) => <OrderRow key={order._id} compact={compact} onUpdated={onUpdated} order={order} />)}</tbody>
      </table>
    </div>
  )
}

function OrderRow({ order, compact, onUpdated }) {
  const nextStatus = {
    confirmed: ['processing'],
    processing: ['shipped'],
    shipped: ['delivered'],
  }[order.status] || []
  if (order.status === 'delivered' && order.paymentMethod === 'cod' && order.paymentStatus !== 'paid') {
    nextStatus.push('delivered')
  }
  const [status, setStatus] = useState(nextStatus[0] || '')
  const [cashCollected, setCashCollected] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function updateStatus() {
    setSaving(true)
    setError('')
    try {
      await updateAdminOrderStatus(order._id, { status, cashCollected })
      onUpdated()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <tr>
      <td><strong>{order.orderNumber}</strong><small className="admin-cell-subtitle">{formatDate(order.createdAt)}</small></td>
      <td>{order.user?.name || 'Customer'}<small className="admin-cell-subtitle">{order.user?.email || ''}</small></td>
      <td>{formatPrice(order.total)}</td>
      <td>{order.paymentMethod}<small className="admin-cell-subtitle">{order.paymentStatus}</small></td>
      <td><span className={`admin-pill admin-pill-${order.status}`}>{order.status}</span></td>
      <td>
        {compact ? <span className="admin-cell-subtitle">{formatDate(order.createdAt)}</span> : nextStatus.length ? (
          <div className="admin-status-editor">
            <select aria-label={`Next status for ${order.orderNumber}`} onChange={(event) => setStatus(event.target.value)} value={status}>
              {nextStatus.map((next) => <option key={next} value={next}>{next}</option>)}
            </select>
            {status === 'delivered' && order.paymentMethod === 'cod' && order.paymentStatus !== 'paid' && (
              <label className="admin-cash-check"><input checked={cashCollected} onChange={(event) => setCashCollected(event.target.checked)} type="checkbox" /> Cash received</label>
            )}
            <button disabled={saving || !status} onClick={updateStatus} type="button">{saving ? 'Saving' : 'Update'}</button>
            {error && <span className="admin-inline-error">{error}</span>}
          </div>
        ) : <span className="admin-cell-subtitle">No further status</span>}
      </td>
    </tr>
  )
}

function CustomerTable({ customers }) {
  if (!customers.length) return <div className="empty-state admin-empty"><FiUsers aria-hidden="true" /><p>No customers found.</p></div>
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead><tr><th>Customer</th><th>Phone</th><th>Orders</th><th>Joined</th><th>Account</th></tr></thead>
        <tbody>{customers.map((customer) => (
          <tr key={customer._id}>
            <td><strong>{customer.name}</strong><small className="admin-cell-subtitle">{customer.email}</small></td>
            <td>{customer.phone || '—'}</td><td>{customer.orderCount}</td>
            <td>{formatDate(customer.createdAt)}</td>
            <td><span className={`admin-pill ${customer.isActive ? 'admin-pill-active' : 'admin-pill-archived'}`}>{customer.isActive ? 'Active' : 'Inactive'}</span></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

function ReviewTable({ reviews, onUpdate }) {
  if (!reviews.length) return <div className="empty-state admin-empty"><FiStar aria-hidden="true" /><p>No reviews found.</p></div>
  return (
    <div className="admin-review-list">
      {reviews.map((review) => (
        <article className="admin-review-card" key={review._id}>
          <div className="admin-review-heading">
            <div><strong>{review.product?.name || 'Product removed'}</strong><span> by {review.user?.name || 'Customer'} · {formatDate(review.createdAt)}</span></div>
            <span className={`admin-pill admin-pill-${review.status}`}>{review.status}</span>
          </div>
          <div className="admin-review-rating">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)} <span>{review.rating}/5</span></div>
          {review.title && <h4>{review.title}</h4>}
          <p>{review.comment}</p>
          {review.verifiedPurchase && <span className="admin-verified-purchase">Verified purchase</span>}
          {review.status !== 'approved' && <button className="admin-review-approve" onClick={() => onUpdate(review._id, 'approved')} type="button">Approve</button>}
          {review.status !== 'rejected' && <button className="admin-review-reject" onClick={() => onUpdate(review._id, 'rejected')} type="button">Reject</button>}
        </article>
      ))}
    </div>
  )
}

export default AdminDashboardPage
