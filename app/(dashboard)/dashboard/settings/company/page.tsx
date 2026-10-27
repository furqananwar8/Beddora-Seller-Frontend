import { Metadata } from 'next'
import { PageHeader } from '@/components/layout'
import { CompanyDetailsForm } from '@/features/settings/company/CompanyDetailsForm'

export const metadata: Metadata = {
  title: 'Company | Beddora',
  description: 'Your company name, address and contact, printed on generated documents',
}

/**
 * Company Page
 *
 * The organisation's letterhead details, used on purchase order PDFs.
 */
export default function CompanySettingsPage() {
  return (
    <div className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader title="Company" description="Your company name, address and contact, printed on purchase order PDFs" />
      <CompanyDetailsForm />
    </div>
  )
}
