import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434'

export async function GET() {
  try {
    const { stdout } = await execAsync('df -B1 /')
    const lines = stdout.trim().split('\n')
    const parts = lines[1]?.split(/\s+/) || []
    const disk = { total: parseInt(parts[1]) || 0, used: parseInt(parts[2]) || 0, free: parseInt(parts[3]) || 0, usagePercent: (parseInt(parts[2]) / parseInt(parts[1])) * 100 || 0 }
    
    let models = []
    try {
      const r = await fetch(OLLAMA_HOST + '/api/tags')
      const d = await r.json()
      models = d.models || []
    } catch {}
    
    const modelsSize = models.reduce((acc, m) => acc + (m.size || 0), 0)
    
    return NextResponse.json({ success: true, storage: { disk, models, modelsSize, modelCount: models.length } })
  } catch {
    return NextResponse.json({ success: true, storage: { disk: { total: 1, used: 0, free: 1, usagePercent: 0 }, models: [], modelsSize: 0, modelCount: 0 } })
  }
}
