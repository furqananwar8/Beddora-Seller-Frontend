import { EventSourceParserStream } from 'eventsource-parser/stream'
import { serverIssues, type ServerIssue } from '@/utils/apiErrors'

/** Reads a Server-Sent Events response (EventSource can't POST), handing each named frame's JSON to `onFrame` until the stream ends. */
export async function readSse(body: NonNullable<Response['body']>, onFrame: (event: string, data: unknown) => void): Promise<void> {
  const reader = body.pipeThrough(new TextDecoderStream()).pipeThrough(new EventSourceParserStream()).getReader()
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      if (!value.event) continue
      let data: unknown
      try {
        data = JSON.parse(value.data)
      } catch {
        continue
      }
      onFrame(value.event, data)
    }
  } finally {
    reader.cancel().catch(() => undefined)
  }
}

/** The JSON error a stream request is answered with before it starts (400 with issues, 401, 403…). */
export async function streamFailure(response: Response, fallback: string): Promise<{ message: string; issues: ServerIssue[] }> {
  const data: unknown = await response.json().catch(() => null)
  const body = data as { message?: string; error?: string } | null
  return { message: body?.message || body?.error || `${fallback} (${response.status})`, issues: serverIssues({ data }) }
}
