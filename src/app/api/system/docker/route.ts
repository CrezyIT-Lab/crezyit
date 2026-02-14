import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET() {
  try {
    const { stdout } = await execAsync('docker ps -a --format "{{.ID}}|{{.Names}}|{{.Status}}|{{.Image}}" 2>/dev/null || echo ""')
    const containers = stdout.trim().split('\n').filter(l => l.trim()).map(line => {
      const [id, name, status, image] = line.split('|')
      return { id, name, status, image }
    })
    return NextResponse.json({ success: true, containers })
  } catch {
    return NextResponse.json({ success: true, containers: [] })
  }
}
