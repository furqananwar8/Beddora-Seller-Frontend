'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FormField } from '@/components/form-field/FormField'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import type { PoProduct } from '@/services/api/procurement.api'
import { ProductSelect } from '../shared/ProductPicker'

/** "New price analysis": pick the product (a variation, or a product without variations), then quote it on its own page. */
export const NewAnalysisModal: React.FC<{ isOpen: boolean; onClose: () => void; hrefFor: (productId: number) => string }> = ({ isOpen, onClose, hrefFor }) => {
  const router = useRouter()
  const [product, setProduct] = useState<PoProduct | null>(null)

  const close = () => {
    setProduct(null)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={close} title="New price analysis" size="md" closeOnEscape className="sm:overflow-visible">
      <div className="flex flex-col gap-4">
        <FormField label="Product" htmlFor="pa-new-product" hint="A product that already has an analysis opens it instead">
          <ProductSelect id="pa-new-product" value={product} onChange={setProduct} />
        </FormField>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="button" disabled={!product} onClick={() => product && router.push(hrefFor(product.id))}>
            Continue
          </Button>
        </div>
      </div>
    </Modal>
  )
}
