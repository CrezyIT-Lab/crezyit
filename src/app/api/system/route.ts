import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

async function getSystemInfo() {
  let cpuUsage = 0, cpuTemp = 0, cpuCores = 0, cpuFreq = ''
  let memTotal = 0, memUsed = 0, memFree = 0, memCached = 0
  let gpu: any = null
  let diskTotal = 0, diskUsed = 0
  let uptime = ''
  let loadAvg = ''

  // CPU Usage
  try {
    const { stdout } = await execAsync("top -bn1 | grep 'Cpu(s)' | awk '{print $2}'").catch(() => ({ stdout: '0' }))
    cpuUsage = parseFloat(stdout.trim()) || 0
  } catch {}

  // CPU Temp
  try {
    const { stdout } = await execAsync("cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null || echo 0").catch(() => ({ stdout: '0' }))
    cpuTemp = Math.round((parseInt(stdout.trim()) || 0) / 1000)
  } catch {}

  // CPU Cores
  try {
    const { stdout } = await execAsync("nproc").catch(() => ({ stdout: '1' }))
    cpuCores = parseInt(stdout.trim()) || 1
  } catch {}

  // CPU Frequency
  try {
    const { stdout } = await execAsync("cat /proc/cpuinfo | grep 'model name' | head -1 | cut -d':' -f2").catch(() => ({ stdout: '' }))
    cpuFreq = stdout.trim()
  } catch {}

  // Memory
  try {
    const { stdout } = await execAsync("free -b | grep Mem").catch(() => ({ stdout: '' }))
    const parts = stdout.trim().split(/\s+/)
    memTotal = parseInt(parts[1]) || 0
    memUsed = parseInt(parts[2]) || 0
    memFree = parseInt(parts[3]) || 0
    memCached = parseInt(parts[5]) || 0
  } catch {}

  // GPU (NVIDIA)
  try {
    const { stdout } = await execAsync("nvidia-smi --query-gpu=name,memory.total,memory.used,memory.free,temperature.gpu,power.draw,utilization.gpu,fan.speed --format=csv,noheader,nounits 2>/dev/null").catch(() => ({ stdout: '' }))
    if (stdout.trim()) {
      const [name, memT, memU, memF, temp, power, util, fan] = stdout.trim().split(', ')
      gpu = {
        name: name?.trim() || 'NVIDIA GPU',
        memory: {
          total: parseInt(memT) * 1024 * 1024 || 0,
          used: parseInt(memU) * 1024 * 1024 || 0,
          free: parseInt(memF) * 1024 * 1024 || 0
        },
        temp: parseInt(temp) || 0,
        power: parseFloat(power) || 0,
        utilization: parseInt(util) || 0,
        fan: parseInt(fan) || 0
      }
    }
  } catch {}

  // Disk
  try {
    const { stdout } = await execAsync("df -B1 / | tail -1").catch(() => ({ stdout: '' }))
    const parts = stdout.trim().split(/\s+/)
    diskTotal = parseInt(parts[1]) || 0
    diskUsed = parseInt(parts[2]) || 0
  } catch {}

  // Uptime
  try {
    const { stdout } = await execAsync("uptime -p 2>/dev/null || uptime").catch(() => ({ stdout: '' }))
    uptime = stdout.trim().replace('up ', '')
  } catch {}

  // Load Average
  try {
    const { stdout } = await execAsync("cat /proc/loadavg | awk '{print $1,$2,$3}'").catch(() => ({ stdout: '' }))
    loadAvg = stdout.trim()
  } catch {}

  return {
    cpu: {
      usage: cpuUsage,
      temp: cpuTemp,
      cores: cpuCores,
      model: cpuFreq,
      loadAvg: loadAvg
    },
    memory: {
      total: memTotal,
      used: memUsed,
      free: memFree,
      cached: memCached,
      usagePercent: memTotal ? Math.round((memUsed / memTotal) * 100) : 0
    },
    gpu,
    disk: {
      total: diskTotal,
      used: diskUsed,
      free: diskTotal - diskUsed,
      usagePercent: diskTotal ? Math.round((diskUsed / diskTotal) * 100) : 0
    },
    uptime,
    timestamp: Date.now()
  }
}

export async function GET() {
  try {
    const info = await getSystemInfo()
    return NextResponse.json(info)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
