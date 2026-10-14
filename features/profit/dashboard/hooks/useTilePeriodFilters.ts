'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import type { DateRangeValue } from '@/components/date-range-picker/DateRangePicker'
import type { PeriodSummaryPeriod } from '@/services/api/profit.api'
import {
  formatDateRangePST,
  getRollingDateRangePST,
  nowInPST,
  tilePresets,
  type TileDateRange,
  type TilePreset,
} from '@/utils/profitDashboard.util'

/**
 * Period tile filter state shared by the tile screens: the period preset or custom range (draft until applied),
 * the selected tile, and their persistence in localStorage.
 */

const CUSTOM = 'custom'
const CUSTOM_TILE_ID = 'custom-range'

const readStorage = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const writeStorage = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // storage unavailable: state just isn't remembered
  }
}

const customPreset = (range: TileDateRange | null): TilePreset => {
  const resolved = range || getRollingDateRangePST(7)
  return {
    id: CUSTOM,
    label: 'Custom range',
    tiles: [
      {
        id: CUSTOM_TILE_ID,
        label: formatDateRangePST(resolved.startDate, resolved.endDate),
        apiPeriod: 'CUSTOM' as PeriodSummaryPeriod,
        getDateRange: () => resolved,
      },
    ],
  }
}

const presetFor = (presetId: string, range: TileDateRange | null) =>
  presetId === CUSTOM ? customPreset(range) : tilePresets.find((preset) => preset.id === presetId) || tilePresets[0]

export interface UseTilePeriodFiltersOptions {
  /** localStorage key prefix; each screen keeps its own period. */
  storageKey: string
  defaultPresetId?: string
}

export const useTilePeriodFilters = ({
  storageKey,
  defaultPresetId = tilePresets[0].id,
}: UseTilePeriodFiltersOptions) => {
  const rangeKey = `${storageKey}:range`
  const tileKey = `${storageKey}:tile`

  const [appliedPresetId, setAppliedPresetId] = useState(defaultPresetId)
  const [appliedRange, setAppliedRange] = useState<TileDateRange | null>(null)
  const [draftPresetId, setDraftPresetId] = useState(defaultPresetId)
  const [draftRange, setDraftRange] = useState<TileDateRange | null>(null)
  const [selectedTileId, setSelectedTileId] = useState(presetFor(defaultPresetId, null).tiles[0].id)
  const [datePickerKey, setDatePickerKey] = useState(0)

  // Restore once on mount
  useEffect(() => {
    const savedPreset = readStorage(storageKey)
    const savedRange = readStorage(rangeKey)
    const savedTile = readStorage(tileKey)

    let presetId =
      savedPreset && (savedPreset === CUSTOM || tilePresets.some((preset) => preset.id === savedPreset))
        ? savedPreset
        : defaultPresetId
    let range: TileDateRange | null = null

    if (presetId === CUSTOM) {
      try {
        range = savedRange ? JSON.parse(savedRange) : null
      } catch {
        range = null
      }
      if (!range) presetId = defaultPresetId
    }

    const tiles = presetFor(presetId, range).tiles
    setAppliedPresetId(presetId)
    setDraftPresetId(presetId)
    setAppliedRange(range)
    setDraftRange(range)
    setSelectedTileId(savedTile && tiles.some((tile) => tile.id === savedTile) ? savedTile : tiles[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    writeStorage(tileKey, selectedTileId)
  }, [tileKey, selectedTileId])

  const currentPreset = useMemo(() => presetFor(appliedPresetId, appliedRange), [appliedPresetId, appliedRange])

  const datePresets = useMemo(
    () => [
      ...tilePresets.map((preset) => ({
        id: preset.id,
        label: preset.label,
        getRange: () => {
          const now = nowInPST()
          const ranges = preset.tiles.map((tile) => tile.getDateRange(now))
          const starts = ranges.map((range) => range.startDate).sort()
          const ends = ranges.map((range) => range.endDate).sort()
          return { startDate: starts[0], endDate: ends[ends.length - 1] }
        },
      })),
      {
        id: CUSTOM,
        label: 'Custom range',
        getRange: () => draftRange || getRollingDateRangePST(7),
      },
    ],
    [draftRange],
  )

  const dateRangeValue = useMemo<DateRangeValue>(() => {
    const range = datePresets.find((preset) => preset.id === draftPresetId)?.getRange()
    return {
      startDate: range?.startDate ?? null,
      endDate: range?.endDate ?? null,
      presetId: draftPresetId,
      periodicity: 'day',
    }
  }, [draftPresetId, datePresets])

  const onDateRangeChange = useCallback((range: DateRangeValue) => {
    if (range.presetId && range.presetId !== CUSTOM) {
      setDraftPresetId(range.presetId)
      setDraftRange(null)
      return
    }
    if (range.startDate && range.endDate) {
      setDraftRange({ startDate: range.startDate, endDate: range.endDate })
      setDraftPresetId(CUSTOM)
    }
  }, [])

  const isDirty =
    draftPresetId !== appliedPresetId ||
    (draftPresetId === CUSTOM && JSON.stringify(draftRange) !== JSON.stringify(appliedRange))

  /** Commits the draft period. Keeps the selected tile when the new preset still has it. */
  const apply = useCallback(() => {
    const range = draftPresetId === CUSTOM ? draftRange : null
    const tiles = presetFor(draftPresetId, range).tiles

    setAppliedPresetId(draftPresetId)
    setAppliedRange(range)
    setSelectedTileId((current) => (tiles.some((tile) => tile.id === current) ? current : tiles[0].id))
    setDatePickerKey((key) => key + 1)

    writeStorage(storageKey, draftPresetId)
    writeStorage(rangeKey, range ? JSON.stringify(range) : null)
  }, [draftPresetId, draftRange, storageKey, rangeKey])

  const selectedTile = currentPreset.tiles.find((tile) => tile.id === selectedTileId) ?? currentPreset.tiles[0]
  const selectedTileRange = useMemo(() => selectedTile.getDateRange(nowInPST()), [selectedTile])

  return {
    isCustom: appliedPresetId === CUSTOM,
    appliedPresetId,
    appliedRange,
    currentPreset,
    datePresets,
    dateRangeValue,
    datePickerKey,
    keepOpenPresetIds: [CUSTOM],
    onDateRangeChange,
    selectedTile,
    selectedTileRange,
    setSelectedTileId,
    isDirty,
    apply,
  }
}
