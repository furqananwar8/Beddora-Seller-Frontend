'use client'

import React from 'react'
import { Alert } from '@/design-system/alerts'
import { Button } from '@/design-system/buttons'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useRetryChannelSyncMutation } from '@/services/api/shipping.api'
import type { ChannelSync, ParcelShipmentDto } from '../types'

interface ChannelSyncNoticeProps {
  shipmentId: number
  channelLabel: string
  sync: ChannelSync | null
  message: string | null
  /** The shipment as returned by a successful retry. */
  onRetried?: (shipment: ParcelShipmentDto) => void
  className?: string
}

/** Whether the booked order was marked shipped on its channel, with Retry when that failed. */
export const ChannelSyncNotice: React.FC<ChannelSyncNoticeProps> = ({ shipmentId, channelLabel, sync, message, onRetried, className }) => {
  const { success, failure } = useApiFeedback()
  const [retry, { isLoading }] = useRetryChannelSyncMutation()
  if (!sync) return null

  const retrySync = async () => {
    try {
      const shipment = await retry(shipmentId).unwrap()
      if (shipment.channelOrder?.sync === 'SENT') success(`Marked shipped on ${channelLabel}`)
      onRetried?.(shipment)
    } catch (error) {
      failure(error, `Could not mark the order shipped on ${channelLabel}`)
    }
  }

  switch (sync) {
    case 'SENT':
      return (
        <Alert variant="success" className={className}>
          Marked shipped on {channelLabel}
        </Alert>
      )
    case 'PENDING':
      return (
        <Alert variant="info" className={className}>
          Marking the order shipped on {channelLabel}…
        </Alert>
      )
    case 'SKIPPED':
      return (
        <div className={`rounded-lg border border-border bg-secondary-50 px-4 py-3 text-sm text-text-secondary ${className ?? ''}`}>
          Not marked shipped on {channelLabel}
          {message && `: ${message}`}
        </div>
      )
    case 'FAILED':
      return (
        <Alert variant="danger" className={`flex flex-wrap items-center justify-between gap-2 ${className ?? ''}`}>
          <span>
            Could not mark the order shipped on {channelLabel}
            {message && `: ${message}`}
          </span>
          <Button size="sm" variant="outline" onClick={() => void retrySync()} isLoading={isLoading}>
            Retry
          </Button>
        </Alert>
      )
  }
}
