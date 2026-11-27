'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { numberOf, UNITS } from '../../create/shipmentForm'
import type { OrderRow } from './useBulkBook'
import type { PackageText } from './prepareOrder'
import { PackageWithCarton } from './SizeInputs'

interface PackageFixModalProps {
  /** The order whose package is incomplete; null while the modal is closed. */
  order: OrderRow | null
  onSave: (pkg: PackageText) => void
  onClose: () => void
}

const filled = (pkg: PackageText) => [pkg.length, pkg.width, pkg.height, pkg.weight].every((value) => (numberOf(value) ?? 0) > 0)

/** Types the carton size and weight a product lacks, for this order's bookings on this page (the product is not changed). */
export const PackageFixModal: React.FC<PackageFixModalProps> = ({ order, onSave, onClose }) => {
  const [pkg, setPkg] = useState<PackageText | null>(null)
  useEffect(() => setPkg(order?.prepared ? order.prepared.values.pkg : null), [order])
  const units = order?.prepared?.values.units ?? 'METRIC'
  return (
    <Modal isOpen={order !== null} onClose={onClose} title={`Package · ${order?.ref.orderId ?? ''}`} size="lg">
      <div className="space-y-4">
        <p className="text-sm text-text-muted">Carriers need the size and weight of the parcel. It is used for every booking of this order on this page. Dimensions in {UNITS[units].length.toLowerCase()}, weight in {UNITS[units].weight.toLowerCase()}.</p>
        {pkg && <PackageWithCarton pkg={pkg} units={units} name={order?.ref.orderId ?? 'order'} onChange={setPkg} />}
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!pkg || !filled(pkg)}
            onClick={() => {
              if (pkg) onSave(pkg)
              onClose()
            }}
          >
            Use this package
          </Button>
        </div>
      </div>
    </Modal>
  )
}
