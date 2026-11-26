'use client'

import React, { useMemo, useState } from 'react'
import { EmptyState } from '@/components/data-display/EmptyState'
import { FilterMultiSelect } from '@/components/filter-bar/FilterMultiSelect'
import { FormField } from '@/components/form-field/FormField'
import { StatusBadge, type StatusTone } from '@/components/status-badge/StatusBadge'
import { KpiCard } from '@/design-system/kpi'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import { useGetRedisFamiliesQuery, useGetRedisOverviewQuery, type RedisFamily, type ScanLockRow, type SessionRow, type TokenRow } from '@/services/api/systemMonitor.api'
import { cn } from '@/utils/cn'
import { MiniBars, Ring, Sparkline } from './charts'
import { ActivityFeed, Panel } from './Panel'
import { ago, formatBytes, formatCount, formatDuration, useNow } from './monitorMeta'
import { useRedisLive } from './useRedisLive'

const FILTER_BOX = 'mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4 shadow-sm'
const SEARCH_INPUT = 'ds-input ds-input-default w-full max-w-sm rounded-lg'
const TYPE_TONE: Record<RedisFamily['type'], StatusTone> = { STRING: 'neutral', HASH: 'info', LIST: 'success', ZSET: 'warning', SET: 'neutral', STREAM: 'info', 'PUB/SUB': 'danger' }
const LOCK_TTL_MS = 90_000
const ACCESS_TOKEN_MS = 3_600_000

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?'

/** "42 min" or "1 h 5 min" until a time, or "expired". */
const leftText = (expiresAt: number | null, now: number): string => (expiresAt === null ? 'no expiry' : expiresAt <= now ? 'expiring' : formatDuration(expiresAt - now))

export const RedisTab: React.FC = () => {
  const now = useNow(1000)
  const { data, isLoading, isError } = useGetRedisOverviewQuery()
  const { data: families = [] } = useGetRedisFamiliesQuery(undefined, { pollingInterval: 30_000 })
  const { feed, ended, fresh, history } = useRedisLive()
  const [search, setSearch] = useState('')
  const [keySearch, setKeySearch] = useState('')
  const [types, setTypes] = useState<string[]>([])

  const sessions = data?.sessions ?? []
  const shownSessions = sessions.filter((row) => !search.trim() || `${row.name} ${row.email ?? ''} ${row.device} ${row.ip ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()))
  const longestLeft = Math.max(1, ...sessions.map((row) => row.expiresAt - now))
  const stats = data?.stats
  const tokens = data?.tokens ?? []
  const healthyTokens = tokens.filter((token) => token.expiresAt === null || token.expiresAt > now).length

  const typeOptions = useMemo(() => [...new Set(families.map((family) => family.type))].map((type) => ({ value: type, label: type })), [families])
  const shownFamilies = families.filter((family) => (types.length === 0 || types.includes(family.type)) && (!keySearch.trim() || `${family.pattern} ${family.purpose} ${family.usedBy}`.toLowerCase().includes(keySearch.trim().toLowerCase())))

  if (isLoading) return <p className="text-sm text-text-muted">Loading…</p>
  if (isError || !data || !stats) return <EmptyState title="Could not reach Redis" description="Redis may be down or switched off in this environment. Try again in a moment." />

  const memoryPct = stats.maxBytes > 0 ? (stats.usedBytes / stats.maxBytes) * 100 : null
  const summary = `${sessions.length} ${sessions.length === 1 ? 'person is' : 'people are'} logged in, ${data.locks.length} ${data.locks.length === 1 ? 'is' : 'are'} scanning stock, and ${healthyTokens} of ${tokens.length} Amazon and TikTok access passes ${healthyTokens === 1 && tokens.length === 1 ? 'is' : 'are'} valid. Redis is using ${formatBytes(stats.usedBytes)}${stats.maxBytes ? ` of ${formatBytes(stats.maxBytes)}` : ''}${stats.hitRate !== null ? ` and ${Math.round(stats.hitRate)}% of lookups are answered from memory` : ''}. ${data.traffic.visitors} ${data.traffic.visitors === 1 ? 'visitor has' : 'visitors have'} made requests in the current window.`

  return (
    <div className="space-y-4">
      <Panel title="What is happening right now" className="border-l-4 border-l-primary-600">
        <p className="text-sm text-text-primary">{summary}</p>
        <p className="mt-2 text-sm text-text-muted">
          Redis is the app&apos;s fast short-term memory. It remembers who is logged in, temporary Amazon access passes, who is scanning stock, and the job system&apos;s to-do trays. Nothing in it is permanent: items delete themselves when their timer runs out. This page shows what that memory means in practice, and lists every kind of key at the bottom.
        </p>
      </Panel>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard title="Redis" value="Connected" subtitle={`version ${stats.version}, up ${formatDuration(stats.uptimeSec * 1000)}`} />
        <KpiCard title="People online" value={formatCount(sessions.length)} subtitle="login sessions stored" />
        <KpiCard title="Operations per second" value={formatCount(stats.opsPerSec)} subtitle="reads and writes" icon={<Sparkline label="Operations per second" values={history.ops} />} />
        <KpiCard title="Answered from memory" value={stats.hitRate === null ? '—' : `${stats.hitRate}%`} subtitle="without asking the database" />
        <KpiCard title="Evicted items" value={formatCount(stats.evicted)} subtitle={stats.evicted === 0 ? 'nothing lost to lack of space' : 'removed to make room'} className={stats.evicted > 0 ? 'border-warning-200 bg-warning-50' : undefined} />
      </div>

      <Panel title="Who is logged in" subtitle="Each row is one login session stored in Redis. When someone logs out or the session times out, it is deleted and the row disappears here by itself.">
        <div className={FILTER_BOX}>
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, device or address" aria-label="Search sessions" className={SEARCH_INPUT} />
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <div className="text-2xl font-bold text-text-primary">{sessions.length}</div>
              <div className="text-xs text-text-muted">online now</div>
            </div>
          </div>
        </div>
        {shownSessions.length === 0 ? (
          <p className="py-4 text-sm text-text-muted">{sessions.length === 0 ? 'Nobody is logged in.' : 'No session matches.'}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Logged in</TableHead>
                <TableHead>Last active</TableHead>
                <TableHead>Session expires in</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shownSessions.map((row) => (
                <SessionLine key={row.key} row={row} now={now} longest={longestLeft} ending={ended.has(row.key)} isNew={fresh.has(row.key)} />
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>

      <Panel title="Connections to Amazon and other services" subtitle="Temporary access passes, kept so the app does not sign in again on every request. The ring shows time left before renewal, which happens automatically. Only names and timers are read here, never the passes themselves.">
        {tokens.length === 0 ? (
          <p className="text-sm text-text-muted">No saved connections found.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {tokens.map((token) => (
              <TokenCard key={token.key} token={token} now={now} isNew={fresh.has(token.key)} />
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Who is scanning right now" subtitle="While a person scans, a lock stops anyone else scanning the same shipment or order. Every heartbeat renews it; if nobody does, it lapses after 90 seconds.">
        {data.locks.length === 0 ? (
          <p className="text-sm text-text-muted">Nobody is scanning right now.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.locks.map((lock) => (
              <LockCard key={lock.key} lock={lock} now={now} ending={ended.has(lock.key)} isNew={fresh.has(lock.key)} />
            ))}
          </div>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Traffic and abuse protection" subtitle="Requests per visitor in the current window. A visitor who asks too often is blocked until the window ends.">
          <MiniBars values={history.requests} label="Requests in the current window over time" />
          <div className="mt-3 text-sm text-text-muted">
            {formatCount(data.traffic.visitors)} visitors · {formatCount(data.traffic.requests)} requests in the current window
          </div>
          {data.traffic.busiest.length > 0 && (
            <Table wrapperClassName="mt-2">
              <TableHeader>
                <TableRow>
                  <TableHead>Visitor</TableHead>
                  <TableHead>Requests</TableHead>
                  <TableHead>Window ends in</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.traffic.busiest.map((visitor) => (
                  <TableRow key={visitor.ip}>
                    <TableCell className="font-mono text-sm">{visitor.ip}</TableCell>
                    <TableCell className="font-mono text-sm">{visitor.requests}</TableCell>
                    <TableCell className="text-sm text-text-muted">{formatDuration(Math.max(0, visitor.resetsInMs))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Panel>
        <Panel title="Memory and cache" subtitle="How full memory is and how often answers come from it">
          <div className="flex flex-wrap justify-center gap-6">
            <div className="text-center">
              <Ring pct={memoryPct ?? 0} label={formatBytes(stats.usedBytes)} size={96} stroke={10} tone={memoryPct !== null && memoryPct > 85 ? 'bad' : 'info'} ariaLabel="Memory used" />
              <div className="mt-1 text-sm font-semibold">Memory used</div>
              <div className="text-xs text-text-muted">{stats.maxBytes ? `of ${formatBytes(stats.maxBytes)}` : 'no limit set'}</div>
            </div>
            <div className="text-center">
              <Ring pct={stats.hitRate ?? 0} label={stats.hitRate === null ? '—' : `${stats.hitRate}%`} size={96} stroke={10} ariaLabel="Answered from memory" />
              <div className="mt-1 text-sm font-semibold">Answered from memory</div>
              <div className="text-xs text-text-muted">without asking the database</div>
            </div>
          </div>
          <div className="mt-3 text-sm text-text-muted">
            {formatCount(stats.keys)} items stored · {formatCount(stats.clients)} connected clients · {formatCount(stats.expired)} expired on their own
          </div>
        </Panel>
      </div>

      <Panel title="Live activity" subtitle="Changes in Redis, in plain words">
        <ActivityFeed items={feed} empty="Nothing yet. Logins, logouts, scans and renewals appear here as they happen." />
      </Panel>

      <Panel title="Everything stored in Redis, key by key" subtitle="Each row is a family of keys the backend writes. Open one to see the data it holds, how long it lives, and where it appears on this page. STRING is one value, HASH a record with named fields, LIST an ordered queue, ZSET a sorted set (ordered by a score such as run time), PUB/SUB a broadcast that stores nothing. No plain SET is used today; BullMQ uses ZSETs.">
        <div className={FILTER_BOX}>
          <input type="search" value={keySearch} onChange={(event) => setKeySearch(event.target.value)} placeholder="Search keys or what they are for" aria-label="Search keys" className={SEARCH_INPUT} />
          <div className="w-full sm:w-56">
            <FormField label="Type" htmlFor="monitor-key-type">
              <FilterMultiSelect id="monitor-key-type" options={typeOptions} value={types} onChange={setTypes} anyLabel="All types" />
            </FormField>
          </div>
        </div>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {shownFamilies.map((family) => (
            <li key={family.id}>
              <details className="group">
                <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-3 py-2.5 hover:bg-secondary-50">
                  <StatusBadge label={family.type} tone={TYPE_TONE[family.type]} />
                  <span className="min-w-0 flex-1 break-all font-mono text-sm text-text-primary">{family.pattern}</span>
                  <span className="text-xs text-text-muted">{family.count === null ? '' : `${formatCount(family.count)}${family.capped ? '+' : ''} keys`}</span>
                </summary>
                <div className="space-y-3 border-t border-border bg-secondary-50/50 px-3 py-3 text-sm">
                  <p className="text-text-primary">{family.purpose}</p>
                  <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-3">
                    <Detail label="Lives for" value={family.lives} />
                    <Detail label="Written by" value={family.usedBy} mono />
                    <Detail label="Shown here as" value={family.shownAs} />
                  </dl>
                  <div>
                    <div className="mb-1 text-xs font-semibold text-text-muted">Data it holds</div>
                    <ul className="space-y-1">
                      {family.fields.map((field) => (
                        <li key={field.name} className="flex flex-wrap gap-x-3">
                          <span className="font-mono text-xs text-text-primary">{field.name}</span>
                          <span className="text-text-muted">{field.meaning}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </details>
            </li>
          ))}
          {shownFamilies.length === 0 && <li className="p-4 text-sm text-text-muted">No key matches.</li>}
        </ul>
      </Panel>
    </div>
  )
}

const Detail: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div>
    <dt className="text-xs text-text-muted">{label}</dt>
    <dd className={cn('text-text-primary', mono && 'break-all font-mono text-xs')}>{value}</dd>
  </div>
)

const SessionLine: React.FC<{ row: SessionRow; now: number; longest: number; ending: boolean; isNew: boolean }> = ({ row, now, longest, ending, isNew }) => {
  const left = Math.max(0, row.expiresAt - now)
  return (
    <TableRow className={cn(ending && 'bg-danger-50 transition-all duration-500', isNew && 'monitor-enter')}>
      <TableCell>
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-600 text-xs font-bold text-white" aria-hidden="true">
            {initials(row.name)}
          </span>
          <div className="min-w-0">
            <div className="text-sm font-medium text-text-primary">
              {row.name} {ending && <span className="ml-1 text-xs font-semibold text-danger-700">logged out</span>}
            </div>
            <div className="truncate text-xs text-text-muted">{row.email}</div>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-sm">
        <div>{row.device}</div>
        <div className="font-mono text-xs text-text-muted">{row.ip ?? '—'}</div>
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm">{row.loggedInAt ? ago(new Date(row.loggedInAt).getTime(), now) : '—'}</TableCell>
      <TableCell className="whitespace-nowrap text-sm">{row.lastSeenAt ? ago(new Date(row.lastSeenAt).getTime(), now) : '—'}</TableCell>
      <TableCell>
        <div className="flex min-w-[10rem] items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary-100">
            <div className="h-full rounded-full bg-success-500 transition-[width] duration-1000 ease-linear" style={{ width: `${Math.min(100, (left / longest) * 100)}%` }} />
          </div>
          <span className="w-20 text-right font-mono text-xs text-text-muted">{formatDuration(left)}</span>
        </div>
      </TableCell>
    </TableRow>
  )
}

const TokenCard: React.FC<{ token: TokenRow; now: number; isNew: boolean }> = ({ token, now, isNew }) => {
  const left = token.expiresAt === null ? null : Math.max(0, token.expiresAt - now)
  const pct = token.renewing ? 100 : left === null ? 100 : Math.min(100, (left / ACCESS_TOKEN_MS) * 100)
  return (
    <div className={cn('flex items-center gap-3 rounded-lg border p-3', token.renewing ? 'border-sky-200 bg-sky-50' : 'border-border', isNew && 'monitor-enter')}>
      <Ring pct={pct} label={token.renewing ? '…' : left === null ? '∞' : `${Math.floor(left / 60000)}m`} tone={token.renewing ? 'info' : pct < 20 ? 'warn' : 'good'} ariaLabel={`${token.label}: ${token.renewing ? 'renewing' : leftText(token.expiresAt, now)} left`} />
      <div className="min-w-0">
        <div className="text-sm font-semibold text-text-primary">{token.label}</div>
        <div className="text-xs text-text-muted">{token.renewing ? 'Renewing the access pass now' : token.what}</div>
        <div className="truncate font-mono text-[11px] text-text-muted">{token.key}</div>
      </div>
    </div>
  )
}

const LockCard: React.FC<{ lock: ScanLockRow; now: number; ending: boolean; isNew: boolean }> = ({ lock, now, ending, isNew }) => {
  const left = Math.max(0, lock.expiresAt - now)
  return (
    <div className={cn('flex items-center gap-3 rounded-lg border border-border p-3 transition-all duration-500', ending && 'scale-95 opacity-40', isNew && 'monitor-enter')}>
      <Ring pct={(left / LOCK_TTL_MS) * 100} label={`${Math.ceil(left / 1000)}s`} tone={left < 20_000 ? 'warn' : 'good'} ariaLabel={`Lock lapses in ${Math.ceil(left / 1000)} seconds`} />
      <div className="min-w-0">
        <div className="text-sm font-semibold text-text-primary">{lock.name}</div>
        <div className="text-sm text-text-secondary">
          {lock.scenario} <span className="font-mono text-xs">{lock.sourceId}</span>
        </div>
        <div className="truncate font-mono text-[11px] text-text-muted">{lock.key}</div>
      </div>
    </div>
  )
}
