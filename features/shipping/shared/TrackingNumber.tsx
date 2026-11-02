'use client'

import React from 'react'
import { Copy, ExternalLink } from 'lucide-react'
import { useApiFeedback } from '@/hooks/useApiFeedback'

interface TrackingNumberProps {
  value: string | null
  /** The carrier's tracking page. */
  url?: string | null
}

/** A tracking number with copy and, when known, a link to the carrier's page. */
export const TrackingNumber: React.FC<TrackingNumberProps> = ({ value, url }) => {
  const { success, info } = useApiFeedback()
  if (!value) return <span className="text-text-muted">Not assigned yet</span>
  const copy = () =>
    navigator.clipboard.writeText(value).then(
      () => success('Tracking number copied'),
      () => info('Copy is blocked by the browser; select the number instead')
    )
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <b className="font-mono">{value}</b>
      <button type="button" onClick={() => void copy()} aria-label="Copy tracking number" className="rounded p-1 text-text-muted hover:bg-secondary-100 hover:text-text-primary">
        <Copy className="h-4 w-4" />
      </button>
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline">
          Carrier page <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
      )}
    </span>
  )
}
