'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { API_BASE_URL } from '@/services/api/baseApi'
import { readSse, streamFailure } from '@/utils/sseStream'

/** A card as the server builds it; the screen reads it field by field, as it did the summary's `periods`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SettlementTile = Record<string, any>

export interface SettlementTileStreamParams {
  accountId?: string
  marketplaces: string[]
  currency?: string
  /** A preset's id, or none with a custom range. */
  preset?: string
  startDate?: string
  endDate?: string
  /** Which screen's cards: the settlement report's (default) or the Profit dashboard's. */
  source?: 'settlement' | 'dashboard'
}

const urlOf = (params: SettlementTileStreamParams) => {
  const dashboard = params.source === 'dashboard'
  const query = new URLSearchParams(dashboard ? {} : { reportType: 'settlement-type' })
  const set = (key: string, value?: string) => value && query.set(key, value)
  set('accountId', params.accountId)
  set('currency', params.currency)
  set('preset', params.preset)
  set('startDate', params.startDate)
  set('endDate', params.endDate)
  if (params.marketplaces.length) query.set('marketplaces', params.marketplaces.join(','))
  return `${API_BASE_URL}/profit/${dashboard ? 'summary' : 'settlement-report/summary'}/stream?${query}`
}

/**
 * The settlement cards, each one as soon as the server has built it (`GET …/summary/stream`, Server-Sent Events).
 * New params (or `null`, or unmounting) abort the stream in flight, which also stops the server before its next card,
 * and start over with every card empty. `tiles` is keyed by period (TODAY, 7DAYSAGO…, or CUSTOM).
 */
export function useSettlementTileStream(params: SettlementTileStreamParams | null) {
  const [tiles, setTiles] = useState<Map<string, SettlementTile>>(new Map())
  const [isFetching, setFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloads, setReloads] = useState(0)
  const key = params ? JSON.stringify(params) : null
  const latest = useRef(params)
  latest.current = params

  useEffect(() => {
    const current = latest.current
    setTiles(new Map())
    setError(null)
    if (!key || !current) {
      setFetching(false)
      return
    }
    const abort = new AbortController()
    setFetching(true)
    ;(async () => {
      try {
        const response = await fetch(urlOf(current), { headers: { Accept: 'text/event-stream' }, credentials: 'include', signal: abort.signal })
        if (!response.ok || !response.body) {
          setError((await streamFailure(response, 'The cards could not be loaded')).message)
          return
        }
        await readSse(response.body, (event, data) => {
          if (event === 'tile') {
            const { period, tile } = data as { period: string; tile: SettlementTile }
            setTiles((previous) => new Map(previous).set(period, tile))
          } else if (event === 'failure') {
            setError((data as { message?: string }).message ?? 'The cards could not be loaded')
          }
        })
      } catch (cause) {
        if (!abort.signal.aborted) setError((cause as Error).message || 'The cards could not be loaded')
      } finally {
        // An aborted stream belongs to the newer one: it keeps the fetching flag
        if (!abort.signal.aborted) setFetching(false)
      }
    })()
    return () => abort.abort()
  }, [key, reloads])

  const reload = useCallback(() => setReloads((count) => count + 1), [])

  return { tiles, isFetching, error, reload }
}
