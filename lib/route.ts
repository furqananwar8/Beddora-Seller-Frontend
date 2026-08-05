// lib/routes.ts
export const PUBLIC_ROUTES = ['/', '/login', '/invite'] as const
export const PROTECTED_ROUTE_PREFIXES = ['/dashboard'] as const
export const DEFAULT_PUBLIC_ROUTE = '/login' as const
export const DEFAULT_PROTECTED_ROUTE = '/dashboard/profit/dashboard' as const

export type PublicRoute = (typeof PUBLIC_ROUTES)[number]

export const isPublicRoute = (pathname: string): boolean => {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

export const isProtectedRoute = (pathname: string): boolean => {
  return PROTECTED_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}