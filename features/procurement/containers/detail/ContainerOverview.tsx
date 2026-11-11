'use client'

import React from 'react'
import { Spinner } from '@/design-system/loaders'
import { useGetContainerDetailQuery, type ContainerDetail } from '@/services/api/procurement.api'
import { ContainerCostSummary } from './ContainerCostSummary'
import { DocumentsPanel } from './DocumentsPanel'
import { PackedProductsPanel } from './PackedProductsPanel'
import { PaymentRequestsPanel } from './PaymentRequestsPanel'
import { PurchaseOrdersPanel } from './PurchaseOrdersPanel'

/**
 * A container's details: its landed cost on top (three cards and a row per SKU, for who may see cost analysis), then
 * the panels in one row, each a fixed-height summary with the full detail behind "More": purchase orders | payment
 * requests | documents | packaging list.
 */
export const ContainerOverview: React.FC<{ container: ContainerDetail; canWrite: boolean }> = ({ container, canWrite }) => (
  <div className="flex flex-col gap-4">
    <ContainerCostSummary container={container} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <PurchaseOrdersPanel container={container} />
      <PaymentRequestsPanel container={container} />
      <DocumentsPanel container={container} canWrite={canWrite} />
      <PackedProductsPanel container={container} />
    </div>
  </div>
)

/** The same panels under a row of the containers list; the details load when the row is opened. */
export const ContainerRowDetail: React.FC<{ containerId: number; canWrite: boolean }> = ({ containerId, canWrite }) => {
  const { data, isLoading, isError } = useGetContainerDetailQuery(containerId)
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    )
  }
  if (isError || !data) return <p className="py-6 text-center text-sm font-medium text-danger-600">Could not load this container&apos;s details.</p>
  return <ContainerOverview container={data} canWrite={canWrite} />
}
