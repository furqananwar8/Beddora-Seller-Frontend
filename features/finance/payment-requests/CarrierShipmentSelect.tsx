'use client'

import React from 'react'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { useGetCarrierShipmentsQuery, type CarrierShipment } from '@/services/api/finance.api'

interface CarrierShipmentSelectProps {
  id?: string
  /** The carrier being paid; the shipments booked with it at the carrier step are offered. */
  partnerId: number | null
  value: CarrierShipment[]
  onChange: (shipments: CarrierShipment[]) => void
  error?: string
}

const labelOf = (shipment: CarrierShipment) => (shipment.name ? `${shipment.reference} · ${shipment.name}` : shipment.reference)

/** "Shipment No": one or more of the carrier's FBA shipments, which one invoice may cover together. */
export const CarrierShipmentSelect: React.FC<CarrierShipmentSelectProps> = ({ id, partnerId, value, onChange, error }) => {
  const { data = [], isFetching } = useGetCarrierShipmentsQuery({ partnerId: partnerId ?? 0 }, { skip: !partnerId })

  return (
    <SearchableSelect<CarrierShipment>
      id={id}
      multiple
      value={value}
      onChange={onChange}
      options={data}
      getKey={(shipment) => shipment.id}
      getLabel={labelOf}
      renderOption={(shipment) => (
        <span className="flex items-center justify-between gap-2">
          <span className="truncate font-medium">{labelOf(shipment)}</span>
          <span className="shrink-0 text-xs text-text-muted">{shipment.marketplace}</span>
        </span>
      )}
      renderValue={(picked) => picked.map((shipment) => shipment.reference).join(', ')}
      loading={isFetching}
      placeholder={partnerId ? 'Select shipments' : 'Pick the partner first'}
      searchPlaceholder="Shipment no. or name"
      emptyText="No shipments were booked with this carrier. Pick it as the carrier at the shipment’s carrier step first."
      error={error}
      disabled={!partnerId}
    />
  )
}
