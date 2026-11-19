'use client'

import React from 'react'
import type { ProductImport } from '@/services/api/procurement.api'

interface ImportProgressPanelProps {
  item: ProductImport
}

/** A running import: the bar and counters follow the server, so a reopened window shows where it really is. */
export const ImportProgressPanel: React.FC<ImportProgressPanelProps> = ({ item }) => (
  <div className="space-y-3 rounded-lg border border-border p-4">
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="min-w-0 truncate font-medium text-text-primary">{item.fileName}</span>
      <span className="shrink-0 font-semibold text-text-primary" aria-live="polite">
        {item.percent}%
      </span>
    </div>
    <div className="h-2.5 overflow-hidden rounded-full bg-secondary-200" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.percent} aria-label="Product import progress">
      <div className="h-full rounded-full bg-primary-600 transition-all duration-300" style={{ width: `${item.percent}%` }} />
    </div>
    <p className="text-sm text-text-secondary">
      {item.status === 'QUEUED' ? 'Waiting to start…' : `${item.processedProducts} of ${item.totalProducts} products processed`}
      {item.processedProducts > 0 && ` · ${item.createdProducts} created${item.failedProducts ? ` · ${item.failedProducts} skipped` : ''}`}
    </p>
    <p className="text-xs text-text-muted">You can close this window or leave the page; the import keeps running and you will be notified when it is done.</p>
  </div>
)
