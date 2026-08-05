export interface RoutePermission {
  pattern: string
  subject: string
}

/**
 * Longest-match first. Exact routes are checked before prefixes
 * so /dashboard/profit/products matches profit:products, not profit.
 */
export const ROUTE_PERMISSIONS: RoutePermission[] = [
  // Profit
  { pattern: '/dashboard/profit/dashboard', subject: 'profit:dashboard' },
  { pattern: '/dashboard/profit/products', subject: 'profit:products' },
  { pattern: '/dashboard/profit', subject: 'profit' },

  // PPC
  { pattern: '/dashboard/ppc/dashboard', subject: 'ppc' },
  { pattern: '/dayparting', subject: 'ppc:dayparting' },
  { pattern: '/dashboard/ppc', subject: 'ppc' },

  // Inventory
  { pattern: '/dashboard/inventory/planner', subject: 'inventory:planner' },
  { pattern: '/dashboard/inventory', subject: 'inventory' },

  // Breakeven
  { pattern: '/breakeven-analysis', subject: 'breakeven-analysis' },

  // Alerts
  { pattern: '/dashboard/alerts/dashboard', subject: 'alerts:dashboard' },
  { pattern: '/dashboard/alerts/settings', subject: 'alerts:settings' },
  { pattern: '/dashboard/alerts', subject: 'alerts' },

  // Settings
  { pattern: '/dashboard/settings/general', subject: 'settings:general' },
  { pattern: '/dashboard/settings/users', subject: 'settings:users' },
  { pattern: '/dashboard/settings', subject: 'settings' },
]

export function getRouteSubject(pathname: string): string | null {
  const match = ROUTE_PERMISSIONS
    .filter((r) => pathname === r.pattern || pathname.startsWith(r.pattern + '/'))
    .sort((a, b) => b.pattern.length - a.pattern.length)[0]

  return match?.subject ?? null
}

/**
 * Maps permission subjects to their actual application routes.
 * Order matters — the first match wins when picking a fallback redirect.
 */
export const SUBJECT_ROUTE_MAP: Record<string, string> = {
  'profit:dashboard': '/dashboard/profit/dashboard',
  'profit:products': '/dashboard/profit/products',
  'ppc:dayparting': '/dayparting',
  'inventory:planner': '/dashboard/inventory/planner',
  'breakeven-analysis:sku-wise': '/breakeven-analysis',
  'alerts:dashboard': '/dashboard/alerts/dashboard',
  'alerts:settings': '/dashboard/alerts/settings',
  'settings:general': '/dashboard/settings/general',
  'settings:users': '/dashboard/settings/users',
}

/**
 * Given a user's permissions array, return the best redirect route.
 * Checks the default route first, then falls back to the first allowed route.
 */
export function getRedirectRoute(
  permissions: Array<{ action: string; subject: string }>
): string {
  const subjects = new Set(permissions.map((p) => p.subject))
  const defaultRoute = '/dashboard/profit/dashboard'

  // If the default route is allowed, use it
  if (subjects.has('profit:dashboard')) {
    return defaultRoute
  }

  // Otherwise pick the first allowed route in priority order
  for (const [subject, route] of Object.entries(SUBJECT_ROUTE_MAP)) {
    if (subjects.has(subject)) {
      return route
    }
  }

  // Ultimate fallback: first route in the map (guaranteed to exist)
  return Object.values(SUBJECT_ROUTE_MAP)[0]
}