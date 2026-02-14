import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    success: true,
    systemInfo: {
      cpu: { usage: 25, temp: 45 },
      memory: { total: 34359738368, used: 8589934592, free: 25769803776, usagePercent: 25 },
      gpu: null,
      uptime: Date.now()
    }
  })
}
