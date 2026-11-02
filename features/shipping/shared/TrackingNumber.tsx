'use client'

import React from 'react'
import { Copy, ExternalLink } from 'lucide-react'
import { useApiFeedback } from '@/hooks/useApiFeedback'

interface TrackingNumberProps {
  value: string | null
  /** The carrier's tracking page. */
  url?: string | null
  /** Keep the number and its copy button on one line (table cells). */
  nowrap?: boolean
}

/** The carrier's tracking page, opened in a new tab. */
export const CarrierPageLink: React.FC<{ url: string }> = ({ url }) => (
  <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-primary-600 hover:underline">
    Carrier page <ExternalLink className="h-3 w-3" aria-hidden />
  </a>
)

/** A tracking number with copy and, when known, a link to the carrier's page. */
export const TrackingNumber: React.FC<TrackingNumberProps> = ({ value, url, nowrap = false }) => {
  const { success, info } = useApiFeedback()
  if (!value) return <span className="text-text-muted">Not assigned yet</span>
  const copy = () =>
    navigator.clipboard.writeText(value).then(
      () => success('Tracking number copied'),
      () => info('Copy is blocked by the browser; select the number instead')
    )
  return (
    <span className={`inline-flex items-center gap-2 ${nowrap ? 'flex-nowrap whitespace-nowrap' : 'flex-wrap'}`}>
      <b className="font-mono">{value}</b>
      <button type="button" onClick={() => void copy()} aria-label="Copy tracking number" className="rounded p-1 text-text-muted hover:bg-secondary-100 hover:text-text-primary">
        <Copy className="h-4 w-4" />
      </button>
      {url && <CarrierPageLink url={url} />}
    </span>
  )
}
