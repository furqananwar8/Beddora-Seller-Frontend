import { Metadata } from 'next'
import { BankProfileScreen } from '@/features/finance/bank-profiles'

export const metadata: Metadata = {
  title: 'Bank Profile | Beddora',
  description: 'Company bank accounts and card payment links',
}

export default function BankProfilePage() {
  return <BankProfileScreen />
}
