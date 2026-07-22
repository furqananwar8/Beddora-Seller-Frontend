// components/navigation/RouteGuard.tsx
'use client'

import React, { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAppSelector } from '@/store/hooks'
import { Logo } from '@/components/marketing'
import { isPublicRoute, DEFAULT_PUBLIC_ROUTE, DEFAULT_PROTECTED_ROUTE } from '@/lib/route'
import { Spinner } from '@/design-system/loaders'

type GuardState = 'checking' | 'allowed' | 'redirecting'

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const accessToken = useAppSelector((state) => state.auth.accessToken)
  const user = useAppSelector((state) => state.auth.user)
  const isAuthLoading = useAppSelector((state) => state.auth.isLoading)

  const [guardState, setGuardState] = useState<GuardState>('checking')

  const isAuthenticated = Boolean(accessToken && user)
  const isPublic = isPublicRoute(pathname)

  useEffect(() => {
    if (isAuthLoading) {
      setGuardState('checking')
      return
    }

    if (isPublic && isAuthenticated) {
      setGuardState('redirecting')
      router.replace(DEFAULT_PROTECTED_ROUTE)
      return
    }

    if (!isPublic && !isAuthenticated) {
      setGuardState('redirecting')
      router.replace(DEFAULT_PUBLIC_ROUTE)
      return
    }

    setGuardState('allowed')
  }, [isAuthLoading, isAuthenticated, isPublic, pathname, router])

    if (guardState !== 'allowed') {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-surface">
        <div className="mb-10">
            <Logo variant="dark" />
        </div>

        {/* Your Spinner component */}
        <Spinner className="mb-6" />

        {/* Message — smooth fade using transition */}
        <p
            className={`
            text-sm text-text-muted font-medium
            transition-all duration-500 ease-out
            ${guardState === 'checking' ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'}
            `}
        >
            {guardState === 'redirecting' ? 'Taking you there...' : 'Getting things ready...'}
        </p>
        </div>
    )
    }

  return <>{children}</>
}