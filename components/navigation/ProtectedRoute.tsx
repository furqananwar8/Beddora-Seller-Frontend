'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppSelector } from '@/store/hooks'

/**
 * Protected route component
 * Redirects to login if user is not authenticated
 * 
 * Usage:
 * <ProtectedRoute>
 *   <YourComponent />
 * </ProtectedRoute>
 */
export interface ProtectedRouteProps {
  children: React.ReactNode
  requireEmailVerification?: boolean
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireEmailVerification = true,
}) => {
  const router = useRouter()
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated)
  const user = useAppSelector((state) => state.auth.user)
  const isLoading = useAppSelector((state) => state.auth.isLoading)

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.push('/login')
      return
    }

    if (!isLoading && requireEmailVerification && user && !user.isVerified) {
      router.push('/verify-email')
      return
    }
  }, [isAuthenticated, isLoading, user, requireEmailVerification, router])

  if (!isAuthenticated || isLoading) {
    return null
  }

  if (requireEmailVerification && user && !user.isVerified) {
    return null
  }

  return <>{children}</>
}
