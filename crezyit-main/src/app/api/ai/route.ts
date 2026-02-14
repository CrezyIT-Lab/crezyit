import { NextRequest, NextResponse } from 'next/server'

const OLLAMA_API = 'http://localhost:11434'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message, model = 'phi3:mini', history = [] } = body
    
    const messages = [
      { role: 'system', content: 'Ти си CrazyIT AI асистент - експерт по програмиране. Можеш да поправяш грешки в код, да обясняваш проблеми и да предлагаш решения. Отговаряй на български език.' },
      ...history.slice(-6),
      { role: 'user', content: message }
    ]
    
    const response = await fetch(`${OLLAMA_API}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: { temperature: 0.7, num_predict: 4096 }
      }),
      signal: AbortSignal.timeout(180000)
    })
    
    if (!response.ok) {
      return NextResponse.json({ error: `Ollama error: ${response.status}` }, { status: 500 })
    }
    
    const data = await response.json()
    return NextResponse.json({ 
      content: data.message?.content || 'Няма отговор',
      model,
      processingTime: data.total_duration ? Math.round(data.total_duration / 1000000) : 0
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
