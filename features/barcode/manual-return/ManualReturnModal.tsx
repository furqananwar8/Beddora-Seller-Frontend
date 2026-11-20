'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { Modal } from '@/design-system/modals'
import { Switch } from '@/components/switch/Switch'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useCreateManualReturnsMutation, useGetManualReturnOptionsQuery, type ManualReturnOption } from '@/services/api/barcode.api'
import { count, entryProblem, ManualReturnEntryCard, type ReturnEntry } from './ManualReturnEntryCard'

interface Props {
  onClose: () => void
}

/** The most returns one batch may hold; same cap as the server. */
const MAX_BATCH_ENTRIES = 20

/**
 * Returns entered by hand, for returned items that match nothing by UPC. One return, or with the Batch switch several at
 * once (each with its own channel, marketplace, product, units, damaged count, remarks and details). Saving puts every
 * unit back into inventory, sellable ones to the FBM pool and damaged ones to the damaged bucket, all or nothing.
 */
export function ManualReturnModal({ onClose }: Props) {
  const feedback = useApiFeedback()
  const { data: options, isLoading: loadingOptions } = useGetManualReturnOptionsQuery()
  const [create, { isLoading: saving }] = useCreateManualReturnsMutation()
  const nextKey = useRef(1)
  const [batch, setBatch] = useState(false)
  const [entries, setEntries] = useState<ReturnEntry[]>([])

  const blank = useCallback(
    (from: ManualReturnOption[], like?: ReturnEntry): ReturnEntry => ({
      key: nextKey.current++,
      // a new return starts where the last one was, as a batch is often one channel's parcels
      channel: like?.channel ?? from[0]?.id ?? '',
      marketplace: like?.marketplace ?? from[0]?.markets[0]?.country ?? '',
      product: null,
      search: '',
      units: '1',
      damaged: '0',
      remarks: '',
      details: [],
    }),
    []
  )

  // the first return starts on the first channel and its first marketplace
  useEffect(() => {
    if (options?.length && entries.length === 0) setEntries([blank(options)])
  }, [options, entries.length, blank])

  const patch = (key: number, change: Partial<ReturnEntry>) => setEntries((rows) => rows.map((row) => (row.key === key ? { ...row, ...change } : row)))
  const firstProblem = entries.map((entry, index) => ({ index, problem: entryProblem(entry) })).find((item) => item.problem)
  const problem = firstProblem ? (entries.length > 1 ? `Return ${firstProblem.index + 1}: ${firstProblem.problem}` : firstProblem.problem) : null
  const totalUnits = entries.reduce((sum, entry) => sum + count(entry.units), 0)
  const totalDamaged = entries.reduce((sum, entry) => sum + count(entry.damaged), 0)

  const save = async () => {
    if (problem || !options) return
    try {
      await create({
        entries: entries.map((entry) => ({
          channel: entry.channel,
          marketplace: entry.marketplace,
          channelSku: entry.product!.channelSku,
          units: count(entry.units),
          damagedUnits: count(entry.damaged),
          remarks: entry.remarks.trim() || undefined,
          metadata: entry.details.filter((detail) => detail.name.trim()).map((detail) => ({ name: detail.name.trim(), value: detail.value.trim() })),
        })),
      }).unwrap()
      feedback.success(entries.length === 1 ? `Return recorded: ${totalUnits} unit${totalUnits === 1 ? '' : 's'} added to inventory` : `${entries.length} returns recorded: ${totalUnits} units added to inventory`)
      onClose()
    } catch (error) {
      feedback.failure(error, 'Could not save the return')
    }
  }

  const single = entries.length === 1 ? entries[0] : null

  return (
    <Modal isOpen onClose={onClose} title="Manual return" size="xl" className="max-w-[1000px]">
      <div className="-mt-2 mb-4 flex items-start justify-between gap-4">
        <p className="text-sm text-text-muted">For returned items that match nothing by UPC. The units go back into inventory when you save.</p>
        <label className="flex shrink-0 items-center gap-2 text-sm font-medium text-text-secondary">
          Batch
          <Switch checked={batch} onCheckedChange={setBatch} disabled={saving || entries.length > 1} aria-label="Batch mode" title={entries.length > 1 ? 'Remove the extra returns to turn batch off' : 'Enter several returns at once'} />
        </label>
      </div>

      {loadingOptions || !options || entries.length === 0 ? (
        <div className="flex justify-center p-8">
          <Spinner size="sm" />
        </div>
      ) : (
        <div className="space-y-4">
          {batch ? (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-text-primary">Returns</span>
                <span className="text-text-muted">
                  {entries.length} of up to {MAX_BATCH_ENTRIES}
                </span>
              </div>
              <div className="max-h-[52vh] space-y-4 overflow-auto pr-1">
                {entries.map((entry, index) => (
                  <ManualReturnEntryCard
                    key={entry.key}
                    entry={entry}
                    options={options}
                    position={{ index, onRemove: entries.length > 1 ? () => setEntries((rows) => rows.filter((row) => row.key !== entry.key)) : null }}
                    onChange={(change) => patch(entry.key, change)}
                  />
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" disabled={entries.length >= MAX_BATCH_ENTRIES || saving} onClick={() => setEntries((rows) => [...rows, blank(options, rows[rows.length - 1])])}>
                ＋ Add return
              </Button>
            </>
          ) : (
            single && <ManualReturnEntryCard entry={single} options={options} onChange={(change) => patch(single.key, change)} />
          )}

          <div className="rounded-lg border border-border bg-secondary-50 p-3 text-sm text-secondary-700">
            {problem ? (
              problem
            ) : (
              <>
                <b className="text-text-primary">On save:</b> {totalUnits - totalDamaged} unit{totalUnits - totalDamaged === 1 ? '' : 's'} go to the FBM pool as sellable and {totalDamaged} to the damaged bucket
                {entries.length > 1 ? ` across ${entries.length} returns` : ''}. {entries.length > 1 ? 'Each entry is' : 'The entry is'} kept with your name and the time.
              </>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void save()} disabled={saving || Boolean(problem)}>
              {saving ? 'Saving…' : entries.length > 1 ? `Save ${entries.length} returns` : 'Save return'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
