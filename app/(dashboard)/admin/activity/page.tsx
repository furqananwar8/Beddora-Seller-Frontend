import { Metadata } from 'next'
import { ActivityScreen } from '@/features/admin-activity'

export const metadata: Metadata = {
  title: 'Activity Timeline | Beddora',
  description: 'Who did what, on which screen, day by day',
}

export default function ActivityPage() {
  return <ActivityScreen />
}
