import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const HIDDEN_ROUTES = [
  // Profit
  '/dashboard/profit/shipping-costs',
  '/dashboard/profit/indirect-expenses',
  '/dashboard/profit/variable-expenses',
  '/dashboard/profit/search-terms',
  '/dashboard/profit/ltv',
  '/dashboard/profit/cashflow',
  '/dashboard/profit/business-valuation',
  '/dashboard/profit/reports',

  // PPC
  '/dashboard/ppc/recommendations',
  '/dashboard/ppc/automation-log',

  // Inventory
  '/dashboard/inventory/purchase-orders',
  '/dashboard/inventory/reseller-workflow',
  '/dashboard/inventory/fba-shipments',
  '/dashboard/inventory/suppliers',

  // Autoresponder
  '/dashboard/autoresponder',
  '/dashboard/autoresponder/campaigns',
  '/dashboard/autoresponder/products',
  '/dashboard/autoresponder/orders',

  // Money Back
  '/dashboard/money-back',
  '/dashboard/money-back/lost-damaged',
  '/dashboard/money-back/returns',
  '/dashboard/money-back/fba-fee-changes',
  '/dashboard/money-back/reimbursement-gap',

  // eBay
  '/dashboard/ebay',
  '/dashboard/ebay/dashboard',
  '/dashboard/ebay/ltv',
  '/dashboard/ebay/products',
  '/dashboard/ebay/shipping-costs',
  '/dashboard/ebay/orders',
  '/dashboard/ebay/expenses',

  // Walmart
  '/dashboard/walmart',
  '/dashboard/walmart/dashboard',
  '/dashboard/walmart/ppc',
  '/dashboard/walmart/products',
  '/dashboard/walmart/shipping-costs',
  '/dashboard/walmart/pick-pack',
  '/dashboard/walmart/indirect-expenses',

  // Shopify
  '/dashboard/shopify',

  // QuickBooks
  '/dashboard/quickbooks',
  '/dashboard/quickbooks/settlements',
  '/dashboard/quickbooks/configuration',
  '/dashboard/quickbooks/connection',

  // Settings
  '/dashboard/settings/automation',
  '/dashboard/settings/tell-a-friend',
  '/dashboard/settings/billing',

  // Newly commented in your latest layout
  '/dashboard/repricer',
  '/dashboard/keyword-research',
]

export function middleware(request: NextRequest) {
  if (HIDDEN_ROUTES.includes(request.nextUrl.pathname)) {
    return NextResponse.rewrite(new URL('/_hidden', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}