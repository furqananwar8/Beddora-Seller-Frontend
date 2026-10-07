'use client'

import React from 'react'
import Link from 'next/link'
import { Container } from '@/components/layout'
import { RowActionsMenu } from '@/components/row-actions-menu/RowActionsMenu'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { formatCurrencyAmount } from '@/features/finance/shared/format'
import { useGetContainerDetailQuery } from '@/services/api/procurement.api'
import { formatCalendarDay } from '@/utils/format'
import { ContainerStatusBadge, DESTINATION_LABEL, containerLabel } from '../shared/poMeta'
import { ContainerOverview } from './detail/ContainerOverview'
import { Fact } from './detail/Panel'
import { useContainerActions } from './useContainerActions'

const LIST = '/dashboard/procurement/containers'
const date = (value: string | null) => (value ? formatCalendarDay(value) : '—')

/** One container: its details, then PO > packaging list > payments, and payment requests | documents | packed products side by side. */
export const ContainerDetailScreen: React.FC<{ containerId: number }> = ({ containerId }) => {
  const { data: container, isLoading, isError } = useGetContainerDetailQuery(containerId)
  const actions = useContainerActions()

  if (isLoading) {
    return (
      <Container size="full" className="flex justify-center py-16">
        <Spinner />
      </Container>
    )
  }
  if (isError || !container) {
    return (
      <Container size="full" className="py-16 text-center">
        <p className="font-medium text-text-primary">This container could not be found.</p>
        <Link href={LIST} className="mt-2 inline-block text-sm text-primary-600 hover:underline">
          Back to containers
        </Link>
      </Container>
    )
  }

  const notice =
    container.status === 'DELIVERED'
      ? `Delivered${container.deliveredAt ? ` on ${formatCalendarDay(container.deliveredAt)}` : ''}: nothing on this container can change any more; documents can still be added.`
      : container.status === 'IN_TRANSIT'
        ? 'In transit: only the ETA can change until it is delivered. Documents can still be added.'
        : null

  return (
    <Container size="full" className="py-4 sm:py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-mono text-xl font-bold text-text-primary sm:text-2xl">{containerLabel(container)}</h1>
              <ContainerStatusBadge status={container.status} />
              <StatusBadge label={DESTINATION_LABEL[container.destination]} tone="neutral" />
            </div>
            <p className="text-sm text-text-muted">{container.containerNumber ? `${container.containerNo} · ` : 'No container number yet · '}one packaging list per container</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={LIST} className="ds-button ds-button-outline ds-button-sm">
              All containers
            </Link>
            {actions.canWrite && container.status !== 'DELIVERED' && (
              <Button type="button" size="sm" onClick={() => actions.edit(container)}>
                Edit container
              </Button>
            )}
            <RowActionsMenu label={containerLabel(container)} items={actions.actionsFor(container, { onPage: true })} />
          </div>
        </div>

        {notice && <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">{notice}</p>}

        <section className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-surface p-4 shadow-sm sm:grid-cols-4 lg:grid-cols-8">
          <Fact label="ETD">{date(container.etd)}</Fact>
          <Fact label="ETA">{date(container.eta)}</Fact>
          <Fact label="Bill of lading">{container.billOfLading}</Fact>
          <Fact label="Master BOL">{container.masterBillOfLading}</Fact>
          <Fact label="Port of arrival">{container.portOfArrival}</Fact>
          <Fact label="Destination city">{[container.destinationCity, container.destinationProvince].filter(Boolean).join(', ') || null}</Fact>
          <Fact label="Total cost">{container.totalCost === null ? null : formatCurrencyAmount(container.currency, container.totalCost)}</Fact>
          <Fact label="Gross weight">{`${container.totals.grossWeightKg.toLocaleString('en-CA', { maximumFractionDigits: 1 })} kg`}</Fact>
        </section>

        <ContainerOverview container={container} canWrite={actions.canWrite} />
      </div>
      {actions.dialogs}
    </Container>
  )
}
