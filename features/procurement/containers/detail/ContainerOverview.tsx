'use client'

import React from 'react'
import { Spinner } from '@/design-system/loaders'
import { useGetContainerDetailQuery, type ContainerDetail } from '@/services/api/procurement.api'
import { DocumentsPanel } from './DocumentsPanel'
import { PackedProductsPanel } from './PackedProductsPanel'
import { PaymentRequestsPanel } from './PaymentRequestsPanel'
import { PurchaseOrdersPanel } from './PurchaseOrdersPanel'

/** A container's panels: PO > packaging list > payments, then payment requests | documents | packed products. */
export const ContainerOverview: React.FC<{ container: ContainerDetail; canWrite: boolean }> = ({ container, canWrite }) => (
  <div className="flex flex-col gap-4">
    <PurchaseOrdersPanel container={container} />
    <div className="grid gap-4 lg:grid-cols-3">
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
