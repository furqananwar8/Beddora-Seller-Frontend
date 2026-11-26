'use client'

import React from 'react'
import { Modal } from '@/design-system/modals'
import { numberOf, UNITS } from '../../create/shipmentForm'
import { INCOTERM_META } from '../../shippingMeta'
import type { ShipFromOption } from '../../types'
import { unitsLabel } from '../orderUnits'
import type { BulkRow } from './useBulkBook'

interface ParcelDetailsDialogProps {
  /** The booking whose parcel to show; null keeps the dialog closed. */
  row: BulkRow | null
  shipFrom: ShipFromOption | undefined
  onClose: () => void
}

/** "61×41×18 cm · 4.6 kg": the parcel as the Parcel column shows it. */
export function parcelText(row: BulkRow): string | null {
  const values = row.prepared?.values
  if (!values) return null
  if (row.packagesEach) return `${row.unitNos.length} packages`
  const { pkg, units } = values
  return `${pkg.length}×${pkg.width}×${pkg.height} ${UNITS[units].length.toLowerCase()} · ${pkg.weight} ${UNITS[units].weight.toLowerCase()}`
}

const Block: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="text-sm leading-6">
    <div className="text-xs font-medium uppercase tracking-wide text-text-muted">{title}</div>
    {children}
  </div>
)

/** What is in one booking's parcel: where it ships from and to, the package, and each product with its customs line. */
export const ParcelDetailsDialog: React.FC<ParcelDetailsDialogProps> = ({ row, shipFrom, onClose }) => {
  const values = row?.prepared?.values
  const to = values?.shipTo
  return (
    <Modal isOpen={row !== null} onClose={onClose} title={row ? `Parcel · ${row.ref.orderId} · ${unitsLabel(row.unitNos)}` : 'Parcel'} size="lg">
      {row && values && to && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Block title="Book from">
              {shipFrom ? (
                <>
                  <b>{shipFrom.label}</b>
                  <br />
                  {[shipFrom.addressLine1, shipFrom.addressLine2, `${shipFrom.city} ${shipFrom.stateOrProvinceCode ?? ''} ${shipFrom.postalCode}`, shipFrom.countryCode].filter(Boolean).join(', ')}
                </>
              ) : (
                <span className="text-text-muted">No ship-from picked</span>
              )}
            </Block>
            <Block title="To">
              <b>{to.name}</b> · {to.residential ? 'residential' : 'business'}
              <br />
              {[to.address1, to.address2, `${to.address.city} ${to.address.province} ${to.address.postalCode}`, to.address.country].filter(Boolean).join(', ')}
            </Block>
            <Block title="Package">
              <b>{parcelText(row)}</b>
              {row.packagesEach &&
                row.unitPackages &&
                row.unitNos.map((unitNo) => {
                  const one = row.unitPackages![unitNo]
                  return (
                    <span key={unitNo} className="block text-xs text-text-secondary">
                      Qty {unitNo}: {one.length}×{one.width}×{one.height} {UNITS[values.units].length.toLowerCase()} · {one.weight} {UNITS[values.units].weight.toLowerCase()}
                    </span>
                  )
                })}
              <br />
              <span className="text-text-muted">
                Quantity {row.unitNos.length} · {values.products.length} SKU{values.products.length === 1 ? '' : 's'}
              </span>
            </Block>
            <Block title="Options">
              {values.incoterm} ({INCOTERM_META[values.incoterm].description.toLowerCase()})
              <br />
              <span className="text-text-muted">{values.signature ? 'Signature required' : 'No signature'}</span>
            </Block>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary-50 text-left text-xs uppercase tracking-wide text-text-muted">
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">SKU</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2">HS code</th>
                  <th className="px-3 py-2">Origin</th>
                  <th className="px-3 py-2 text-right">Value each</th>
                </tr>
              </thead>
              <tbody>
                {values.products.map((line) => (
                  <tr key={line.product.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">
                      {line.product.name}
                      {line.product.variantName && <span className="text-text-muted"> · {line.product.variantName}</span>}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{line.product.sku ?? '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{numberOf(line.quantity) ?? line.quantity}</td>
                    <td className="px-3 py-2">{line.customs.hsCode || '—'}</td>
                    <td className="px-3 py-2">{line.customs.originCountry || '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {line.customs.unitValue} {line.customs.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  )
}
