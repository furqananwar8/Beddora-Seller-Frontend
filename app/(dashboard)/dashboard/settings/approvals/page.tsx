import { Metadata } from 'next'
import { PageHeader } from '@/components/layout'
import { ApprovalsScreen } from '@/features/settings/approvals/ApprovalsScreen'

export const metadata: Metadata = {
  title: 'Approvals | Beddora',
  description: 'Who approves what, and the departments behind it',
}

/**
 * Approvals Page
 *
 * Build each action's chain of approvers, and manage the departments those chains point at.
 */
export default function ApprovalsSettingsPage() {
  return (
    <div className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader title="Approvals" description="Who approves what, and the departments behind it" />
      <ApprovalsScreen />
    </div>
  )
}
