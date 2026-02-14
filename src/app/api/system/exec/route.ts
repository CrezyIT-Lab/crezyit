import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(req: NextRequest) {
  const { command } = await req.json()
  if (!command) return NextResponse.json({ success: false, error: 'No command' }, { status: 400 })
  
  try {
    const { stdout, stderr } = await execAsync(command, { timeout: 60000 })
    return NextResponse.json({ success: true, stdout, stderr })
  } catch (e: any) {
    return NextResponse.json({ success: false, stdout: e.stdout || '', stderr: e.stderr || e.message })
  }
}
