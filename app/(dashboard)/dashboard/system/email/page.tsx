import { Metadata } from 'next'
import { EmailScreen } from '@/features/system/email/EmailScreen'

export const metadata: Metadata = {
  title: 'Email | Beddora',
  description: 'See every email the system sent, and send failed ones again',
}

export default function SystemEmailPage() {
  return <EmailScreen />
}
