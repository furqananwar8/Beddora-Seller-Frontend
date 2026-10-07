'use client'

import React from 'react'
import Link from 'next/link'
import type { ContainerDetail } from '@/services/api/procurement.api'
import { supplierNames } from '../../shared/poMeta'
import { formatDimensions } from '../../shared/units'
import { Fact, Panel, PanelEmpty } from './Panel'

const qty = (value: number) => value.toLocaleString('en-CA')
const kg = (value: number) => `${value.toLocaleString('en-CA', { maximumFractionDigits: 1 })} kg`

/** The packaging list's products, one card per SKU with what is packed and how (cartons, carton size, CBM, weight). */
export const PackedProductsPanel: React.FC<{ container: ContainerDetail }> = ({ container }) => {
  const list = container.packagingList
  return (
    <Panel
      title="Packaging list"
      count={container.lines.length}
      action={
        list ? (
          <Link href={`/dashboard/procurement/packaging-lists/${list.id}`} className="font-mono text-xs font-semibold text-primary-600 underline-offset-2 hover:underline">
            {list.plNo}
          </Link>
        ) : null
      }
    >
      {!list ? (
        <PanelEmpty>No packaging list yet.</PanelEmpty>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 rounded-lg bg-secondary-50 px-3 py-2">
            <Fact label="Units">{qty(container.totals.units)}</Fact>
            <Fact label="Cartons">{qty(container.totals.cartons)}</Fact>
            <Fact label="CBM">{container.totals.cbm.toFixed(2)}</Fact>
          </div>
          <p className="text-xs text-text-muted">{supplierNames(list.suppliers)}</p>
          <ul className="flex flex-col gap-2">
            {container.lines.map((line) => (
              <li key={`${line.purchaseOrderId}:${line.sku}`} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-semibold text-text-primary">{line.sku}</p>
                    <p className="truncate text-sm text-text-secondary">{line.name}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-secondary-100 px-2 py-0.5 font-mono text-[11px] text-secondary-700">{line.poNo}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <Fact label="Color">{line.color}</Fact>
                  <Fact label="Size">{line.sizeName}</Fact>
                  <Fact label="Units">
                    {qty(line.units)} of {qty(line.ordered)}
                  </Fact>
                  <Fact label="Cartons">{qty(line.cartons)}</Fact>
                  <Fact label="Carton L × W × H">{formatDimensions(line.carton.lengthCm, line.carton.widthCm, line.carton.heightCm, 'CM')}</Fact>
                  <Fact label="CBM">{line.cbm.toFixed(2)}</Fact>
                  <Fact label="Net / gross">
                    {kg(line.netWeightKg)} / {kg(line.grossWeightKg)}
                  </Fact>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  )
}
