'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Bot, Send, Square, X } from 'lucide-react'
import { useStore } from 'react-redux'
import type { RootState } from '@/store/store'
import { collectScreenContext, type ScreenFocus } from './collectScreenContext'
import { streamScreenQa } from './streamScreenQa'

interface Turn {
  id: number
  question: string
  answer: string
  error?: string
  stopped?: boolean
  pending: boolean
}

interface MenuState {
  x: number
  y: number
  target: HTMLElement
  selection: string
}

// Sent (hidden, with warmup: true) when the panel opens so the agent reads this
// screen's context while the user is still typing; the real question then reuses
// it from cache. The agent generates a single token for it, so it never holds up
// the user's question.
const WARM_UP_QUESTION = 'ready'

const selectedText = () => window.getSelection()?.toString() ?? ''

/**
 * In-app "Ask AI" assistant: a floating bot button plus an "Ask AI" entry on
 * right click (hold Shift for the browser's own menu). Each question is sent
 * with the current screen's data so the answer is about what the user sees.
 * One question at a time: while an answer streams, the input is locked and
 * only Stop is available.
 */
export function AiAssistant() {
  const store = useStore<RootState>()
  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [input, setInput] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const [busy, setBusy] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  // What the user pointed at when opening the panel; kept for the whole
  // conversation so follow-ups share the same (cached) context
  const focusRef = useRef<ScreenFocus>({})
  const warmedRef = useRef('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const nextId = useRef(1)

  // Right-click => "Ask AI" (only inside the page content, never on inputs)
  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null
      if (!el || e.shiftKey) return
      if (!el.closest('.ds-content')) return
      if (el.closest('input, textarea, select, [contenteditable="true"], [data-ai-assistant]')) return
      e.preventDefault()
      setMenu({ x: e.clientX, y: e.clientY, target: el, selection: selectedText() })
    }
    const close = () => setMenu(null)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenu(null)
        setOpen(false)
      }
    }
    document.addEventListener('contextmenu', onContextMenu)
    document.addEventListener('click', close)
    document.addEventListener('scroll', close, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('contextmenu', onContextMenu)
      document.removeEventListener('click', close)
      document.removeEventListener('scroll', close, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const warmUp = useCallback(() => {
    const state = store.getState()
    const payload = { ...collectScreenContext(WARM_UP_QUESTION, state, focusRef.current), warmup: true }
    const key = `${payload.screenInfo?.route}\n${payload.screenData ?? ''}`
    if (!payload.screenData || key === warmedRef.current) return
    warmedRef.current = key
    streamScreenQa(payload, state.auth?.accessToken ?? null, () => {}, new AbortController().signal).catch(
      () => {
        warmedRef.current = '' // let the next open retry
      }
    )
  }, [store])

  useEffect(() => {
    if (!open) {
      focusRef.current = {}
      return
    }
    inputRef.current?.focus()
    const timer = setTimeout(warmUp, 150)
    return () => clearTimeout(timer)
  }, [open, warmUp])

  // Unlock and refocus the input once an answer is finished or stopped
  useEffect(() => {
    if (open && !busy) inputRef.current?.focus()
  }, [open, busy])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [turns])

  useEffect(() => () => abortRef.current?.abort(), [])

  const ask = useCallback(async () => {
    const question = input.trim()
    if (!question || busy) return

    const id = nextId.current++
    setTurns((t) => [...t, { id, question, answer: '', pending: true }])
    setInput('')
    setBusy(true)

    const state = store.getState()
    const payload = collectScreenContext(question, state, focusRef.current)

    const controller = new AbortController()
    abortRef.current = controller
    const patch = (fn: (t: Turn) => Turn) =>
      setTurns((all) => all.map((t) => (t.id === id ? fn(t) : t)))

    try {
      await streamScreenQa(
        payload,
        state.auth?.accessToken ?? null,
        (token) => patch((t) => ({ ...t, answer: t.answer + token })),
        controller.signal
      )
      patch((t) => ({ ...t, pending: false }))
    } catch (err) {
      if (controller.signal.aborted) {
        patch((t) => ({ ...t, pending: false, stopped: true }))
      } else {
        patch((t) => ({
          ...t,
          pending: false,
          error: err instanceof Error ? err.message : 'Something went wrong.',
        }))
      }
    } finally {
      setBusy(false)
      abortRef.current = null
    }
  }, [input, busy, store])

  const stop = () => abortRef.current?.abort()

  return (
    <div data-ai-assistant>
      {menu && (
        <div
          role="menu"
          className="fixed z-[60] min-w-[140px] rounded-lg border border-border bg-surface py-1 shadow-lg"
          style={{
            left: Math.min(menu.x, window.innerWidth - 160),
            top: Math.min(menu.y, window.innerHeight - 50),
          }}
        >
          <button
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-secondary-100"
            onClick={() => {
              focusRef.current = { target: menu.target, selection: menu.selection }
              warmedRef.current = '' // new focus -> new context worth warming
              setOpen(true)
              setMenu(null)
            }}
          >
            <Bot className="h-4 w-4" /> Ask AI
          </button>
        </div>
      )}

      {open ? (
        <div className="fixed bottom-5 right-5 z-50 flex h-[480px] max-h-[80vh] w-[380px] max-w-[calc(100vw-2rem)] flex-col rounded-xl border border-border bg-surface shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <Bot className="h-4 w-4" /> Ask AI
            </div>
            <button
              className="rounded p-1 text-text-muted hover:bg-secondary-100"
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-3 text-sm">
            {turns.length === 0 && (
              <p className="text-text-muted">
                Ask anything about this screen, e.g. &quot;Which product should we spend more on
                ads?&quot;. I can see the data shown on this page.
              </p>
            )}
            {turns.map((t) => (
              <div key={t.id} className="space-y-2">
                <div className="ml-auto w-fit max-w-[90%] rounded-lg bg-secondary-100 px-3 py-2 text-text-primary">
                  {t.question}
                </div>
                <div className="whitespace-pre-wrap break-words text-text-secondary">
                  {t.answer || (t.pending && !t.error ? 'Thinking…' : '')}
                </div>
                {t.stopped && <div className="text-xs text-text-muted">Stopped.</div>}
                {t.error && <div className="text-red-600">{t.error}</div>}
              </div>
            ))}
          </div>

          <form
            className="flex items-end gap-2 border-t border-border p-3"
            onSubmit={(e) => {
              e.preventDefault()
              ask()
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              rows={1}
              maxLength={4000}
              disabled={busy}
              placeholder={busy ? 'Answering… press Stop to cancel' : 'Ask about this screen…'}
              className="max-h-28 flex-1 resize-none rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-secondary-400 disabled:cursor-not-allowed disabled:bg-secondary-50"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  ask()
                }
              }}
            />
            {busy ? (
              <button
                type="button"
                onClick={stop}
                aria-label="Stop"
                title="Stop generating"
                className="rounded-lg bg-secondary-200 p-2 text-text-primary"
              >
                <Square className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="submit"
                aria-label="Send"
                disabled={!input.trim()}
                className="rounded-lg bg-primary-500 p-2 text-white disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            )}
          </form>
        </div>
      ) : (
        <button
          aria-label="Ask AI"
          title="Ask AI"
          // Capture the selection before the click can clear it
          onMouseDown={() => {
            focusRef.current = { selection: selectedText() }
          }}
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg hover:opacity-90"
        >
          <Bot className="h-6 w-6" />
        </button>
      )}
    </div>
  )
}
