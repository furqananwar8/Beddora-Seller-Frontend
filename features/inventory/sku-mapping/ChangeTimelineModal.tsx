'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { Spinner } from '@/design-system/loaders'
import { Modal } from '@/design-system/modals'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import { useGetSkuTimelineQuery, type TimelineAction } from '@/services/api/skuMapping.api'
import { cn } from '@/utils/cn'
import type { PendingChange } from './bindingDraft'
import { SKU_MAPPING_ROUTES } from './constants'

type Scope = 'graph' | 'channel'

interface ChangeTimelineModalProps {
  isOpen: boolean
  onClose: () => void
  channel: { id: string; name: string }
  graphKeys: string[]
  pending: PendingChange[]
  /** Listing the "Full audit" link opens. */
  auditFor: { marketplace: string; sku: string } | null
}

const ACTION: Record<TimelineAction, { label: string; dot: string }> = {
  bound: { label: 'Bound', dot: 'bg-primary-600' },
  unbound: { label: 'Unbound', dot: 'bg-danger-600' },
  quantity: { label: 'Quantity changed', dot: 'bg-warning-500' },
}

const describe = ({ action, internalSku, from, to }: Pick<PendingChange, 'action' | 'internalSku' | 'from' | 'to'>) =>
  action === 'quantity' ? `${internalSku}: ×${from} → ×${to}` : `${internalSku} ×${action === 'bound' ? to : from}`

interface Row extends Pick<PendingChange, 'action' | 'internalSku' | 'from' | 'to' | 'channelSku'> {
  id: string
  at: string
  by: string
  version: number | null
}

/** Bind / unbind / quantity changes with time, user and version; unsaved ones first, highlighted. */
export const ChangeTimelineModal: React.FC<ChangeTimelineModalProps> = ({ isOpen, onClose, channel, graphKeys, pending, auditFor }) => {
  const [scope, setScope] = useState<Scope>('graph')
  const onGraph = scope === 'graph'
  const { data = [], isFetching, isError } = useGetSkuTimelineQuery(
    { channel: channel.id, keys: onGraph ? graphKeys : undefined },
    { skip: !isOpen || (onGraph && graphKeys.length === 0) }
  )

  const now = new Date().toISOString()
  const rows: Row[] = [
    ...pending.map((change, index) => ({ ...change, id: `p${index}`, at: now, by: 'You', version: null })),
    ...(onGraph && graphKeys.length === 0 ? [] : data).map((event, index) => ({ ...event, id: `s${index}` })),
  ]
  const pendingSkus = new Set(pending.map((change) => change.key)).size

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" closeOnEscape closeOnBackdropClick>
      {/* Right padding keeps "Full audit" clear of the modal's close button */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 pr-10">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-text-primary">Change timeline · {channel.name}</h2>
          <SegmentedToggle<Scope>
            ariaLabel="Timeline scope"
            value={scope}
            onChange={setScope}
            options={[
              { value: 'graph', label: 'On graph' },
              { value: 'channel', label: `Whole ${channel.name}` },
            ]}
          />
        </div>
        {auditFor && (
          <Link href={SKU_MAPPING_ROUTES.history(channel.id, auditFor.marketplace, auditFor.sku)} className="ds-button ds-button-outline ds-button-sm">
            Full audit →
          </Link>
        )}
      </div>

      <div className="max-h-[60vh] overflow-auto rounded-lg border border-border">
        <Table className="min-w-full">
          <TableHeader className="sticky top-0 z-10 bg-surface">
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Channel SKU</TableHead>
              <TableHead>Change</TableHead>
              <TableHead>By</TableHead>
              <TableHead>Version</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const unsaved = row.version === null
              return (
                <TableRow key={row.id} className={unsaved ? 'bg-warning-50/60' : undefined}>
                  <TableCell className="whitespace-nowrap tabular-nums">{format(new Date(row.at), 'MMM d, HH:mm')}</TableCell>
                  <TableCell className="whitespace-nowrap font-medium">
                    <span className="inline-flex items-center gap-2">
                      <span className={cn('h-2.5 w-2.5 rounded-full', ACTION[row.action].dot, unsaved && 'outline-dashed outline-1 outline-offset-2 outline-current')} aria-hidden />
                      {ACTION[row.action].label}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{row.channelSku}</TableCell>
                  <TableCell className="whitespace-nowrap">{describe(row)}</TableCell>
                  <TableCell>{row.by}</TableCell>
                  <TableCell>
                    {unsaved ? (
                      <span className="rounded bg-warning-100 px-1.5 py-0.5 text-xs font-semibold text-warning-700">Unsaved</span>
                    ) : (
                      <span className="rounded bg-secondary-100 px-1.5 py-0.5 font-mono text-xs">v{row.version}</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="flex justify-center py-10 text-sm text-text-muted">
                    {isFetching ? <Spinner /> : isError ? <span className="text-danger-600">Could not load the timeline.</span> : 'No binding changes yet.'}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-3 flex justify-between text-xs text-text-muted">
        <span>{pending.length > 0 ? `${pending.length} unsaved ${pending.length === 1 ? 'change' : 'changes'} on ${pendingSkus} ${pendingSkus === 1 ? 'SKU' : 'SKUs'}` : 'No unsaved changes'}</span>
        <span>Dashed markers = unsaved</span>
      </div>
    </Modal>
  )
}
