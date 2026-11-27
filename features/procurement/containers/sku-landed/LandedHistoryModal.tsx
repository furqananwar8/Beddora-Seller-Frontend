'use client'

import React from 'react'
import Link from 'next/link'
import { Modal } from '@/design-system/modals'
import { Spinner } from '@/design-system/loaders'
import { formatCurrencyAmount } from '@/features/finance/shared/format'
import { useGetSkuLandedHistoryQuery, type LandedAmounts } from '@/services/api/procurement.api'
import { formatCalendarDay } from '@/utils/format'
import { CONTAINER_ROUTES } from '../routes'

export interface LandedHistoryTarget {
  productId: number
  sku: string
  currency: keyof LandedAmounts
  /** The value the table shows (the day's figure). */
  current: number
}

interface LandedHistoryModalProps {
  target: LandedHistoryTarget | null
  onClose: () => void
}

/** How one SKU's landed cost got to its value: each day it changed, from what, and the containers it was worked out from. */
export const LandedHistoryModal: React.FC<LandedHistoryModalProps> = ({ target, onClose }) => {
  const { data, isFetching, isError } = useGetSkuLandedHistoryQuery(target ? { productId: target.productId, currency: target.currency } : { productId: 0, currency: 'CAD' }, { skip: !target })
  const money = (value: number) => formatCurrencyAmount(target?.currency ?? 'CAD', value)
  // Newest first: the latest change reads at the top
  const entries = [...(data?.entries ?? [])].reverse()
  return (
    <Modal isOpen={target !== null} onClose={onClose} title={`Landed cost history · ${target?.sku ?? ''} (${target?.currency ?? ''})`} size="md">
      <div className="flex flex-col gap-4 text-sm">
        <p className="text-text-secondary">
          Now <b className="tabular-nums text-text-primary">{target ? money(target.current) : ''}</b> per unit: the total of every counted container (goods plus expenses) divided by its units. It changes only when a container is added or its expenses change, and is carried forward until then.
        </p>
        {isFetching ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : isError ? (
          <p className="text-danger-600">Could not load the history.</p>
        ) : entries.length === 0 ? (
          <p className="text-text-muted">No history yet: this SKU has no container counted so far.</p>
        ) : (
          <ol className="flex max-h-[55vh] flex-col gap-3 overflow-y-auto border-l border-border pl-4">
            {entries.map((entry) => (
              <li key={entry.day} className="relative">
                <span className="absolute -left-[1.4rem] top-1.5 h-2 w-2 rounded-full bg-primary-600" aria-hidden />
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-semibold text-text-primary">{formatCalendarDay(entry.day)}</span>
                  <span className="tabular-nums text-text-primary">{money(entry.value)}</span>
                  <span className="text-xs text-text-muted">{entry.previous === null ? 'first value' : `updated from ${money(entry.previous)}`}</span>
                </div>
                {entry.containers.length > 0 && (
                  <p className="mt-0.5 text-xs text-text-muted">
                    From{' '}
                    {entry.containers.map((container, index) => (
                      <React.Fragment key={container.id}>
                        {index > 0 && ', '}
                        <Link href={CONTAINER_ROUTES.detail(container.id)} target="_blank" rel="noopener noreferrer" className="font-mono text-primary-600 underline-offset-2 hover:underline">
                          {container.containerNumber ?? `CID#${container.id}`}
                        </Link>
                      </React.Fragment>
                    ))}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
        {data?.lastSnapshotDay && <p className="text-xs text-text-muted">Read from the nightly snapshots, the latest of {formatCalendarDay(data.lastSnapshotDay)}.</p>}
      </div>
    </Modal>
  )
}
