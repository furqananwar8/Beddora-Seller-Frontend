'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState } from '@/store/store'
import { setAmazonSession, clearAmazonSession, setAmazonAuthLoading } from "@/store/amazon.slice"

interface AuthState {
  isConnected: boolean
  isLoading: boolean
  showAuthModal: boolean
  checkConnection: () => Promise<void>
  handleAuthSuccess: () => void
  setShowAuthModal: (show: boolean) => void
}

export function useAmazonAuth(): AuthState {
  const dispatch = useDispatch()
  const amazon = useSelector((state: RootState) => state.amazon)
  const [showAuthModal, setShowAuthModal] = useState(false)

  const checkConnection = useCallback(async () => {
    // No sessionId in Redux store → show connect modal
    if (!amazon.sessionId) {
      dispatch(setAmazonAuthLoading(false))
      setShowAuthModal(true)
      return
    }

    dispatch(setAmazonAuthLoading(true))
    try {
      // Validate session via Next.js API route (passes sessionId to backend)
      const res = await fetch(
        `/api/amazon/advertising/me?sessionId=${encodeURIComponent(amazon.sessionId)}`
      )

      if (!res.ok) {
        throw new Error('Validation failed')
      }

      const json = await res.json()
      const connected = json?.data?.connected === true

      if (connected) {
        dispatch(setAmazonSession({ isConnected: true }))
        setShowAuthModal(false)
      } else {
        dispatch(clearAmazonSession())
        setShowAuthModal(true)
      }
    } catch {
      dispatch(clearAmazonSession())
      setShowAuthModal(true)
    } finally {
      dispatch(setAmazonAuthLoading(false))
    }
  }, [amazon.sessionId, dispatch])

  useEffect(() => {
    checkConnection()
  }, [checkConnection])

  const handleAuthSuccess = useCallback(() => {
    // Callback page already dispatched sessionId into Redux.
    // Re-run validation to confirm tokens are valid in Redis.
    checkConnection()
  }, [checkConnection])

  return {
    isConnected: amazon.isConnected,
    isLoading: amazon.isLoadingAuth,
    showAuthModal,
    checkConnection,
    handleAuthSuccess,
    setShowAuthModal,
  }
}