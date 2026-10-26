'use client'

import React, { useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog'
import { Container } from '@/components/layout'
import { Button } from '@/design-system/buttons'
import { KpiCard } from '@/design-system/kpi'
import { Spinner } from '@/design-system/loaders'
import { useAppAbility } from '@/hooks/useAppAbility'
import { cn } from '@/utils/cn'
import { ChangeTimelineModal } from './ChangeTimelineModal'
import { ChannelSkuPicker } from './ChannelSkuPicker'
import { GRAPH_LIMIT } from './constants'
import { DeductionsPanel } from './DeductionsPanel'
import { GraphChips } from './GraphChips'
import { SkuGraph } from './graph/SkuGraph'
import { InternalSkuPicker } from './InternalSkuPicker'
import { SaveBar } from './SaveBar'
import { SkuMappingFilters } from './SkuMappingFilters'
import { useSkuMapper } from './useSkuMapper'

const n = (value: number | undefined) => (value === undefined ? '–' : value.toLocaleString())

export const SkuMappingScreen: React.FC = () => {
  const ability = useAppAbility()
  const readOnly = !ability.can('write', 'inventory:sku-mapping')
  const mapper = useSkuMapper()
  const [timelineOpen, setTimelineOpen] = useState(false)
  const { summary, rows, selectedRow, channel } = mapper
  const auditRow = selectedRow ?? rows.find((row) => row.version !== null) ?? null

  return (
    <Container size="full" className="py-4 sm:py-8">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-text-primary sm:text-2xl">SKU Mapping</h1>
        <p className="text-sm text-text-muted">Bind channel listings to internal SKUs with a quantity per unit sold.</p>
      </div>

      <SkuMappingFilters channels={mapper.channels} filters={mapper.filters} />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4 [&>*]:h-auto">
        <KpiCard title="Channel SKUs" value={n(summary?.total)} />
        <KpiCard title="Mapped" value={n(summary?.mapped)} />
        <KpiCard title="Unmapped" value={n(summary?.unmapped)} className={summary && summary.unmapped > 0 ? '[&_.text-metric]:text-danger-600' : undefined} />
        <KpiCard title="New (last 7 days)" value={n(summary?.new)} />
      </div>

      <section className={cn('rounded-lg border border-border bg-surface shadow-sm', mapper.fetching && 'transition-opacity [&_.react-flow]:opacity-70')}>
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
          <ChannelSkuPicker
            scope={mapper.scope}
            summary={summary}
            channelLabel={channel.name}
            onGraph={rows}
            locked={mapper.locked}
            onAdd={mapper.addRows}
            onRemove={mapper.removeKeys}
            onClear={mapper.clearGraph}
            onLoadUnmapped={mapper.loadUnmapped}
            loadingUnmapped={mapper.loadingUnmapped}
          />
          {!readOnly && <InternalSkuPicker bindTo={selectedRow?.sku ?? null} onPick={mapper.bindInternal} />}
          <div className="ml-auto flex min-w-0 items-center gap-3">
            <span className="hidden truncate text-sm text-text-muted xl:block">
              {readOnly ? 'View only: you can’t change bindings.' : selectedRow ? 'Press and drag from a channel SKU to an internal SKU to link them' : 'Select a channel SKU to start binding'}
            </span>
            <Button type="button" size="sm" className="h-10 shrink-0 gap-2" onClick={() => setTimelineOpen(true)}>
              Show timeline
              {mapper.pending.length > 0 && <span className="rounded bg-warning-500 px-1.5 text-xs text-white">{mapper.pending.length}</span>}
            </Button>
          </div>
        </div>

        <GraphChips rows={rows} selected={mapper.draft.selected} locked={mapper.locked} collapse={mapper.compact} onSelect={mapper.select} onRemove={(key) => mapper.removeKeys([key])} />

        {mapper.full && (
          <p className="border-b border-warning-200 bg-warning-50 px-4 py-2 text-sm text-warning-700">
            Graph limit reached ({GRAPH_LIMIT} SKUs). Remove SKUs or narrow the filter to load more.
          </p>
        )}
        {mapper.compact && (
          <p className="border-b border-border px-4 py-2 text-xs text-text-muted">
            Compact view · {rows.length} SKUs · unmapped listed first, internal nodes aligned to their bindings
          </p>
        )}

        <div className="px-4 py-4">
          {mapper.loading ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : mapper.error ? (
            <p className="py-16 text-center font-medium text-danger-600">Could not load the channel SKUs.</p>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-sm text-text-muted">
              {summary?.total === 0 ? 'No channel SKUs match the filters.' : 'The graph is empty. Pick channel SKUs from “Channel SKUs on graph” to start.'}
            </div>
          ) : (
            <div className={cn(mapper.compact && 'max-h-[70vh] overflow-y-auto pr-1')}>
              <SkuGraph
                channelLabel={channel.name}
                rows={rows}
                componentsOf={mapper.componentsOf}
                statusOf={mapper.statusOf}
                placed={mapper.draft.placed}
                selected={mapper.draft.selected}
                compact={mapper.compact}
                actions={{ select: mapper.select, connect: mapper.connect, setQuantity: mapper.setQuantity, readOnly }}
              />
            </div>
          )}
        </div>

        <div className="border-t border-border px-4 py-4">
          <DeductionsPanel channel={channel.id} row={selectedRow} components={mapper.selectedComponents} readOnly={readOnly} onUnbind={mapper.unbind} />
        </div>
      </section>

      {!readOnly && <SaveBar changes={mapper.pending.length} skus={mapper.pendingSkus} saving={mapper.saving} onDiscard={mapper.discard} onSave={mapper.saveChanges} />}

      <ChangeTimelineModal
        isOpen={timelineOpen}
        onClose={() => setTimelineOpen(false)}
        channel={channel}
        graphKeys={mapper.graphKeys}
        pending={mapper.pending}
        auditFor={auditRow && { marketplace: auditRow.marketplace, sku: auditRow.sku }}
      />

      <ConfirmDialog
        isOpen={mapper.confirmFilters.open}
        title="Discard unsaved changes?"
        confirmLabel="Discard and switch"
        tone="danger"
        onConfirm={mapper.confirmFilters.confirm}
        onClose={mapper.confirmFilters.cancel}
      >
        <p>Switching channel clears the graph. Your {mapper.pending.length} unsaved changes will be lost.</p>
      </ConfirmDialog>
    </Container>
  )
}
