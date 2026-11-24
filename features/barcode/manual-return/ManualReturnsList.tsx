'use client'

import { useState } from 'react'
import { Spinner } from '@/design-system/loaders'
import { Button } from '@/design-system/buttons'
import { Input } from '@/design-system/inputs'
import { Tooltip } from '@/design-system/tooltips'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { useDebounce } from '@/utils/debounce'
import { useGetManualReturnsQuery } from '@/services/api/barcode.api'

import { usePageSize } from '@/hooks/usePageSize'
const PAGE_SIZE = 10
const when = (iso: string) => new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })

/** The returns entered by hand, newest first: what came back, how it was split, and the notes kept with it. */
export function ManualReturnsList({ onAdd }: { onAdd?: () => void }) {
  const [page, setPage] = useState(1)
  const pageSize = usePageSize(PAGE_SIZE)
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search.trim(), 300)
  const { data, isLoading, isError } = useGetManualReturnsQuery({ page, limit: pageSize, search: debounced })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="w-full max-w-sm">
          <Input
            placeholder="Search SKU, order, product or remarks"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
        </div>
        {onAdd && <Button onClick={onAdd}>＋ Manual return</Button>}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {isLoading ? (
          <div className="flex justify-center p-10">
            <Spinner size="sm" />
          </div>
        ) : isError ? (
          <p className="p-8 text-center text-sm text-danger-600">Could not load the manual returns.</p>
        ) : !data?.data.length ? (
          <p className="p-8 text-center text-sm text-text-muted">{debounced ? 'No manual return matches your search.' : 'No manual returns yet. Use Manual return when a returned item matches nothing by UPC.'}</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary-100 text-xs text-secondary-600">
                <tr>
                  {['Date', 'Channel', 'Marketplace', 'Product', 'Units', 'Sellable', 'Damaged', 'Remarks', 'Entered by'].map((heading) => (
                    <th key={heading} className="px-3 py-2.5 text-center font-semibold">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.data.map((entry) => (
                  <tr key={entry.id} className="border-t border-border">
                    <td className="whitespace-nowrap px-3 py-3 text-center align-middle">{when(entry.createdAt)}</td>
                    <td className="px-3 py-3 text-center align-middle">{entry.channelLabel}</td>
                    <td className="px-3 py-3 text-center align-middle">{entry.marketplace}</td>
                    <td className="px-3 py-3 text-center align-middle">
                      <div className="font-medium text-text-primary">{entry.productName ?? entry.channelSku}</div>
                      <div className="break-all font-mono text-xs text-text-muted">{entry.channelSku}</div>
                      {entry.orderId && <div className="break-all text-xs text-text-muted">FBM order {entry.orderId}</div>}
                    </td>
                    <td className="px-3 py-3 text-center align-middle">{entry.units}</td>
                    <td className="px-3 py-3 text-center align-middle font-semibold text-success-700">{entry.sellableUnits}</td>
                    <td className={`px-3 py-3 text-center align-middle ${entry.damagedUnits > 0 ? 'font-semibold text-danger-600' : ''}`}>{entry.damagedUnits}</td>
                    <td className="max-w-[18rem] px-3 py-3 text-center align-middle">
                      {entry.remarks || entry.metadata.length ? (
                        <Tooltip content={entry.metadata.map((detail) => `${detail.name}: ${detail.value}`).join('\n') || entry.remarks || ''} multiline>
                          <span className="block truncate">
                            {entry.remarks ?? '—'}
                            {entry.metadata.length > 0 && <span className="text-text-muted"> · {entry.metadata.length} detail{entry.metadata.length === 1 ? '' : 's'}</span>}
                          </span>
                        </Tooltip>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center align-middle">{entry.by.name ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && data.totalRecords > 0 && <PaginationFooter selectablePageSize page={data.page} pageSize={data.limit} totalItems={data.totalRecords} totalPages={data.totalPages} onPageChange={setPage} itemLabel="manual returns" />}
      </div>
    </div>
  )
}
