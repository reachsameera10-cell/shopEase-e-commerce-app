import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
  withCredentials: true,
})

export async function fetchCategories({ signal } = {}) {
  const { data } = await api.get('/categories', { signal })
  return data.categories
}

export async function fetchProducts(params = {}, { signal } = {}) {
  const { data } = await api.get('/products', { params, signal })
  return data.products
}

export async function fetchProductPage(params = {}, { signal } = {}) {
  const { data } = await api.get('/products', { params, signal })
  return data
}

export async function fetchProduct(idOrSlug, { signal } = {}) {
  const { data } = await api.get(`/products/${encodeURIComponent(idOrSlug)}`, { signal })
  return data.product
}

export async function fetchProductReviews(productId, params = {}, { signal } = {}) {
  const { data } = await api.get(`/reviews/${encodeURIComponent(productId)}`, { params, signal })
  return data
}

export async function getProductReviewEligibility(productId, { signal } = {}) {
  const { data } = await api.get(`/reviews/${encodeURIComponent(productId)}/eligibility`, { signal })
  return data
}

export async function submitProductReview(review) {
  const { data } = await api.post('/reviews', review)
  return data.review
}

export async function updateProductReview(reviewId, review) {
  const { data } = await api.put(`/reviews/${encodeURIComponent(reviewId)}`, review)
  return data.review
}

export async function deleteProductReview(reviewId) {
  const { data } = await api.delete(`/reviews/${encodeURIComponent(reviewId)}`)
  return data
}

export async function getCurrentUser() {
  const { data } = await api.get('/auth/me')
  return data.user
}

export async function registerAccount(credentials) {
  const { data } = await api.post('/auth/register', credentials)
  return data.user
}

export async function loginAccount(credentials) {
  const { data } = await api.post('/auth/login', credentials)
  return data.user
}

export async function requestPasswordReset(email) {
  const { data } = await api.post('/auth/forgot-password', { email })
  return data
}

export async function resetPassword(credentials) {
  const { data } = await api.post('/auth/reset-password', credentials)
  return data
}

export async function logoutAccount() {
  await api.post('/auth/logout')
}

export async function updateAccountProfile(profile) {
  const { data } = await api.patch('/auth/me', profile)
  return data.user
}

export async function getCheckoutConfig() {
  const { data } = await api.get('/orders/checkout/config')
  return data
}

export async function getCheckoutQuote(couponCode) {
  const { data } = await api.post('/orders/checkout/quote', couponCode ? { couponCode } : {})
  return data
}

export async function submitCheckout(checkout) {
  const { data } = await api.post('/orders/checkout', checkout)
  return data
}

export async function verifyCheckoutPayment(payment) {
  const { data } = await api.post('/orders/checkout/verify-payment', payment)
  return data
}

export async function markCheckoutPaymentFailed(orderId, razorpayPaymentId) {
  const { data } = await api.post('/orders/checkout/payment-failed', { orderId, razorpayPaymentId })
  return data
}

export async function getAdminDashboard() {
  const { data } = await api.get('/admin/dashboard')
  return data
}

export async function getAdminProducts(params = {}) {
  const { data } = await api.get('/admin/products', { params })
  return data
}

export async function saveAdminProduct(product, productId) {
  const request = productId
    ? api.put(`/admin/products/${encodeURIComponent(productId)}`, product)
    : api.post('/admin/products', product)
  const { data } = await request
  return data
}

export async function archiveAdminProduct(productId) {
  const { data } = await api.delete(`/admin/products/${encodeURIComponent(productId)}`)
  return data.product
}

export async function getAdminCategories() {
  const { data } = await api.get('/admin/categories')
  return data.categories
}

export async function saveAdminCategory(category, categoryId) {
  const request = categoryId
    ? api.put(`/admin/categories/${encodeURIComponent(categoryId)}`, category)
    : api.post('/admin/categories', category)
  const { data } = await request
  return data.category
}

export async function deactivateAdminCategory(categoryId) {
  const { data } = await api.delete(`/admin/categories/${encodeURIComponent(categoryId)}`)
  return data.category
}

export async function uploadAdminImage(file) {
  const body = new FormData()
  body.append('image', file)
  const { data } = await api.post('/admin/uploads', body)
  return data.image
}

export async function getAdminOrders(params = {}) {
  const { data } = await api.get('/admin/orders', { params })
  return data
}

export async function updateAdminOrderStatus(orderId, update) {
  const { data } = await api.put(`/admin/orders/${encodeURIComponent(orderId)}/status`, update)
  return data.order
}

export async function getAdminCustomers(params = {}) {
  const { data } = await api.get('/admin/customers', { params })
  return data
}

export async function getAdminReviews(params = {}) {
  const { data } = await api.get('/admin/reviews', { params })
  return data
}

export async function updateAdminReviewStatus(reviewId, status) {
  const { data } = await api.put(
    `/admin/reviews/${encodeURIComponent(reviewId)}/status`,
    { status },
  )
  return data.review
}

export async function getMyOrders(params = {}) {
  const { data } = await api.get('/orders/my-orders', { params })
  return data
}

export async function getMyOrder(orderId) {
  const { data } = await api.get(`/orders/${encodeURIComponent(orderId)}`)
  return data.order
}

export async function cancelMyOrder(orderId) {
  const { data } = await api.post(`/orders/${encodeURIComponent(orderId)}/cancel`)
  return data.order
}

export function getApiErrorMessage(error) {
  if (axios.isCancel(error) || error.code === 'ERR_CANCELED') {
    return 'Request cancelled'
  }

  if (error.response?.data?.message) {
    return error.response.data.message
  }

  if (error.code === 'ECONNABORTED') {
    return 'The store took too long to respond. Please try again.'
  }

  if (!error.response) {
    return 'We could not reach the store. Check that the API is running and try again.'
  }

  return 'Something went wrong while loading the store. Please try again.'
}
