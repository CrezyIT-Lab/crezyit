import { NextRequest, NextResponse } from 'next/server'

const OLLAMA = 'http://localhost:11434'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const messages = body.messages || []
    const model = body.model || 'qwen2.5-coder:7b'

    const response = await fetch(OLLAMA + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: true })
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Ollama error: ' + response.status }, { status: 500 })
    }

    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader()
        if (!reader) { controller.close(); return }

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n').filter(Boolean)

            for (const line of lines) {
              try {
                const data = JSON.parse(line)
                if (data.message?.content) {
                  controller.enqueue(encoder.encode(JSON.stringify({ content: data.message.content }) + '\n'))
                }
              } catch {}
            }
          }
        } finally {
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
