import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Proxy for the in-app "Ask AI" assistant.
 * Browser -> this route -> backend (/ai/screen-qa) -> ai-agent.
 * The response is an SSE stream and is passed through untouched.
 */
export async function POST(req: NextRequest) {
  const apiBase = process.env.API_BASE_URL
  if (!apiBase) {
    return NextResponse.json({ error: 'API base URL not configured' }, { status: 500 })
  }

  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 })
  }

  let upstream: Response
  try {
    // API_BASE_URL may or may not already end in /api
    const backendUrl = `${apiBase.replace(/\/+$/, '').replace(/\/api$/, '')}/api/ai/screen-qa`
    upstream = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: await req.text(),
      // Aborts the backend (and ai-agent) request when the user closes the panel
      signal: req.signal,
      cache: 'no-store',
    })
  } catch (error) {
    if (req.signal.aborted) return new NextResponse(null, { status: 499 })
    console.error('AI proxy error:', error)
    return NextResponse.json({ error: 'AI assistant is unreachable' }, { status: 502 })
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => '')
    let message = 'AI assistant request failed'
    try {
      const parsed = JSON.parse(text)
      message = parsed.error || parsed.message || message
    } catch {}
    return NextResponse.json({ error: message }, { status: upstream.status || 502 })
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
