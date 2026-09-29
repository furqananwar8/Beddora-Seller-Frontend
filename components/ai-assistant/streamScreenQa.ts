import { EventSourceParserStream } from 'eventsource-parser/stream'
import type { ScreenQaPayload } from './collectScreenContext'

/**
 * POSTs to the Next proxy and reads the SSE stream, calling onToken for each
 * chunk. Resolves when the stream ends; throws on transport/agent errors.
 */
export async function streamScreenQa(
  payload: ScreenQaPayload,
  accessToken: string | null,
  onToken: (token: string) => void,
  signal: AbortSignal
): Promise<void> {
  const res = await fetch('/api/ai/screen-qa', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(payload),
    signal,
  })

  if (!res.ok || !res.body) {
    let message = 'Something went wrong. Please try again.'
    if (res.status === 401) message = 'Your session has expired. Please sign in again.'
    else if (res.status === 429) message = 'Too many questions. Please wait a moment.'
    else {
      const body = await res.json().catch(() => null)
      message = body?.error || body?.message || message
    }
    throw new Error(message)
  }

  const events = res.body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new EventSourceParserStream())
  const reader = events.getReader()

  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) return
      if (value.data === '[DONE]') return
      let parsed: { token?: string; error?: string }
      try {
        parsed = JSON.parse(value.data)
      } catch {
        continue
      }
      if (parsed.error) throw new Error(parsed.error)
      if (parsed.token) onToken(parsed.token)
    }
  } finally {
    reader.cancel().catch(() => {})
  }
}
