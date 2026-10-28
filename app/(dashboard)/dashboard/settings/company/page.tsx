import { Metadata } from 'next'
import { Container, PageHeader } from '@/components/layout'
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
    <Container size="sm" className="space-y-6 py-8">
      <PageHeader title="Company" description="Your company name, address and contact, printed on purchase order PDFs" />
      <CompanyDetailsForm />
    </Container>
  )
}
