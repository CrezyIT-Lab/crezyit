import { NextRequest, NextResponse } from 'next/server'

const OLLAMA = 'http://localhost:11434'

const MODEL_PROFILES: Record<string, {name: string; strengths: string[]; speed: string; quality: number; bestFor: string[]}> = {
  'deepseek-r1:14b': { name: 'DeepSeek R1 14B', strengths: ['reasoning', 'math', 'logic'], speed: 'medium', quality: 9, bestFor: ['разсъждения', 'математика'] },
  'qwen3:14b-q4_K_M': { name: 'Qwen 3 14B', strengths: ['general', 'coding', 'creative'], speed: 'medium', quality: 9, bestFor: ['общи задачи', 'код'] },
  'qwen2.5-coder:7b': { name: 'Qwen 2.5 Coder', strengths: ['coding', 'debugging'], speed: 'fast', quality: 8, bestFor: ['програмиране'] },
  'deepseek-coder:6.7b-instruct-q4_0': { name: 'DeepSeek Coder', strengths: ['coding', 'architecture'], speed: 'fast', quality: 8, bestFor: ['архитектура'] },
  'qwen:latest': { name: 'Qwen 4B', strengths: ['general', 'chat'], speed: 'fast', quality: 6, bestFor: ['бързи отговори'] },
  'phi3:mini': { name: 'Phi-3 Mini', strengths: ['speed', 'simple'], speed: 'fast', quality: 5, bestFor: ['прости задачи'] }
}

function detectType(q: string): string[] {
  const types: string[] = []
  if (/\b(code|код|function|debug|грешка)\b/.test(q)) types.push('coding')
  if (/\b(math|математика|solve|реши|calculate)\b/.test(q)) types.push('math', 'reasoning')
  if (/\b(why|защо|explain|обясни|analyze)\b/.test(q)) types.push('reasoning')
  if (/\b(write|напиши|create|създай)\b/.test(q)) types.push('creative')
  if (q.length < 50) types.push('quick')
  if (!types.length) types.push('general')
  return [...new Set(types)]
}

function selectModels(types: string[], models: string[]) {
  const scores = models.map(m => {
    const p = MODEL_PROFILES[m]
    if (!p) return { m, score: 0 }
    let score = types.reduce((s, t) => s + (p.strengths.includes(t) ? 3 : 0), 0) + p.quality / 2
    if (types.includes('quick') && p.speed === 'fast') score += 2
    return { m, score }
  }).sort((a, b) => b.score - a.score)
  return { primary: scores[0]?.m || models[0], secondary: scores[1]?.m }
}

async function callModel(model: string, messages: any[]) {
  const r = await fetch(OLLAMA + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model, messages, stream: false }) })
  const d = await r.json()
  return d.message?.content || ''
}

export async function POST(req: NextRequest) {
  const { messages, mode } = await req.json()
  const query = messages[messages.length - 1]?.content || ''
  
  const r = await fetch(OLLAMA + '/api/tags')
  const d = await r.json()
  const available = (d.models || []).map((m: any) => m.name)
  
  const types = detectType(query)
  const sel = selectModels(types, available)
  
  const result: any = { queryTypes: types, selectedModels: sel, responses: [] }
  
  if (mode === 'ensemble') {
    const models = [sel.primary, sel.secondary].filter(Boolean)
    const responses = await Promise.all(models.map(async m => ({ model: m, content: await callModel(m, messages) })))
    result.responses = responses
    
    // Synthesize
    if (responses.length > 1) {
      const prompt = `Обедини отговорите в един:\n\n${responses.map(r => `---${r.model}---\n${r.content}`).join('\n\n')}`
      result.content = await callModel(sel.primary, [...messages, { role: 'assistant', content: prompt }])
    } else {
      result.content = responses[0]?.content || ''
    }
  } else {
    result.content = await callModel(sel.primary, messages)
    result.responses = [{ model: sel.primary, content: result.content }]
  }
  
  return NextResponse.json(result)
}

export async function GET() {
  return NextResponse.json({ success: true, modelProfiles: MODEL_PROFILES })
}
