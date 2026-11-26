import { Metadata } from 'next'
import { MonitorScreen } from '@/features/system/monitor/MonitorScreen'

export const metadata: Metadata = {
  title: 'Jobs & Redis | Beddora',
  description: 'See the background jobs and what Redis is remembering, live',
}

export default function SystemMonitorPage() {
  return <MonitorScreen />
}
