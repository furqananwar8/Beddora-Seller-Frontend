'use client'

import { useState, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState } from '@/store/store'
import { setAmazonSession, clearAmazonSession } from "@/store/amazon.slice"

interface AuthState {
  isConnected: boolean
  isLoading: boolean
  showAuthModal: boolean
  handleAuthSuccess: () => void
  handleAuthError: () => void
  setShowAuthModal: (show: boolean) => void
}

export function useAmazonAuth(): AuthState {
  const dispatch = useDispatch()
  const amazon = useSelector((state: RootState) => state.amazon)
  const [showAuthModal, setShowAuthModal] = useState(false)

  const handleAuthSuccess = useCallback(() => {
    dispatch(setAmazonSession({ isConnected: true }))
    setShowAuthModal(false)
  }, [dispatch])

  const handleAuthError = useCallback(() => {
    dispatch(clearAmazonSession())
    setShowAuthModal(true)
  }, [dispatch])

  return {
    isConnected: amazon.isConnected,
    isLoading: false,
    showAuthModal,
    handleAuthSuccess,
    handleAuthError,
    setShowAuthModal,
  }
}