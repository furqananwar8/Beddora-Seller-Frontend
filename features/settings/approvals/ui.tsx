'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/utils/cn'

/** Building blocks of the Approvals screen, styled to match the approved design (v3 PDF) piece by piece. */

export const Btn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }> = ({ primary, className, type = 'button', ...props }) => (
  <button
    type={type}
    className={cn(
      'rounded-md border px-3 py-1 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
      primary ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
      className
    )}
    {...props}
  />
)

const TAG_TONES = { green: 'bg-green-100 text-green-800', slate: 'bg-slate-100 text-slate-600', red: 'bg-red-100 text-red-800', indigo: 'bg-indigo-100 text-indigo-800' }

export const Tag: React.FC<{ tone?: keyof typeof TAG_TONES; children: React.ReactNode; className?: string }> = ({ tone = 'slate', children, className }) => (
  <span className={cn('inline-block rounded-full px-2 py-px text-[10px] font-semibold', TAG_TONES[tone], className)}>{children}</span>
)

export const Avatar: React.FC = () => <span className="mr-1 inline-block h-[18px] w-[18px] shrink-0 rounded-full bg-slate-300 align-middle" />

export const Chip: React.FC<{ teal?: boolean; onRemove?: () => void; children: React.ReactNode }> = ({ teal, onRemove, children }) => (
  <span className={cn('inline-flex items-center rounded-full border py-0.5 pl-1 pr-2.5 text-xs', teal ? 'border-teal-300 bg-teal-50 text-teal-800' : 'border-blue-200 bg-blue-50 text-blue-900')}>
    <Avatar />
    <span>{children}</span>
    {onRemove && (
      <button type="button" aria-label="Remove" onClick={onRemove} className="ml-1.5 text-slate-500 hover:text-red-600">
        ✕
      </button>
    )}
  </span>
)

export const selectClass = 'rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 disabled:opacity-60'

export const SideTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => <div className="mb-1 mt-2 text-[9px] font-semibold uppercase tracking-wide text-slate-500 first:mt-0">{children}</div>

export const SideItem: React.FC<{ active?: boolean; disabled?: boolean; onClick?: () => void; children: React.ReactNode }> = ({ active, disabled, onClick, children }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={cn('mb-0.5 flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[13px]', active ? 'bg-blue-100 font-semibold text-slate-900' : 'text-slate-800 hover:bg-slate-100', disabled && 'cursor-not-allowed text-slate-400 hover:bg-transparent')}
  >
    {children}
  </button>
)

/** The two panes: a fixed list on the left, the editor on the right. Never stacks. */
export const TwoPane: React.FC<{ side: React.ReactNode; width?: number; children: React.ReactNode }> = ({ side, width = 185, children }) => (
  <div className="flex">
    <aside style={{ width }} className="shrink-0 border-r border-slate-200 bg-slate-50 p-2">
      {side}
    </aside>
    <section className="min-w-0 flex-1 p-3 sm:p-4">{children}</section>
  </div>
)

/** Renders into the header bar of the screen (where the design puts Save, Discard and "+ New department"). */
export const InHeader: React.FC<{ slot: HTMLElement | null; children: React.ReactNode }> = ({ slot, children }) => (slot ? createPortal(children, slot) : null)

export const OnOff: React.FC<{ on: boolean; onChange?: (on: boolean) => void; disabled?: boolean }> = ({ on, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    disabled={disabled}
    onClick={() => onChange?.(!on)}
    className={cn('rounded-full px-2 py-px text-[10px] font-semibold', on ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600')}
  >
    {on ? 'ON' : 'OFF'}
  </button>
)

export interface PickOption {
  key: string
  label: string
  hint?: string
  onPick: () => void
}

/** A button that opens a searchable menu, like the "+ Add person or department head" of the design. */
export const AddPicker: React.FC<{ label: string; groups: Array<{ title?: string; options: PickOption[] }>; disabled?: boolean; empty?: string }> = ({ label, groups, disabled, empty = 'Nothing to add.' }) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const away = (event: MouseEvent) => !box.current?.contains(event.target as Node) && setOpen(false)
    document.addEventListener('mousedown', away)
    return () => document.removeEventListener('mousedown', away)
  }, [open])

  const shown = useMemo(() => groups.map((group) => ({ ...group, options: group.options.filter((option) => option.label.toLowerCase().includes(search.trim().toLowerCase())) })).filter((group) => group.options.length > 0), [groups, search])

  return (
    <div ref={box} className="relative inline-block">
      <Btn disabled={disabled} onClick={() => setOpen((value) => !value)}>
        {label}
      </Btn>
      {open && (
        <div className="absolute left-0 z-30 mt-1 w-64 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
          <input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search…" className="mb-2 w-full rounded-md border border-slate-300 px-2 py-1 text-xs" />
          <div className="max-h-56 overflow-auto">
            {shown.length === 0 && <p className="px-2 py-2 text-xs text-slate-500">{empty}</p>}
            {shown.map((group) => (
              <div key={group.title ?? 'all'}>
                {group.title && <div className="px-2 pb-0.5 pt-1.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500">{group.title}</div>}
                {group.options.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => {
                      option.onPick()
                      setOpen(false)
                      setSearch('')
                    }}
                    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs text-slate-800 hover:bg-slate-100"
                  >
                    <span className="truncate">{option.label}</span>
                    {option.hint && <span className="ml-2 shrink-0 text-[10px] text-slate-500">{option.hint}</span>}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
