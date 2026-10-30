'use client'

import React from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useCancelShipmentMutation } from '@/services/api/shipping.api'
import type { ParcelShipmentListItem } from '../types'

interface CancelShipmentDialogProps {
  /** The shipment to void; null keeps the dialog closed. */
  shipment: Pick<ParcelShipmentListItem, 'id' | 'bookingNo' | 'providerLabel'> | null
  onClose: () => void
}

/** "Cancel / void" confirmation. The provider decides: voided at once, or pending its refund. */
export const CancelShipmentDialog: React.FC<CancelShipmentDialogProps> = ({ shipment, onClose }) => {
  const { success, failure } = useApiFeedback()
  const [cancel, { isLoading }] = useCancelShipmentMutation()

  const confirm = async () => {
    if (!shipment) return
    try {
      const result = await cancel(shipment.id).unwrap()
      success(result.status === 'VOID_PENDING' ? `${shipment.bookingNo}: void requested, refund pending` : `${shipment.bookingNo} voided`)
      onClose()
    } catch (error) {
      failure(error, `Could not void ${shipment.bookingNo}`)
    }
  }

  return (
    <ConfirmDialog isOpen={shipment !== null} title={`Cancel ${shipment?.bookingNo ?? 'shipment'}`} confirmLabel="Cancel / void label" tone="danger" busy={isLoading} onConfirm={() => void confirm()} onClose={onClose}>
      <p>
        The label is voided with {shipment?.providerLabel} and the charge is refunded to the provider balance. Don&apos;t hand the parcel over after this. A label already scanned by the carrier can&apos;t be voided.
      </p>
    </ConfirmDialog>
  )
}
