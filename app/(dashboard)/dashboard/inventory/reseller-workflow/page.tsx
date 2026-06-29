import { Metadata } from 'next'
import { ResellerWorkflowScreen } from '@/features/inventory/ResellerWorkflowScreen'

export const metadata: Metadata = {
  title: 'Reseller Workflow | Beddora',
  description: 'Manage your reseller workflow batches, scan products, and create FBA shipments',
}

/**
 * Reseller Workflow Page
 * 
 * Main page for reseller workflow management
 */
export default function ResellerWorkflowPage() {
  return <ResellerWorkflowScreen />
}
