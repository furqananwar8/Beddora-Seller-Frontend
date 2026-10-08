'use client'

import React, { useState } from 'react'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { Button } from '@/design-system/buttons'
import { cn } from '@/utils/cn'
import { formatCostCenterCode, levelLabel } from '../costCenterCode'
import { type DraftEntry, type DraftState, canAddAt, entriesAt, nameOf, parentAt, parentOf, pathOf, pendingSiblingNames, sameRef } from './costCenterDraft'
import { type LevelOption, useLevelOptions } from './useLevelOptions'

interface LevelRowProps {
  level: number
  state: DraftState
  onSelect: (option: LevelOption) => void
  onAdd: (takenNames: Set<string>) => void
  /** With the names its siblings use: every sibling when it sits under the current selection, else the new ones. */
  onEdit: (entry: DraftEntry, takenNames: Set<string>) => void
  onRemove: (entry: DraftEntry) => void
}

/** One level of the create screen: pick an existing cost center, or add a new one under the selection above. */
export const LevelRow: React.FC<LevelRowProps> = ({ level, state, onSelect, onAdd, onEdit, onRemove }) => {
  const { options, takenNames, loading } = useLevelOptions(state, level)
  const [open, setOpen] = useState(true)
  const selected = options.find((option) => sameRef(option.ref, state.selected[level - 1] ?? null)) ?? null
  const parent = parentAt(state, level)
  const addable = canAddAt(state, level)
  const pending = entriesAt(state, level)

  return (
    <div className="border-b border-border py-4 last:border-b-0">
      <div className="grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[3rem_minmax(0,1fr)_auto]">
        <span className="font-semibold text-text-primary">{levelLabel(level)}</span>
        <SearchableSelect<LevelOption>
          ariaLabel={`${levelLabel(level)} cost center`}
          options={options}
          value={selected}
          onChange={onSelect}
          getKey={(option) => (option.ref.kind === 'saved' ? `s${option.ref.id}` : `p${option.ref.key}`)}
          getLabel={(option) => option.name}
          renderOption={(option) => (
            <span className="flex w-full items-center justify-between gap-3">
              <span>{option.name}</span>
              <span className="font-mono text-xs text-text-muted">{option.code ? formatCostCenterCode(option.code) : 'new'}</span>
            </span>
          )}
          loading={loading}
          disabled={!addable}
          placeholder={addable ? `${levelLabel(level)} - Select` : `Select ${levelLabel(level - 1)} first`}
          emptyText={parent ? `Nothing under ${nameOf(state, parent)} yet. Add one.` : 'No cost center yet. Add one.'}
        />
        <Button type="button" variant="outline" size="sm" className="col-start-2 justify-self-start sm:col-start-auto" disabled={!addable} onClick={() => onAdd(takenNames)}>
          + Add
        </Button>
      </div>

      {pending.length > 0 && (
        <div className="ml-0 mt-3 sm:ml-[3.75rem]">
          <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="flex items-center gap-1 text-xs font-medium text-text-muted hover:text-text-primary">
            <svg className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-90')} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {pending.length} new at {levelLabel(level)} (not saved yet)
          </button>
          {open && (
            <ul className="mt-2 divide-y divide-border rounded-md border border-dashed border-border">
              {pending.map((entry) => (
                <li key={entry.key} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span className="min-w-0 truncate">
                    {pathOf(state, entry).map((name, index) => (
                      <span key={index} className="text-text-muted">
                        {name} ›{' '}
                      </span>
                    ))}
                    <span className="font-medium text-text-primary">{entry.name}</span>
                  </span>
                  <span className="flex shrink-0 gap-1">
                    <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(entry, sameRef(parentOf(entry), parent) ? takenNames : pendingSiblingNames(state, entry))}>
                      Edit
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="text-danger-600" onClick={() => onRemove(entry)}>
                      Remove
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
