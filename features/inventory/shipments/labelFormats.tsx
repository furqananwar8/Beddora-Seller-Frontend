"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { MultiSelectInput } from '@/components/multi-select-input/MultiSelectInput'
import type { LabelType } from './types'
import { LabelButton } from './ShipmentParts'
import type { LabelFileStatus } from './types'

/** Label kinds that come in more than one printable size (pallet labels don't). */
export type SizedLabelType = Extract<LabelType, 'box' | 'unit'>

export interface LabelFormatOption {
  id: string
  label: string
  description?: string
}

/** What the backend offers per label kind, with its default. */
export type LabelFormatCatalog = Record<SizedLabelType, { default: string; options: LabelFormatOption[] }>

type Selection = Record<SizedLabelType, string>

const STORAGE_KEY = 'fba-label-formats'

const readStored = (): Partial<Selection> => {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<Selection>
  } catch {
    return {}
  }
}

export interface LabelFormatState {
  catalog?: LabelFormatCatalog
  /** The size to print for each kind: the user's last pick, else the backend default. */
  selected: Partial<Selection>
  select: (kind: SizedLabelType, id: string) => void
}

/** Remembers each kind's chosen size in this browser; picks the backend default until then. */
export function useLabelFormatState(catalog?: LabelFormatCatalog): LabelFormatState {
  const [stored, setStored] = useState<Partial<Selection>>({})
  useEffect(() => setStored(readStored()), [])

  const selected = useMemo(() => {
    if (!catalog) return {}
    const pick = (kind: SizedLabelType) => {
      const saved = stored[kind]
      return saved && catalog[kind].options.some((o) => o.id === saved) ? saved : catalog[kind].default
    }
    return { box: pick('box'), unit: pick('unit') }
  }, [catalog, stored])

  const select = useCallback((kind: SizedLabelType, id: string) => {
    setStored((prev) => {
      const next = { ...prev, [kind]: id }
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // private mode or blocked storage: the pick just lasts for this page
      }
      return next
    })
  }, [])

  return { catalog, selected, select }
}

const LabelFormatContext = createContext<LabelFormatState>({ selected: {}, select: () => undefined })
export const LabelFormatProvider = LabelFormatContext.Provider
export const useLabelFormats = () => useContext(LabelFormatContext)

/** A label download button with its size picker beside it (box and FNSKU labels). */
export const LabelDownloadControl: React.FC<{
  type: LabelType
  label: string
  status?: LabelFileStatus
  isDownloading: boolean
  onClick: () => void
}> = ({ type, label, status, isDownloading, onClick }) => {
  const { catalog, selected, select } = useLabelFormats()
  const kind = type === 'box' || type === 'unit' ? type : null
  const options = kind ? catalog?.[kind].options : undefined

  return (
    <div className="flex flex-wrap items-center gap-2">
      {kind && options && selected[kind] && (
        <MultiSelectInput
          single
          title={`${label} size`}
          className="min-w-[200px]"
          options={options.map((o) => ({ id: o.id, name: o.label }))}
          value={[selected[kind]!]}
          onChange={(value) => value[0] && select(kind, value[0])}
        />
      )}
      <LabelButton label={label} status={status} isDownloading={isDownloading} onClick={onClick} />
    </div>
  )
}
