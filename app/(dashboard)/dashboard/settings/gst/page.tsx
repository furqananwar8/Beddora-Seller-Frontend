import { Metadata } from 'next'
import { PageHeader } from '@/components/layout'
import { GstRatesScreen } from '@/features/settings/gst/GstRatesScreen'

export const metadata: Metadata = {
  title: 'GST | Beddora',
  description: 'GST percentages for payment requests',
}

/**
 * GST Page
 *
 * The percentages a payment request can pick when GST applies to it.
 */
export default function GstSettingsPage() {
  return (
    <div className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader title="GST" description="The GST percentages payment requests can use" />
      <GstRatesScreen />
    </div>
  )
}
