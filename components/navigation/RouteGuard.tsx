'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAppSelector } from '@/store/hooks'
import { Logo } from '@/components/marketing'
import { isPublicRoute, DEFAULT_PUBLIC_ROUTE } from '@/lib/route'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { getRouteSubject, getRedirectRoute } from '@/lib/route-permissions'
import { Spinner } from '@/design-system/loaders'
import { Ability } from '@casl/ability'

type GuardState = 'checking' | 'allowed' | 'redirecting'

const DISABLED_ROUTE_PREFIXES = ['/dashboard/alerts']

function isDisabledRoute(pathname: string | null): boolean {
  if (!pathname) return false
  return DISABLED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
  )
}

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  const accessToken = useAppSelector((state) => state.auth.accessToken)
  const user = useAppSelector((state) => state.auth.user)
  const isAuthLoading = useAppSelector((state) => state.auth.isLoading)
  
  // Permissions come from persisted store or fresh API fetch
  const rules = useAppSelector((state) => state.permissions.rules)
  const permissionsLoaded = useAppSelector((state) => state.permissions.isLoaded)

  const ability = useMemo(() => new Ability(rules), [rules])
  const firstAllowedRoute = useMemo(() => getRedirectRoute(rules), [rules])

  const [guardState, setGuardState] = useState<GuardState>('checking')

  const isAuthenticated = Boolean(accessToken && user)
  const isPublic = isPublicRoute(pathname)

  useEffect(() => {
    // 1. Auth still hydrating (token refresh, localStorage read) → spinner
    if (isAuthLoading) {
      setGuardState('checking')
      return
    }

    // 2. Not authenticated
    if (!isAuthenticated) {
      // On a protected route → send to login
      if (!isPublic) {
        setGuardState('redirecting')
        router.replace(DEFAULT_PUBLIC_ROUTE)
      } else {
        // On a public route → allow
        setGuardState('allowed')
      }
      return
    }

    // 3. Authenticated but permissions not yet available
    //    (rules empty AND still fetching — happens on hard refresh before AuthInitializer finishes)
    if (isAuthenticated && rules.length === 0 && !permissionsLoaded) {
      setGuardState('checking')
      return
    }

    // 4. Authenticated + on a public route → redirect into app
    if (isPublic && isAuthenticated) {
      setGuardState('redirecting')
      router.replace(firstAllowedRoute || '/')
      return
    }

    // 5. Authenticated + on protected route → check CASL permission
    if (pathname) {
      const requiredSubject = getRouteSubject(pathname)

      // Route has a permission requirement and user lacks it
      if (requiredSubject && !ability.can('read', requiredSubject)) {
        setGuardState('redirecting')
        router.replace(firstAllowedRoute || DEFAULT_PUBLIC_ROUTE)
        return
      }
    }

    // 6. Hardcoded disabled routes (remove once CASL replaces these)
    if (isDisabledRoute(pathname)) {
      setGuardState('redirecting')
      router.replace(firstAllowedRoute || '/')
      return
    }

    // 7. All checks passed
    setGuardState('allowed')
  }, [
    isAuthLoading,
    isAuthenticated,
    isPublic,
    pathname,
    router,
    ability,
    rules.length,
    permissionsLoaded,
    firstAllowedRoute,
  ])

  if (guardState !== 'allowed') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface">
        <div className="mb-10">
          <Logo variant="dark" />
        </div>
        <Spinner />
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