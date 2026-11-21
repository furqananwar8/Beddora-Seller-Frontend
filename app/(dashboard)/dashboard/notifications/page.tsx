import { Metadata } from 'next'
import { NotificationsScreen } from '@/features/notifications'

export const metadata: Metadata = {
  title: 'Notifications | Beddora',
  description: 'Every notification sent to you, filterable by type, person and date',
}

export default function NotificationsPage() {
  return <NotificationsScreen />
}
