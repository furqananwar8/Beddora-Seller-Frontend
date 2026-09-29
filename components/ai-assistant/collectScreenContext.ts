import type { RootState } from '@/store/store'
import { readAiContext } from './aiContext'

/**
 * Builds the dynamic payload for /api/ai/screen-qa from whatever screen the
 * user is on, as ONE compact plain-text snapshot:
 *   1. data the page registered with useAiContext()
 *   2. every table on screen (header once, then one line per row)
 *   3. remaining page text (KPI tiles one line each, filters, pagination)
 *   4. fallback only: data of RTK Query calls in use by the page
 *   5. what the user right-clicked / selected
 *
 * Size is the main latency driver: the agent's CPU model must read the whole
 * prompt before its first token (measured direct: ~2s with no context, ~18s
 * at 1.2 KB, ~28s at 2.5 KB, ~80s at 9 KB), so everything is budgeted to
 * ~2.5 KB max and serialised as terse text, not JSON.
 */

export interface ScreenQaPayload {
  question: string
  screenInfo?: { title?: string; route?: string }
  screenData?: string
  /** Agent reads and caches the prompt but generates nothing (see AiAssistant warm-up) */
  warmup?: boolean
}

const BUDGET = {
  focus: 500,
  registered: 1300,
  tables: 1300,
  otherText: 1600, // gets whatever registered data + tables left, up to this
  apiFallback: 1200,
  total: 2600,
}
const MAX_ROWS_PER_TABLE = 25
const MAX_CELL = 60

// Endpoints that carry identity/permission data: never sent to the AI
const SKIP_ENDPOINT =
  /auth|login|logout|refresh|permission|ability|casl|token|session|currentuser|account|invite|user/i
// Keys whose values are never sent, wherever they appear
const SENSITIVE_KEY = /pass(word)?|secret|token|hash|authorization|api_?key|cookie|otp|twofactor/i
// Noise keys that only cost tokens
const NOISE_KEY = /^(id|_id|success|createdAt|updatedAt|imageUrl|image|url|icon|__typename)$/i

const TABLE_SELECTOR = 'table, [role="table"], [role="grid"]'
const CELL_SELECTOR = 'td, [role="cell"], [role="gridcell"]'
const REGISTERED_SELECTOR = '[data-ai-registered]'
const CARD_SELECTOR = '.ds-card, [class*="card"]:not([class*="card-"])'
const EMPTY_TEXT = /\bno\b.*\b(found|data|results|records|items|products|orders)\b|nothing to show/i
const EMPTY_NOTE = 'EMPTY (no rows for the current filters)'

// Appended after the question. Tested: the 3B model only reliably follows these
// (e.g. "say there is no data" instead of inventing products) when they come
// right after the question; placed anywhere in the context it ignores them.
// Costs ~110 prompt tokens per question, the only part not served from cache.
const RULES =
  '\n\n(Rules: use only exact values from the screen data; never invent names, IDs or numbers; no placeholders. ' +
  'If the data needed is EMPTY, say there is no data for the current filters and suggest changing the date range or marketplace. ' +
  'Glossary: "Adv. cost"/"Ads" = advertising spend (shown negative), ACOS = ad cost / sales, COGS = cost of goods, ' +
  '"Est. payout" = expected Amazon payout, "(empty)" = value not set. Be concise: under 120 words.)'

// Action buttons are noise; controls that show a current choice are kept
const ACTION_BUTTON =
  'button:not([aria-haspopup]):not([aria-expanded]):not([aria-pressed="true"]):not([aria-selected="true"]):not([role="combobox"]):not([role="tab"])'

/** Cuts at a line boundary so no tile or row is left half-written. */
function cutLines(text: string, limit: number): string {
  if (text.length <= limit) return text
  const cut = text.lastIndexOf('\n', limit)
  return cut > 0 ? text.slice(0, cut) : text.slice(0, limit)
}

/** What the user pointed at, captured when the panel opened (clicking into it clears the selection). */
export interface ScreenFocus {
  target?: HTMLElement | null
  selection?: string
}

/* ───────────── compact serialisation ───────────── */

function num(v: number): string {
  return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100)
}

function isEmptyData(value: unknown): boolean {
  if (value == null) return true
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value as object).length === 0
  return false
}

function scalar(v: unknown): string | null {
  if (v == null || v === '') return null
  if (typeof v === 'number') return num(v)
  if (typeof v === 'string') return v.length > MAX_CELL ? `${v.slice(0, MAX_CELL)}…` : v
  if (typeof v === 'boolean') return v ? 'yes' : 'no'
  return null
}

/** Flattens an object into "a.b=1, c=2" pairs, dropping empty/noisy/sensitive keys. */
function flatten(obj: Record<string, unknown>, prefix = '', depth = 0, out: string[] = []): string[] {
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEY.test(k) || NOISE_KEY.test(k)) continue
    const key = prefix ? `${prefix}.${k}` : k
    const s = scalar(v)
    if (s !== null) out.push(`${key}=${s}`)
    else if (v && typeof v === 'object' && !Array.isArray(v) && depth < 2) flatten(v as any, key, depth + 1, out)
    else if (Array.isArray(v) && v.length) out.push(`${key}=[${v.length} items]`)
  }
  return out
}

/** Arrays of objects become a header line plus one "a | b | c" line per row. */
function toText(value: unknown, budget: number): string {
  if (isEmptyData(value)) return EMPTY_NOTE
  const s = scalar(value)
  if (s !== null) return s
  if (Array.isArray(value)) {
    const rows = value.filter((r) => r && typeof r === 'object') as Record<string, unknown>[]
    if (!rows.length) return value.map(scalar).filter(Boolean).join(', ').slice(0, budget)
    const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r)))).filter(
      (k) => !SENSITIVE_KEY.test(k) && !NOISE_KEY.test(k) && rows.some((r) => scalar(r[k]) !== null)
    )
    const lines = [`columns: ${cols.join(' | ')}`]
    let used = lines[0].length
    for (const r of rows) {
      const line = cols.map((c) => scalar(r[c]) ?? '-').join(' | ')
      if (used + line.length > budget) {
        lines.push(`…${rows.length - lines.length + 1} more rows`)
        break
      }
      used += line.length + 1
      lines.push(line)
    }
    return lines.join('\n')
  }
  // Unwrap { success, data } style envelopes
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).filter((k) => !NOISE_KEY.test(k))
  if (keys.length === 1 && obj[keys[0]] && typeof obj[keys[0]] === 'object') {
    return toText(obj[keys[0]], budget)
  }
  return flatten(obj).join(', ').slice(0, budget)
}

/* ───────────── DOM extraction ───────────── */

function clean(text: string | null | undefined, limit: number): string {
  return (text ?? '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim()
    .slice(0, limit)
}

function oneLine(text: string | null | undefined, limit: number): string {
  return (text ?? '').replace(/\s+/g, ' ').replace(/[↑↓▲▼⇅]/g, '').trim().slice(0, limit)
}

function cellText(cell: HTMLElement): string {
  // Editable cells (e.g. COGS inputs) keep their value outside innerText
  const fields = Array.from(cell.querySelectorAll<HTMLInputElement>('input, select, textarea'))
    .filter((f) => f.type !== 'checkbox' && f.type !== 'hidden' && f.value)
    .map((f) => f.value)
  const text = oneLine([cell.innerText, ...fields].join(' '), MAX_CELL)
  // A bare currency sign or dash is an unset value (e.g. COGS input with no value)
  if (!text) return ''
  return /^(C?\$|€|£|¥|[-—–]+)$/.test(text.replace(/\s|🔒/g, '')) ? '(empty)' : text
}

/** Every table: header once, then one line per row. Empty states are labelled. */
function collectTables(root: HTMLElement, budget: number): string {
  const out: string[] = []
  let used = 0
  let lastHeaders: string[] = []

  root.querySelectorAll<HTMLElement>(TABLE_SELECTOR).forEach((table) => {
    if (table.parentElement?.closest(TABLE_SELECTOR)) return

    let headers = Array.from(
      table.querySelectorAll<HTMLElement>('th, [role="columnheader"]')
    ).map((h) => oneLine(h.innerText, 30))
    if (headers.some(Boolean)) lastHeaders = headers
    // Header and body are often separate tables (sticky header): reuse the last header row
    else headers = lastHeaders

    if (table.closest(REGISTERED_SELECTOR) || used >= budget) return

    const rowEls = Array.from(table.querySelectorAll<HTMLElement>('tr, [role="row"]')).filter(
      (r) => r.querySelector(CELL_SELECTOR)
    )
    // Header-only tables (sticky headers rendered separately) carry no data
    if (!rowEls.length) return
    const cols = headers.filter(Boolean).join(' | ')
    const onlyRow = rowEls.length === 1 ? oneLine(rowEls[0].innerText, 120) : ''
    if (onlyRow && EMPTY_TEXT.test(onlyRow)) {
      const note = `Table (${cols || 'no header'}): ${EMPTY_NOTE}`
      used += note.length
      out.push(note)
      return
    }

    const lines = [`Table, ${rowEls.length} rows on screen. columns: ${cols}`]
    for (const row of rowEls.slice(0, MAX_ROWS_PER_TABLE)) {
      const line = Array.from(row.querySelectorAll<HTMLElement>(CELL_SELECTOR))
        .map(cellText)
        .join(' | ')
        .replace(/^( \| )+/, '')
      if (used + line.length > budget) break
      used += line.length + 1
      lines.push(line)
    }
    out.push(lines.join('\n'))
  })

  return out.join('\n\n')
}

/**
 * Page text outside tables (KPI tiles, headings, filters, pagination).
 * Only what is actually visible: tooltips/popovers hidden with opacity or
 * visibility are dropped, and form controls are read by their current value
 * (selected marketplace, currency, search text). Long repeated lines (e.g. a
 * filter caption shown twice) are removed; short values never are, since
 * different tiles legitimately show the same number.
 */
function collectOtherText(main: HTMLElement, limit: number): string {
  const clone = main.cloneNode(true) as HTMLElement
  // Same document order in both trees, so index i maps original -> clone
  const originals = main.querySelectorAll<HTMLElement>('*')
  const copies = clone.querySelectorAll<HTMLElement>('*')
  const hidden: Element[] = []
  const replacements: [Element, string][] = []
  originals.forEach((el, i) => {
    if (el instanceof HTMLSelectElement) {
      // A bare "CAD" line reads like a data row; say it is a chosen filter value
      const label =
        el.getAttribute('aria-label') || el.labels?.[0]?.innerText || el.name || 'Selected filter'
      const value = el.selectedOptions[0]?.text
      replacements.push([copies[i], value ? `${oneLine(label, 40)}: ${value}` : ''])
      return
    }
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      const skip = ['checkbox', 'radio', 'hidden', 'password'].includes(el.type)
      replacements.push([copies[i], skip || !el.value ? '' : `[${el.placeholder || 'input'}: ${el.value}]`])
      return
    }
    const visible = el.checkVisibility
      ? el.checkVisibility({ opacityProperty: true, visibilityProperty: true } as any)
      : el.offsetParent !== null
    if (!visible) hidden.push(copies[i])
  })
  // Replace controls first: a replaced node may sit inside a hidden one
  for (const [node, text] of replacements) {
    const span = document.createElement('span')
    span.textContent = text ? ` ${text} ` : ''
    node.replaceWith(span)
  }
  hidden.forEach((n) => n.remove())
  clone
    .querySelectorAll(
      `${TABLE_SELECTOR}, ${REGISTERED_SELECTOR}, ${ACTION_BUTTON}, svg, script, style, [data-ai-assistant]`
    )
    .forEach((n) => n.remove())

  // innerText only keeps line breaks when the node is rendered
  Object.assign(clone.style, { position: 'fixed', left: '-99999px', top: '0', width: '1200px' })
  document.body.appendChild(clone)
  let text: string
  try {
    // One line per card/tile ("Month to date | Sales | $76,893.82 | ..."), so every
    // value stays attached to its card title instead of floating between cards
    const cards = Array.from(clone.querySelectorAll<HTMLElement>(CARD_SELECTOR)).filter(
      (c) => !c.parentElement?.closest(CARD_SELECTOR)
    )
    const flattened = cards.map((c) => {
      const parts = c.innerText.split('\n').map((l) => oneLine(l, 80)).filter(Boolean)
      // Inside a card the label comes first: "Sales", "$0.00" -> "Sales: $0.00"
      const paired: string[] = []
      for (let i = 0; i < parts.length; i++) {
        const next = parts[i + 1]
        if (next && !/\d/.test(parts[i]) && /\d/.test(next)) {
          paired.push(`${parts[i]}: ${next}`)
          i++
        } else if (paired.length && /^[-+]?[\d.,]+%$/.test(parts[i])) {
          paired[paired.length - 1] += ` (${parts[i]})` // trend badge like "+5.99%"
        } else paired.push(parts[i])
      }
      return [c, paired.join(' | ')] as const
    })
    for (const [card, line] of flattened) {
      const div = document.createElement('div')
      div.textContent = line
      card.replaceWith(div)
    }
    text = clone.innerText
  } finally {
    clone.remove()
  }

  const seen = new Set<string>()
  const lines = text
    .split('\n')
    .map((l) => oneLine(l, 400))
    .filter((l) => {
      if (!l) return false
      if (l.length < 20 || /\d/.test(l)) return true
      if (seen.has(l)) return false
      seen.add(l)
      return true
    })
  return cutLines(lines.join('\n'), limit)
}

/* ───────────── API cache (fallback) ───────────── */

function collectApiData(state: RootState, budget: number): string {
  const api = (state as any).api
  const queries: Record<string, any> = api?.queries ?? {}
  const subscriptions: Record<string, Record<string, unknown>> = api?.subscriptions ?? {}

  const active = Object.entries(queries)
    .filter(
      ([key, q]) =>
        q?.status === 'fulfilled' &&
        // still subscribed = used by a component that is on screen
        Object.keys(subscriptions[key] ?? {}).length > 0 &&
        !SKIP_ENDPOINT.test(q.endpointName ?? '')
    )
    .map(([, q]) => q)
    .sort((a, b) => (b.fulfilledTimeStamp ?? 0) - (a.fulfilledTimeStamp ?? 0))

  const parts: string[] = []
  let left = budget
  for (const q of active) {
    if (left < 150) break
    const body = toText(q.data, left)
    const block = `${q.endpointName}: ${body}`
    left -= block.length
    parts.push(block)
  }
  return parts.join('\n')
}

/* ───────────── payload ───────────── */

/**
 * Sections go from most to least stable: the agent caches the prompt prefix, so
 * as long as the screen is unchanged a follow-up question (or a question after
 * the warm-up request) only costs reading the question itself.
 */
export function collectScreenContext(
  question: string,
  state: RootState,
  focus: ScreenFocus = {}
): ScreenQaPayload {
  const main = document.querySelector<HTMLElement>('.ds-content')
  const sections: string[] = []
  const size = () => sections.reduce((n, s) => n + s.length + 2, 0)

  // Data the page registered explicitly is the most reliable
  let left = BUDGET.registered
  for (const entry of readAiContext()) {
    if (left < 150) break
    const body = toText(entry.data, left)
    left -= body.length
    sections.push(`${entry.pageName}:\n${body}`)
  }

  let hasScreenData = sections.length > 0
  if (main) {
    const tables = collectTables(main, BUDGET.tables)
    if (tables) {
      sections.push(`TABLES:\n${tables}`)
      hasScreenData = true
    }
    const room = Math.min(BUDGET.otherText, BUDGET.total - BUDGET.focus - size())
    const other = room > 200 ? collectOtherText(main, room) : ''
    if (other) sections.push(`PAGE TEXT:\n${other}`)
  }

  // The API cache duplicates what is rendered; only use it when the screen has no data view
  if (!hasScreenData) {
    const api = collectApiData(state, BUDGET.apiFallback)
    if (api) sections.push(`DATA LOADED BY THIS SCREEN:\n${api}`)
  }

  // What the user pointed at changes most often, so it goes last
  if (focus.selection?.trim()) {
    sections.push(`USER SELECTED:\n${clean(focus.selection, BUDGET.focus)}`)
  }
  const focusEl = focus.target?.closest<HTMLElement>('tr, [role="row"], li, [class*="card"], section')
  const pointed = oneLine(focusEl?.innerText, BUDGET.focus)
  if (pointed) sections.push(`USER RIGHT-CLICKED:\n${pointed}`)

  const screenData = sections.length
    ? cutLines(sections.join('\n\n'), BUDGET.total)
    : ''

  return {
    question: screenData ? question + RULES : question,
    screenInfo: { title: document.title || undefined, route: window.location.pathname },
    ...(screenData ? { screenData } : {}),
  }
}
