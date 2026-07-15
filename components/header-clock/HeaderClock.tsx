'use client'

import React from 'react'
import { formatInTimeZone } from 'date-fns-tz'

const LA_TZ = 'America/Los_Angeles'

export const HeaderClock: React.FC = () => {
  const [now, setNow] = React.useState<Date | null>(null)

  React.useEffect(() => {
    setNow(new Date())
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  if (!now) return null 

  const formatted = formatInTimeZone(now, LA_TZ, 'EEE, MMM d, h:mm a zzz')

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-secondary">
      <svg
        className="w-4 h-4 text-text-muted shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span className="text-sm font-medium text-text-secondary whitespace-nowrap tabular-nums">
        {formatted}
      </span>
    </div>
  )
}