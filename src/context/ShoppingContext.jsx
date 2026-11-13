import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { api, getApiErrorMessage } from '../services/api.js'
import ShoppingContext from './shoppingContext.js'
import { useAuth } from '../hooks/useAuth.js'

const emptyShoppingData = { user: null, cart: null, wishlist: null, error: '' }

export function ShoppingProvider({ children }) {
  const { user } = useAuth()
  const [shoppingData, setShoppingData] = useState(emptyShoppingData)
  const [notice, setNotice] = useState('')
  const [noticeKey, setNoticeKey] = useState(0)
  const requestId = useRef(0)
  const activeUser = useRef(null)
  const userId = user?.id || null
  const hasData = Boolean(user && shoppingData.user === user)
  const cart = hasData ? shoppingData.cart : null
  const wishlist = hasData ? shoppingData.wishlist : null
  const loading = Boolean(userId && !hasData)

  const refreshShopping = useCallback(async () => {
    if (!user) return false
    const currentRequestId = ++requestId.current
    const [cartResponse, wishlistResponse] = await Promise.all([
      api.get('/cart'),
      api.get('/wishlist'),
    ])
    if (currentRequestId !== requestId.current || activeUser.current !== user) return false
    setShoppingData({
      user,
      cart: cartResponse.data,
      wishlist: wishlistResponse.data,
      error: '',
    })
    return true
  }, [user])

  useLayoutEffect(() => {
    activeUser.current = user
  }, [user])

  useEffect(() => {
    if (!userId) {
      requestId.current += 1
      return undefined
    }

    const refreshRequest = refreshShopping()
    const currentRequestId = requestId.current
    refreshRequest
      .catch((error) => {
        if (
          currentRequestId !== requestId.current
          || activeUser.current !== user
        ) return
        setShoppingData({
          user,
          cart: { items: [], itemCount: 0, subtotal: 0 },
          wishlist: { items: [] },
          error: getApiErrorMessage(error),
        })
      })
  }, [refreshShopping, user, userId])

  const runShoppingAction = useCallback(async (request, successMessage) => {
    if (!userId) {
      setNotice('Sign in to add items to your bag or wishlist.')
      setNoticeKey((key) => key + 1)
      return false
    }

    try {
      await request()
      if (activeUser.current !== user) return false
      await refreshShopping()
      if (activeUser.current !== user) return false
      setNotice(successMessage)
      setNoticeKey((key) => key + 1)
      return true
    } catch (error) {
      if (activeUser.current !== user) return false
      setNotice(getApiErrorMessage(error))
      setNoticeKey((key) => key + 1)
      return false
    }
  }, [refreshShopping, user, userId])

  const addToCart = useCallback((productId, quantity = 1) => runShoppingAction(
    () => api.post('/cart', { productId, quantity }),
    'Added to your bag.',
  ), [runShoppingAction])

  const updateCartQuantity = useCallback((productId, quantity) => runShoppingAction(
    () => api.put(`/cart/${encodeURIComponent(productId)}`, { quantity }),
    'Your bag has been updated.',
  ), [runShoppingAction])

  const removeFromCart = useCallback((productId) => runShoppingAction(
    () => api.delete(`/cart/${encodeURIComponent(productId)}`),
    'Removed from your bag.',
  ), [runShoppingAction])

  const clearCart = useCallback(() => runShoppingAction(
    () => api.delete('/cart'),
    'Your bag is now empty.',
  ), [runShoppingAction])

  const addToWishlist = useCallback((productId) => runShoppingAction(
    () => api.post('/wishlist', { productId }),
    'Saved to your wishlist.',
  ), [runShoppingAction])

  const removeFromWishlist = useCallback((productId) => runShoppingAction(
    () => api.delete(`/wishlist/${encodeURIComponent(productId)}`),
    'Removed from your wishlist.',
  ), [runShoppingAction])

  const moveWishlistItemToCart = useCallback(async (productId) => {
    await runShoppingAction(async () => {
      await api.post('/cart', { productId, quantity: 1 })
      await api.delete(`/wishlist/${encodeURIComponent(productId)}`)
    }, 'Moved to your bag.')
  }, [runShoppingAction])

  useEffect(() => {
    if (!notice) return undefined
    const timeout = window.setTimeout(() => setNotice(''), 3500)
    return () => window.clearTimeout(timeout)
  }, [notice, noticeKey])

  const value = useMemo(() => ({
    cart,
    wishlist,
    loading,
    error: hasData ? shoppingData.error : '',
    notice,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    addToWishlist,
    removeFromWishlist,
    moveWishlistItemToCart,
    refreshShopping,
  }), [
    cart,
    wishlist,
    loading,
    hasData,
    shoppingData.error,
    notice,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    addToWishlist,
    removeFromWishlist,
    moveWishlistItemToCart,
    refreshShopping,
  ])

  return <ShoppingContext.Provider value={value}>{children}</ShoppingContext.Provider>
}
