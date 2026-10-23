'use client'

import React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { Container } from '@/components/layout'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { useReportExport } from '@/hooks/useReportExport'
import { useGetBindingHistoryQuery, useGetSkuMappingOptionsQuery, type BindingVersion } from '@/services/api/skuMapping.api'
import { marketplaceName, SKU_MAPPING_ROUTES } from './constants'

const day = (iso: string) => format(new Date(iso), 'MMM d, yyyy HH:mm')
const recipe = (version: BindingVersion) =>
  version.components.length === 0 ? 'No components (unmapped)' : version.components.map((component) => `${component.sku} ×${component.quantity}`).join(' + ')

/** Binding history of one channel SKU: each version with its effective range, author, reason and components. */
export const BindingHistoryScreen: React.FC = () => {
  const params = useSearchParams()
  const channelId = params.get('channel') ?? 'amazon'
  const marketplace = params.get('marketplace') ?? ''
  const sku = params.get('sku') ?? ''
  const { data: channels = [] } = useGetSkuMappingOptionsQuery()
  const { data: versions = [], isLoading, isError } = useGetBindingHistoryQuery({ channel: channelId, marketplace, sku }, { skip: !marketplace || !sku })
  const channelName = channels.find((channel) => channel.id === channelId)?.name ?? channelId
  // Built by the export worker; the file downloads by itself when the server announces it over SSE
  const { start: startExport, isExporting } = useReportExport('sku-binding-history')

  return (
    <Container size="full" className="py-4 sm:py-8">
      <Link href={SKU_MAPPING_ROUTES.mapper} className="ds-button ds-button-outline ds-button-sm">
        Back
      </Link>

      <div className="mb-4 mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text-secondary">
            {channelName} · {marketplaceName(marketplace)} · binding history
          </p>
          <h1 className="font-mono text-xl font-bold text-text-primary sm:text-2xl">{sku || '—'}</h1>
        </div>
        <Button type="button" variant="outline" size="sm" className="h-10" disabled={versions.length === 0 || isExporting} onClick={() => void startExport('csv', { channel: channelId, marketplace, sku })}>
          {isExporting ? 'Exporting…' : 'Export audit CSV'}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : isError ? (
        <p className="py-16 text-center font-medium text-danger-600">Could not load the binding history.</p>
      ) : versions.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface py-16 text-center text-sm text-text-muted">This SKU has never been bound.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <ol className="space-y-3">
            {versions.map((version) => (
              <li key={version.version} className="rounded-lg border border-border bg-surface p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-bold text-text-primary">v{version.version}</span>
                  <StatusBadge label={version.effectiveTo ? 'Superseded' : 'Current'} tone={version.effectiveTo ? 'neutral' : 'info'} />
                  <span className="text-sm text-text-muted">
                    {day(version.effectiveFrom)} → {version.effectiveTo ? day(version.effectiveTo) : 'now'}
                  </span>
                </div>
                <p className="mt-2 font-mono text-sm text-text-primary">{recipe(version)}</p>
                <p className="mt-1 text-sm text-text-muted">
                  By {version.by}
                  {version.reason && <> · Reason: {version.reason}</>}
                </p>
              </li>
            ))}
          </ol>

          <aside className="h-fit rounded-lg border border-border bg-surface p-4 shadow-sm">
            <h2 className="font-semibold text-text-primary">Components by version</h2>
            <p className="mt-1 text-sm text-text-muted">What one unit sold deducted while each version was in force.</p>
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text-secondary">
                  <th className="py-2 font-semibold">Version</th>
                  <th className="py-2 font-semibold">Internal SKU</th>
                  <th className="py-2 text-right font-semibold">Units</th>
                </tr>
              </thead>
              <tbody>
                {[...versions].reverse().flatMap((version) =>
                  (version.components.length === 0 ? [null] : version.components).map((component) => (
                    <tr key={`${version.version}:${component?.productId ?? 'none'}`} className="border-b border-border last:border-0">
                      <td className="py-2">v{version.version}</td>
                      <td className="py-2 font-mono text-xs">{component?.sku ?? <span className="font-sans text-text-muted">Unmapped</span>}</td>
                      <td className="py-2 text-right tabular-nums">{component ? `×${component.quantity}` : '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </aside>
        </div>
      )}
    </Container>
  )
}
