import { NextRequest, NextResponse } from 'next/server'

const OLLAMA = 'http://localhost:11434'

export async function GET() {
  try {
    const res = await fetch(OLLAMA + '/api/tags', { method: 'GET' })
    if (!res.ok) throw new Error('Not connected')
    const data = await res.json()
    return NextResponse.json({
      success: true,
      ollamaConnected: true,
      models: (data.models || []).map((m: any) => ({
        name: m.name,
        size: (m.size / 1000000000).toFixed(2),
        digest: m.digest || '',
        modifiedAt: m.modified_at || '',
        details: m.details || {}
      }))
    })
  } catch (e) {
    return NextResponse.json({ success: false, ollamaConnected: false, models: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (body.action === 'pull' && body.modelName) {
      const res = await fetch(OLLAMA + '/api/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: body.modelName, stream: false })
      })
      return NextResponse.json({ success: res.ok })
    }
    if (body.action === 'delete' && body.modelName) {
      await fetch(OLLAMA + '/api/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: body.modelName })
      })
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ success: false }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
