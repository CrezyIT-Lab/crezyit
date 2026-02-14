import { createServer } from 'http'
import { Server } from 'socket.io'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: ["http://192.168.1.5:5000", "http://localhost:5000", "*"],
    methods: ["GET", "POST", "OPTIONS"],
    credentials: false,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  allowEIO3: true
})

const OLLAMA_API = process.env.OLLAMA_API || 'http://localhost:11434'

interface AIModel { name: string; ollamaName: string; type: 'reasoning' | 'web' | 'helper'; role: string; status: 'online' | 'offline' | 'busy'; description: string }
const AI_MODELS: AIModel[] = [
  { name: 'DeepSeek-Coder 6.7B', ollamaName: 'deepseek-coder:6.7b-instruct-q4_0', type: 'reasoning', role: 'Architecture', status: 'offline', description: 'Основен модел' },
  { name: 'Qwen2.5-Coder 7B', ollamaName: 'qwen2.5-coder:7b', type: 'web', role: 'Web Dev', status: 'offline', description: 'Уеб разработка' },
  { name: 'Phi-3 Mini 3.8B', ollamaName: 'phi3:mini', type: 'helper', role: 'Assistant', status: 'offline', description: 'Бързи отговори' }
]

interface ConversationMessage { role: 'user' | 'assistant' | 'system'; content: string; timestamp: Date; model?: string }
const conversations = new Map<string, ConversationMessage[]>()

interface Stats { totalMessages: number; totalRequests: number; averageResponseTime: number; modelUsage: Record<string, number>; uptime: number }
const stats: Stats = { totalMessages: 0, totalRequests: 0, averageResponseTime: 0, modelUsage: {}, uptime: Date.now() }
let responseTimes: number[] = []

interface SystemInfo { cpu: { usage: number; temp: number }; memory: { total: number; used: number; free: number; usagePercent: number }; gpu: { name: string; memory: { total: number; used: number; free: number }; temp: number; power: number } | null; uptime: number }

async function getSystemInfo(): Promise<SystemInfo> {
  let cpuUsage = 0, cpuTemp = 0, memTotal = 0, memUsed = 0
  let gpu: SystemInfo['gpu'] = null
  try { const { stdout } = await execAsync("top -bn1 | grep 'Cpu(s)' | awk '{print $2}'").catch(() => ({ stdout: '0' })); cpuUsage = parseFloat(stdout.trim()) || 0 } catch {}
  try { const { stdout } = await execAsync("cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null || echo 0").catch(() => ({ stdout: '0' })); cpuTemp = Math.round((parseInt(stdout.trim()) || 0) / 1000) } catch {}
  try { const { stdout } = await execAsync("free -b | grep Mem | awk '{print $2,$3}'").catch(() => ({ stdout: '0 0' })); const [t, u] = stdout.trim().split(' ').map(Number); memTotal = t; memUsed = u } catch {}
  try { const { stdout } = await execAsync("nvidia-smi --query-gpu=name,memory.total,memory.used,temperature.gpu,power.draw --format=csv,noheader,nounits 2>/dev/null").catch(() => ({ stdout: '' })); if (stdout.trim()) { const [name, gt, gu, gtemp, gpower] = stdout.trim().split(', '); gpu = { name: name?.trim() || 'GPU', memory: { total: parseInt(gt) * 1024 * 1024 || 0, used: parseInt(gu) * 1024 * 1024 || 0, free: 0 }, temp: parseInt(gtemp) || 0, power: parseFloat(gpower) || 0 } } } catch {}
  return { cpu: { usage: cpuUsage, temp: cpuTemp }, memory: { total: memTotal, used: memUsed, free: 0, usagePercent: memTotal ? Math.round((memUsed / memTotal) * 100) : 0 }, gpu, uptime: Date.now() - stats.uptime }
}

async function getInstalledModels(): Promise<string[]> {
  try { const r = await fetch(`${OLLAMA_API}/api/tags`, { method: 'GET', signal: AbortSignal.timeout(5000) }); if (r.ok) { const d = await r.json(); return d.models?.map((m: any) => m.name) || [] } } catch {}
  return []
}

async function updateModelStatus(): Promise<AIModel[]> {
  const installed = await getInstalledModels()
  for (const m of AI_MODELS) { m.status = installed.some(i => i === m.ollamaName || i.startsWith(m.ollamaName.split(':')[0])) ? 'online' : 'offline' }
  return AI_MODELS
}

const SYSTEM_PROMPTS = { reasoning: 'Ти си CrazyIT Senior Developer. Отговаряй на български.', web: 'Ти си CrazyIT Web Developer. Отговаряй на български.', helper: 'Ти си CrazyIT Assistant. Отговаряй кратко на български.' }

function selectModel(msg: string): 'reasoning' | 'web' | 'helper' {
  const l = msg.toLowerCase()
  if (['архитектура', 'backend', 'python', 'c++', 'debug', 'алгоритъм'].some(k => l.includes(k))) return 'reasoning'
  if (['web', 'уеб', 'api', 'react', 'html', 'css', 'sql'].some(k => l.includes(k))) return 'web'
  return 'helper'
}

const genId = () => Math.random().toString(36).substr(2, 9)

async function callOllama(model: string, messages: Array<{ role: string; content: string }>): Promise<string> {
  const r = await fetch(`${OLLAMA_API}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model, messages, stream: false, options: { temperature: 0.7, num_predict: 2048 } }), signal: AbortSignal.timeout(120000) })
  if (!r.ok) throw new Error(`Ollama error: ${r.status}`)
  const d = await r.json()
  return d.message?.content || 'Няма отговор.'
}

async function processChat(sid: string, msg: string, pref?: 'reasoning' | 'web' | 'helper') {
  const type = pref || selectModel(msg)
  let model = AI_MODELS.find(m => m.type === type) || AI_MODELS[0]
  if (model.status === 'offline') { const avail = AI_MODELS.find(m => m.status === 'online'); if (avail) model = avail }
  if (model.status === 'offline') throw new Error('Няма налични AI модели.')

  const hist = conversations.get(sid) || []
  const msgs: Array<{ role: string; content: string }> = [{ role: 'system', content: SYSTEM_PROMPTS[model.type] }]
  for (const h of hist.slice(-8)) if (h.role === 'user' || h.role === 'assistant') msgs.push({ role: h.role, content: h.content })
  msgs.push({ role: 'user', content: msg })

  const start = Date.now()
  const resp = await callOllama(model.ollamaName, msgs)
  const time = Date.now() - start

  stats.totalMessages++; stats.totalRequests++; stats.modelUsage[model.name] = (stats.modelUsage[model.name] || 0) + 1
  responseTimes.push(time); if (responseTimes.length > 50) responseTimes.shift()
  stats.averageResponseTime = Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)

  hist.push({ role: 'user', content: msg, timestamp: new Date() })
  hist.push({ role: 'assistant', content: resp, timestamp: new Date(), model: model.name })
  conversations.set(sid, hist)

  return { response: resp, model, processingTime: time }
}

io.on('connection', async (socket) => {
  console.log(`✅ Client: ${socket.id}`)
  socket.emit('models-status', { models: await updateModelStatus() })
  socket.emit('stats-update', { stats })
  socket.emit('system-info', await getSystemInfo())

  socket.on('init-session', async (d) => { const sid = d.sessionId || genId(); if (!conversations.has(sid)) conversations.set(sid, []); socket.emit('session-initialized', { sessionId: sid }) })
  socket.on('chat', async (d) => { socket.emit('typing', { isTyping: true, model: 'CrazyIT' }); try { const r = await processChat(d.sessionId, d.message, d.preferredModel); socket.emit('chat-response', { id: genId(), content: r.response, model: r.model, processingTime: r.processingTime, timestamp: new Date().toISOString() }) } catch (e: any) { socket.emit('chat-error', { error: e.message }) } finally { socket.emit('typing', { isTyping: false }) } })
  socket.on('clear-conversation', (d) => { conversations.delete(d.sessionId); socket.emit('conversation-cleared', {}) })
  socket.on('get-stats', async () => { socket.emit('stats-update', { stats }); socket.emit('system-info', await getSystemInfo()) })
  socket.on('get-system-info', async () => { socket.emit('system-info', await getSystemInfo()) })
  socket.on('refresh-models', async () => { socket.emit('models-status', { models: await updateModelStatus() }) })

  const handleCode = async (type: 'reasoning' | 'web' | 'helper', prompt: string, respEvt: string, key: string) => {
    socket.emit('typing', { isTyping: true, model: AI_MODELS.find(m => m.type === type)?.name || 'AI' })
    try { let m = AI_MODELS.find(x => x.type === type)!; if (m.status === 'offline') { const a = AI_MODELS.find(x => x.status === 'online'); if (a) m = a } const r = await callOllama(m.ollamaName, [{ role: 'system', content: SYSTEM_PROMPTS[type] }, { role: 'user', content: prompt }]); stats.totalRequests++; socket.emit(respEvt, { [key]: r }) } catch (e: any) { socket.emit('chat-error', { error: e.message }) } finally { socket.emit('typing', { isTyping: false }) }
  }

  socket.on('analyze-code', (d) => handleCode('reasoning', `Анализирай ${d.language} код:\n\`\`\`${d.language}\n${d.code}\n\`\`\``, 'code-analysis', 'analysis'))
  socket.on('generate-code', (d) => handleCode('web', `Генерирай ${d.language} код за: ${d.description}`, 'generated-code', 'code'))
  socket.on('debug-code', (d) => handleCode('reasoning', `Дебъгни ${d.language} код:\n\`\`\`${d.language}\n${d.code}\n\`\`\``, 'debug-result', 'result'))
  socket.on('explain-code', (d) => handleCode('helper', `Обясни ${d.language} код:\n\`\`\`${d.language}\n${d.code}\n\`\`\``, 'code-explanation', 'explanation'))
  socket.on('analyze-project', (d) => handleCode('reasoning', `Анализирай проект: ${d.projectName}\nТип: ${d.projectType}\nОписание: ${d.description}`, 'project-analysis', 'analysis'))
  socket.on('analyze-github', (d) => handleCode('reasoning', `Анализирай GitHub repo: ${d.repoUrl}`, 'github-analysis', 'analysis'))
})

setInterval(async () => { io.emit('models-status', { models: await updateModelStatus() }); io.emit('stats-update', { stats }); io.emit('system-info', await getSystemInfo()) }, 5000)

const PORT = 3003
httpServer.listen(PORT, async () => { console.log(`🚀 CrazyIT AI Service on port ${PORT}`); const m = await updateModelStatus(); console.log('📊 Models:', m.map(x => `${x.name}: ${x.status}`).join(', ')) })
