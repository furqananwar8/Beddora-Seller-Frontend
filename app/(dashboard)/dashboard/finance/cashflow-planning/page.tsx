import { Metadata } from 'next'
import { CashflowPlanningScreen } from '@/features/finance/cashflow-planning'

export const metadata: Metadata = {
  title: 'Cashflow Planning | Beddora',
  description: 'Payments recorded against payment invoices, per day, week or month',
}

export default function CashflowPlanningPage() {
  return <CashflowPlanningScreen />
}
