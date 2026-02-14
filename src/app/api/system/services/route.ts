import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET() {
  const services = []
  const commonServices = ['nginx', 'docker', 'ssh', 'cron', 'mysql', 'redis-server', 'ollama', 'crazyit-web', 'crazyit-ai']
  
  for (const svc of commonServices) {
    try {
      const { stdout } = await execAsync('systemctl is-active ' + svc + ' 2>/dev/null || echo "inactive"')
      services.push({ name: svc, status: stdout.trim(), enabled: true })
    } catch {
      services.push({ name: svc, status: 'inactive', enabled: false })
    }
  }
  
  return NextResponse.json({ success: true, services })
}

export async function POST(req: NextRequest) {
  const { name, action } = await req.json()
  try {
    await execAsync('sudo systemctl ' + action + ' ' + name)
    return NextResponse.json({ success: true, message: 'Service ' + name + ' ' + action + 'ed' })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message })
  }
}
