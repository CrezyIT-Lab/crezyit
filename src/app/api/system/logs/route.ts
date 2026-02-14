import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const source = searchParams.get('source') || 'syslog'
  
  try {
    const { stdout } = await execAsync('journalctl -n 50 --no-pager 2>/dev/null || dmesg | tail -50')
    const logs = stdout.split('\n').filter(l => l.trim()).map(line => ({
      timestamp: new Date().toISOString(),
      level: line.toLowerCase().includes('error') ? 'error' : 'info',
      message: line
    }))
    return NextResponse.json({ success: true, logs, source })
  } catch {
    return NextResponse.json({ success: true, logs: [], source })
  }
}
