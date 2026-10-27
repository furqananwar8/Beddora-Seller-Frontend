'use client'

import React from 'react'
import { Button } from '@/design-system/buttons'
import { usePoPdfDownload } from './usePoPdfDownload'

/** "Download PDF" for one purchase order. */
export const DownloadPoPdfButton: React.FC<{ purchaseOrderId: number }> = ({ purchaseOrderId }) => {
  const { download, isExporting } = usePoPdfDownload()
  return (
    <Button type="button" size="sm" variant="outline" isLoading={isExporting} onClick={() => download(purchaseOrderId)}>
      Download PDF
    </Button>
  )
}
