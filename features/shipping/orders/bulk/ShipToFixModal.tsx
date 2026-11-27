'use client'

import React, { useEffect, useMemo } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { ShipToSection } from '../../create/AddressStep'
import { addressOfShipTo } from '../../create/shipmentRequest'
import { shipToSchema, type ShipmentFormValues } from '../../create/shipmentSchema'
import type { ShipAddress } from '../../types'
import { shipToFrom } from '../orderDraft'

interface ShipToFixModalProps {
  /** The order's id and its ship-to as far as it is known; null while the modal is closed. */
  order: { orderId: string; shipTo: ShipAddress | null; shipToError: string | null } | null
  onSave: (address: ShipAddress) => void
  onClose: () => void
}

/**
 * Enters the customer's address for an order the marketplace withheld it from, without leaving the bulk page. It is
 * used for the bookings made from this page only (nothing is written back to the marketplace).
 */
export const ShipToFixModal: React.FC<ShipToFixModalProps> = ({ order, onSave, onClose }) => {
  // Whatever the order did give (city, postal code) stays; the US needs a state, so the province is required
  const schema = useMemo(() => z.object({ shipTo: shipToSchema({ crossBorder: false, toUs: false, needsProvince: true }) }), [])
  const form = useForm<Pick<ShipmentFormValues, 'shipTo'>>({ resolver: zodResolver(schema), defaultValues: { shipTo: shipToFrom(null) } })

  useEffect(() => {
    if (order) form.reset({ shipTo: shipToFrom(order.shipTo) })
  }, [order, form])

  const submit = form.handleSubmit((values) => {
    onSave(addressOfShipTo(values.shipTo))
    onClose()
  })

  return (
    <Modal isOpen={order !== null} onClose={onClose} title={`Customer address · ${order?.orderId ?? ''}`} size="lg">
      {/* ShipToSection reads the whole shipment form; this one holds only the ship-to part of it */}
      <FormProvider {...(form as unknown as ReturnType<typeof useForm<ShipmentFormValues>>)}>
        <form onSubmit={submit} noValidate className="space-y-4">
          {order?.shipToError && <p className="text-sm text-text-muted">{order.shipToError}</p>}
          <ShipToSection />
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Use this address</Button>
          </div>
        </form>
      </FormProvider>
    </Modal>
  )
}
