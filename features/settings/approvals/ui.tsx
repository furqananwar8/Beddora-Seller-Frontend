'use client'

import React, { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { cn } from '@/utils/cn'

/** Building blocks of the Approvals screen, styled to match the approved design (v3 PDF) piece by piece. */

/** Every button and select on this screen is this tall, so rows line up. */
const CONTROL = 'h-9'

/** A plain cross, for every "remove" on this screen. */
export const XIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className={cn('h-4 w-4', className)} aria-hidden>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)

/** An icon-only remove button. `corner` pins it to the top right of its (relative) card. */
export const RemoveBtn: React.FC<{ label: string; onClick: () => void; corner?: boolean; disabled?: boolean }> = ({ label, onClick, corner, disabled }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    disabled={disabled}
    onClick={onClick}
    className={cn('flex h-8 w-8 shrink-0 items-center justify-center text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40', corner && 'absolute right-2 top-2')}
  >
    <XIcon />
  </button>
)

/** The app's own button (same padding and look as the Purchase Orders screen); `primary` is the filled one. */
export const Btn: React.FC<Omit<React.ComponentProps<typeof Button>, 'variant' | 'size'> & { primary?: boolean }> = ({ primary, type = 'button', className, ...props }) => (
  <Button type={type} size="sm" variant={primary ? 'primary' : 'outline'} className={cn(CONTROL, 'whitespace-nowrap px-3.5 text-[13px]', className)} {...props} />
)

const TAG_TONES = { green: 'bg-green-100 text-green-800', slate: 'bg-slate-100 text-slate-600', red: 'bg-red-100 text-red-800', indigo: 'bg-indigo-100 text-indigo-800' }

export const Tag: React.FC<{ tone?: keyof typeof TAG_TONES; children: React.ReactNode; className?: string }> = ({ tone = 'slate', children, className }) => (
  <span className={cn('inline-block shrink-0 whitespace-nowrap ds-circle px-2 py-px text-[10px] font-semibold', TAG_TONES[tone], className)}>{children}</span>
)

/** Fixed classes (Tailwind only keeps classes it can read in the source), one per colour a person can get. */
const AVATAR_COLORS = ['bg-rose-400', 'bg-orange-400', 'bg-amber-400', 'bg-lime-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500', 'bg-indigo-400', 'bg-violet-400', 'bg-fuchsia-400', 'bg-pink-400']

/** The same name always gets the same colour, so a person is easy to spot across the screen. Without a name it stays grey. */
const colorOf = (seed: string) => AVATAR_COLORS[[...seed].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 9973, 7) % AVATAR_COLORS.length]

export const Avatar: React.FC<{ seed?: string }> = ({ seed }) => <span className={cn('mr-1.5 inline-block h-5 w-5 shrink-0 ds-circle align-middle', seed ? colorOf(seed) : 'bg-slate-300')} />

export const Chip: React.FC<{ teal?: boolean; onRemove?: () => void; children: React.ReactNode }> = ({ teal, onRemove, children }) => (
  <span className={cn('inline-flex h-9 items-center ds-circle border pl-2 pr-3 text-[13px]', teal ? 'border-teal-300 bg-teal-50 text-teal-800' : 'border-blue-200 bg-blue-50 text-blue-900')}>
    <Avatar seed={teal || typeof children !== 'string' ? undefined : children} />
    <span>{children}</span>
    {onRemove && (
      <button type="button" aria-label="Remove" onClick={onRemove} className="ml-2 flex h-5 w-5 items-center justify-center text-slate-500 hover:text-red-600">
        <XIcon className="h-3.5 w-3.5" />
      </button>
    )}
  </span>
)

export interface SelectOption<T extends string | number | null> {
  value: T
  label: string
}

/** The app's custom select (the one the PO and planner screens use) for a plain list of values. */
export function Select<T extends string | number | null>({ options, value, onChange, placeholder, disabled, searchable, width = 'w-52', error }: { options: Array<SelectOption<T>>; value: T | undefined; onChange: (value: T) => void; placeholder?: string; disabled?: boolean; searchable?: boolean; width?: string; error?: string }) {
  return (
    <div className={cn('min-w-0', width)}>
      <SearchableSelect<SelectOption<T>>
        options={options}
        getKey={(option) => String(option.value ?? '__none')}
        getLabel={(option) => option.label}
        value={options.find((option) => option.value === value) ?? null}
        onChange={(option) => onChange(option.value)}
        placeholder={placeholder}
        searchable={searchable}
        disabled={disabled}
        error={error}
        triggerClassName={cn('min-h-0 py-0 text-[13px]', CONTROL)}
      />
    </div>
  )
}

export const SideTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => <div className="mb-1.5 mt-4 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 first:mt-0">{children}</div>

export const SideItem: React.FC<{ active?: boolean; disabled?: boolean; onClick?: () => void; children: React.ReactNode }> = ({ active, disabled, onClick, children }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={cn('mb-0.5 flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-[13px]', active ? 'bg-blue-100 font-semibold text-slate-900' : 'text-slate-800 hover:bg-slate-100', disabled && 'cursor-not-allowed text-slate-400 hover:bg-transparent')}
  >
    {children}
  </button>
)

/** The two panes: a fixed list on the left, the editor on the right. Never stacks. */
export const TwoPane: React.FC<{ side: React.ReactNode; width?: number; children: React.ReactNode }> = ({ side, width = 185, children }) => (
  <div className="flex h-full min-h-0">
    <aside style={{ width }} className="h-full shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50 p-3">
      {side}
    </aside>
    <section className="h-full min-w-0 flex-1 overflow-y-auto px-6 py-6">{children}</section>
  </div>
)

/** Renders into one of the screen's two bars: the header ("+ New department") or the footer (status, Discard and Save). */
export const InHeader: React.FC<{ slot: HTMLElement | null; children: React.ReactNode }> = ({ slot, children }) => (slot ? createPortal(children, slot) : null)

/** The footer bar's content: what state the tab is in on the left, its buttons on the right. */
export const FooterBar: React.FC<{ slot: HTMLElement | null; status: React.ReactNode; children?: React.ReactNode }> = ({ slot, status, children }) => (
  <InHeader slot={slot}>
    <span className="text-[13px] text-slate-500">{status}</span>
    <span className="flex items-center gap-2">{children}</span>
  </InHeader>
)

/** A page heading on the right pane: big, with its one-line description underneath in a smaller size. */
export const PaneTitle: React.FC<{ title: React.ReactNode; right?: React.ReactNode; children?: React.ReactNode }> = ({ title, right, children }) => (
  <div className="mb-6">
    <div className="flex min-h-9 items-center justify-between gap-3">
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      {right}
    </div>
    {children && <p className="mt-1 text-[13px] text-slate-500">{children}</p>}
  </div>
)

/** A section label inside a pane ("Heads", "Members", "Tell these people"). */
/** A spinner in the middle of the space it will fill. */
export const Loading: React.FC = () => (
  <div className="flex min-h-[240px] w-full items-center justify-center">
    <Spinner />
  </div>
)

export const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => <div className="mb-2 text-sm font-semibold text-slate-900">{children}</div>

export const OnOff: React.FC<{ on: boolean; onChange?: (on: boolean) => void; disabled?: boolean }> = ({ on, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    disabled={disabled}
    onClick={() => onChange?.(!on)}
    className={cn('ds-circle px-2 py-px text-[10px] font-semibold', on ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600')}
  >
    {on ? 'ON' : 'OFF'}
  </button>
)

export interface PickOption {
  key: string
  label: string
  hint?: string
}

/**
 * "+ Add ..." as the app's multi-select (the one the Purchase Orders filters use): tick several, press Done, and they are
 * all added at once. The button keeps its place; what was added shows up beside it.
 */
export function AddPicker<T extends PickOption>({ label, options, onAdd, disabled, empty = 'Nothing to add.', width = 'w-72' }: { label: string; options: T[]; onAdd: (picked: T[]) => void; disabled?: boolean; empty?: string; width?: string }) {
  const [picked, setPicked] = useState<T[]>([])
  const latest = useRef(picked)
  latest.current = picked
  return (
    <div className={cn('min-w-0 shrink-0', width)}>
      <SearchableSelect<T>
        multiple
        searchable
        options={options}
        getKey={(option) => option.key}
        getLabel={(option) => option.label}
        value={picked}
        onChange={setPicked}
        renderValue={(value) => `${label.replace(/^\+\s*/, '')} · ${value.length} selected`}
        renderOption={(option) => (
          // Name on the first line, whole; the hint (an email) under it, so a long name is never cut off
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="break-words">{option.label}</span>
            {option.hint && <span className="break-all text-xs text-slate-500">{option.hint}</span>}
          </span>
        )}
        // Closing the menu (Done, Escape or a click outside) adds what was ticked
        onOpenChange={(open) => {
          if (open || latest.current.length === 0) return
          onAdd(latest.current)
          setPicked([])
        }}
        placeholder={label}
        searchPlaceholder="Search…"
        emptyText={empty}
        disabled={disabled}
        triggerClassName={cn('min-h-0 py-0 text-[13px]', CONTROL)}
      />
    </div>
  )
}
