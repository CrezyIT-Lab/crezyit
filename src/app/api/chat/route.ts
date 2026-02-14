import { NextRequest, NextResponse } from 'next/server'

const AI_SERVICE = 'http://localhost:3003'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    const response = await fetch(`${AI_SERVICE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
