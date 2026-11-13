import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AuthContext from './authContext.js'
import {
  getCurrentUser,
  loginAccount,
  logoutAccount,
  registerAccount,
  updateAccountProfile,
} from '../services/api.js'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const requestId = useRef(0)

  const refreshUser = useCallback(async () => {
    const currentRequestId = ++requestId.current
    try {
      const currentUser = await getCurrentUser()
      if (currentRequestId !== requestId.current) return
      setUser(currentUser)
      setError('')
    } catch (error) {
      if (currentRequestId !== requestId.current) return
      if (error.response?.status !== 401) throw error
      setUser(null)
      setError('')
    } finally {
      if (currentRequestId === requestId.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const currentRequestId = ++requestId.current
    getCurrentUser()
      .then((currentUser) => {
        if (currentRequestId !== requestId.current) return
        setUser(currentUser)
        setError('')
      })
      .catch((error) => {
        if (currentRequestId !== requestId.current) return
        if (error.response?.status === 401) {
          setUser(null)
          setError('')
          return
        }
        setError('We could not verify your session. Check the API connection and refresh.')
      })
      .finally(() => {
        if (currentRequestId === requestId.current) setLoading(false)
      })

    return () => {
      if (currentRequestId === requestId.current) requestId.current += 1
    }
  }, [])

  const signIn = useCallback(async (credentials) => {
    const currentRequestId = ++requestId.current
    const currentUser = await loginAccount(credentials)
    if (currentRequestId !== requestId.current) return currentUser
    setUser(currentUser)
    setError('')
    setLoading(false)
    return currentUser
  }, [])

  const signUp = useCallback(async (credentials) => {
    const currentRequestId = ++requestId.current
    const currentUser = await registerAccount(credentials)
    if (currentRequestId !== requestId.current) return currentUser
    setUser(currentUser)
    setError('')
    setLoading(false)
    return currentUser
  }, [])

  const signOut = useCallback(async () => {
    const currentRequestId = ++requestId.current
    await logoutAccount()
    if (currentRequestId !== requestId.current) return
    setUser(null)
    setError('')
    setLoading(false)
  }, [])

  const saveProfile = useCallback(async (profile) => {
    const currentRequestId = ++requestId.current
    const currentUser = await updateAccountProfile(profile)
    if (currentRequestId !== requestId.current) return currentUser
    setUser(currentUser)
    setError('')
    return currentUser
  }, [])

  const value = useMemo(() => ({
    user,
    loading,
    error,
    refreshUser,
    signIn,
    signUp,
    signOut,
    saveProfile,
  }), [user, loading, error, refreshUser, signIn, signUp, signOut, saveProfile])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
