import { Metadata } from 'next'
import { Container } from '@/components/layout'
import { OverviewTab } from '@/features/shipping/orders/overview/OverviewTab'

export const metadata: Metadata = {
  title: 'FBM Dashboard | Beddora',
  description: 'What to ship next, where FBM orders and parcels stand, and what shipping costs',
}

/** Shipping › FBM Dashboard: the numbers behind the Orders screen, each one a link into it. */
export default function FbmDashboardPage() {
  return (
    <Container size="full" className="py-4 sm:py-8">
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-text-primary sm:text-2xl">FBM Dashboard</h1>
        <OverviewTab />
      </div>
    </Container>
  )
}
