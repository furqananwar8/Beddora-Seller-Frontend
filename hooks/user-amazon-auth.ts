'use client'

import { useEffect, useState, useCallback } from 'react'

interface AuthState {
  isConnected: boolean
  isLoading: boolean
  showAuthModal: boolean
  checkConnection: () => Promise<void>
  handleAuthSuccess: () => void
  setShowAuthModal: (show: boolean) => void
}

export function useAmazonAuth(): AuthState {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)

  const checkConnection = useCallback(async () => {
    try {
      const res = await fetch('/api/amazon/advertising/me', {
        credentials: 'include',
      })

      if (!res.ok) {
        setIsConnected(false)
        setShowAuthModal(true)
        return
      }

      const { data } = await res.json()
      const connected = data?.connected === true
      setIsConnected(connected)

      if (!connected) {
        setShowAuthModal(true)
      }
    } catch {
      setIsConnected(false)
      setShowAuthModal(true)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    checkConnection()
  }, [checkConnection])

  const handleAuthSuccess = () => {
    setShowAuthModal(false)
    setIsConnected(true)
    checkConnection()
  }

  return {
    isConnected,
    isLoading,
    showAuthModal,
    checkConnection,
    handleAuthSuccess,
    setShowAuthModal,
  }
}