'use client'

import React, { useState } from 'react'
import { Button } from '@/design-system/buttons'
import { useGetProductImportCurrentQuery } from '@/services/api/procurement.api'
import { ProductImportModal } from './ProductImportModal'

/** Opens the Excel import. While one is running the label shows how far it is, so it is findable after leaving and coming back. */
export const ProductImportButton: React.FC = () => {
  const [open, setOpen] = useState(false)
  const { data: current } = useGetProductImportCurrentQuery()

  return (
    <>
      {/* Fixed width and equal-width digits, so the changing percentage never resizes the button */}
      <Button variant="secondary" size="sm" className="w-40 tabular-nums" onClick={() => setOpen(true)}>
        {current?.active ? `Importing… ${current.percent}%` : 'Import from Excel'}
      </Button>
      <ProductImportModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  )
}
