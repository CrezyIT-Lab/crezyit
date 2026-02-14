'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Bot, Send, Brain, Zap, Settings, Cpu, Database, HardDrive,
  Loader2, Download, CloudDownload, Sun, Moon, Sparkles, Layers,
  Terminal, CheckCircle, XCircle, Clock, Star,
  Play, Pause, RefreshCw, Shield, Activity,
  Trash2, Package, Server, MemoryStick, PieChart, Archive,
  Wifi, FileText, Container, Power, RotateCcw, Globe, Firewall
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const formatBytes = (b: number) => {
  if (!b || b === 0) return '0 B';
  if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB';
  return (b / 1073741824).toFixed(2) + ' GB';
};

const formatUptime = (ms: number) => {
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  return `${days}d ${hours}h`;
};

const POPULAR_MODELS = [
  { name: 'llama3.3:70b', desc: 'Llama 3.3 70B', size: '~40 GB', category: 'Llama' },
  { name: 'llama3.2:3b', desc: 'Llama 3.2 3B', size: '~2 GB', category: 'Llama' },
  { name: 'llama3.2:1b', desc: 'Llama 3.2 1B', size: '~1.3 GB', category: 'Llama' },
  { name: 'deepseek-r1:14b', desc: 'DeepSeek R1 14B', size: '~9 GB', category: 'DeepSeek' },
  { name: 'deepseek-r1:7b', desc: 'DeepSeek R1 7B', size: '~4.7 GB', category: 'DeepSeek' },
  { name: 'deepseek-coder:6.7b', desc: 'DeepSeek Coder', size: '~3.8 GB', category: 'DeepSeek' },
  { name: 'qwen3:14b', desc: 'Qwen 3 14B', size: '~9 GB', category: 'Qwen' },
  { name: 'qwen2.5:7b', desc: 'Qwen 2.5 7B', size: '~4.7 GB', category: 'Qwen' },
  { name: 'qwen2.5-coder:7b', desc: 'Qwen Coder', size: '~4.4 GB', category: 'Qwen' },
  { name: 'mistral:7b', desc: 'Mistral 7B', size: '~4.1 GB', category: 'Mistral' },
  { name: 'phi3:mini', desc: 'Phi-3 Mini', size: '~2.3 GB', category: 'Phi' },
  { name: 'gemma2:9b', desc: 'Gemma 2 9B', size: '~5.4 GB', category: 'Gemma' },
  { name: 'codellama:7b', desc: 'Code Llama', size: '~3.8 GB', category: 'Code' },
  { name: 'llava:7b', desc: 'LLaVA Vision', size: '~4.7 GB', category: 'Vision' },
  { name: 'nomic-embed-text', desc: 'Embeddings', size: '~274 MB', category: 'Utility' },
];

interface Model { name: string; size: number; details?: { parameter_size?: string; family?: string; }; }
interface Service { name: string; status: string; enabled: boolean; }
interface Container { id: string; name: string; status: string; image: string; }
interface NetworkIF { name: string; ip: string; mac: string; up: boolean; }
interface Message { id: string; role: string; content: string; timestamp: string; models?: string[]; }

export default function CrazyITApp() {
  const [isDark, setIsDark] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('auto');
  const [models, setModels] = useState<Model[]>([]);
  const [connected, setConnected] = useState(false);
  const [sys, setSys] = useState({ cpu: { usage: 0, temp: 0 }, memory: { total: 0, used: 0, usagePercent: 0 }, uptime: 0, hostname: '' });
  const [services, setServices] = useState<Service[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [network, setNetwork] = useState<NetworkIF[]>([]);
  const [storage, setStorage] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [pullingModel, setPullingModel] = useState<string | null>(null);
  const [modelSearch, setModelSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cmdInput, setCmdInput] = useState('');
  const [cmdResult, setCmdResult] = useState('');
  const [cmdLoading, setCmdLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchModels = useCallback(async () => {
    try { const r = await fetch('/api/ollama'); const d = await r.json(); setConnected(d.ollamaConnected); setModels(d.models || []); } catch {}
  }, []);

  const fetchSys = useCallback(async () => {
    try { const r = await fetch('/api/system'); const d = await r.json(); if (d.systemInfo) setSys(d.systemInfo); } catch {}
  }, []);

  const fetchStorage = useCallback(async () => {
    try { const r = await fetch('/api/ollama/storage'); const d = await r.json(); setStorage(d.storage); } catch {}
  }, []);

  const fetchServices = useCallback(async () => {
    try { const r = await fetch('/api/system/services'); const d = await r.json(); setServices(d.services || []); } catch {}
  }, []);

  const fetchDocker = useCallback(async () => {
    try { const r = await fetch('/api/system/docker'); const d = await r.json(); setContainers(d.containers || []); } catch {}
  }, []);

  const fetchNetwork = useCallback(async () => {
    try { const r = await fetch('/api/system/network'); const d = await r.json(); setNetwork(d.interfaces || []); } catch {}
  }, []);

  const fetchLogs = useCallback(async (source: string = 'syslog') => {
    try { const r = await fetch(`/api/system/logs?source=${source}&lines=50`); const d = await r.json(); setLogs(d.logs || []); } catch {}
  }, []);

  const execCommand = async (cmd: string) => {
    if (!cmd.trim() || cmdLoading) return;
    setCmdLoading(true);
    try {
      const r = await fetch('/api/system/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd })
      });
      const d = await r.json();
      setCmdResult(d.success ? d.stdout || 'Done' : `Error: ${d.error || d.stderr}`);
    } catch (e: any) { setCmdResult(`Error: ${e.message}`); }
    setCmdLoading(false);
  };

  const manageService = async (name: string, action: string) => {
    try {
      await fetch('/api/system/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, action })
      });
      fetchServices();
    } catch {}
  };

  const pullModel = async (modelName: string) => {
    if (!modelName.trim()) return;
    setPullingModel(modelName);
    try {
      await fetch('/api/ollama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pull', modelName })
      });
      fetchStorage(); fetchModels();
    } catch {}
    setPullingModel(null);
  };

  const deleteModel = async (modelName: string) => {
    if (!confirm(`Delete ${modelName}?`)) return;
    try {
      await fetch(`/api/ollama?model=${encodeURIComponent(modelName)}`, { method: 'DELETE' });
      fetchStorage(); fetchModels();
    } catch {}
  };

  useEffect(() => {
    fetchModels(); fetchSys(); fetchStorage(); fetchServices(); fetchDocker(); fetchNetwork();
    const i = setInterval(() => { fetchSys(); }, 5000);
    return () => clearInterval(i);
  }, [fetchModels, fetchSys, fetchStorage, fetchServices, fetchDocker, fetchNetwork]);

  useEffect(() => { ref.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const msg: Message = { id: Date.now().toString(), role: 'user', content: input, timestamp: new Date().toISOString() };
    setMessages(p => [...p, msg]);
    setInput('');
    setLoading(true);
    try {
      const r = await fetch('/api/ai/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, msg].map(m => ({ role: m.role, content: m.content })), mode })
      });
      const d = await r.json();
      setMessages(p => [...p, { id: (Date.now() + 1).toString(), role: 'assistant', content: d.content || 'No response', timestamp: new Date().toISOString(), models: d.responses?.map((x: any) => x.model) }]);
    } catch (e: any) {
      setMessages(p => [...p, { id: (Date.now() + 1).toString(), role: 'assistant', content: 'Error: ' + e.message, timestamp: new Date().toISOString() }]);
    }
    setLoading(false);
  };

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <header className={`border-b ${isDark ? 'border-gray-800 bg-gray-900' : 'bg-white'} px-4 py-3 sticky top-0 z-50`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center"><Server className="w-6 h-6 text-white" /></div>
            <div><h1 className="text-xl font-bold text-emerald-400">CrazyIT</h1><p className="text-xs text-gray-500">Ubuntu Server Manager v5.0</p></div>
          </div>
          <div className="flex items-center gap-3">
            <select value={mode} onChange={e => setMode(e.target.value)} className={`px-3 py-2 rounded text-sm ${isDark ? 'bg-gray-800 text-white' : 'bg-white'} border`}>
              <option value="auto">🤖 Auto</option>
              <option value="ensemble">🔀 Ensemble</option>
              <option value="fast">⚡ Fast</option>
            </select>
            <Button variant="ghost" size="icon" onClick={() => setIsDark(!isDark)}>{isDark ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5" />}</Button>
            <Badge variant={connected ? "default" : "destructive"}>{connected ? models.length + ' models' : 'Offline'}</Badge>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4">
        <Tabs defaultValue="dashboard">
          <TabsList className="grid grid-cols-8 mb-4 bg-gray-800/50 p-1 rounded-lg text-xs">
            <TabsTrigger value="dashboard">📊 Dashboard</TabsTrigger>
            <TabsTrigger value="chat">💬 Chat</TabsTrigger>
            <TabsTrigger value="storage">💾 Storage</TabsTrigger>
            <TabsTrigger value="services">⚙️ Services</TabsTrigger>
            <TabsTrigger value="terminal">🖥️ Terminal</TabsTrigger>
            <TabsTrigger value="docker">🐳 Docker</TabsTrigger>
            <TabsTrigger value="network">🌐 Network</TabsTrigger>
            <TabsTrigger value="logs">📋 Logs</TabsTrigger>
          </TabsList>

          {/* Dashboard */}
          <TabsContent value="dashboard">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <Card className={isDark ? 'bg-gray-800/50' : 'bg-white'}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2"><Cpu className="w-5 h-5 text-emerald-400" /><span className="font-medium">CPU</span></div>
                    <Badge variant={sys.cpu.usage > 80 ? "destructive" : "outline"}>{sys.cpu.usage.toFixed(1)}%</Badge>
                  </div>
                  <Progress value={sys.cpu.usage} className="h-2" />
                </CardContent>
              </Card>
              <Card className={isDark ? 'bg-gray-800/50' : 'bg-white'}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2"><Database className="w-5 h-5 text-purple-400" /><span className="font-medium">RAM</span></div>
                    <Badge variant={sys.memory.usagePercent > 80 ? "destructive" : "outline"}>{sys.memory.usagePercent.toFixed(1)}%</Badge>
                  </div>
                  <Progress value={sys.memory.usagePercent} className="h-2" />
                  <p className="text-xs text-gray-500 mt-2">{formatBytes(sys.memory.used)} / {formatBytes(sys.memory.total)}</p>
                </CardContent>
              </Card>
              <Card className={isDark ? 'bg-gray-800/50' : 'bg-white'}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2"><HardDrive className="w-5 h-5 text-teal-400" /><span className="font-medium">Disk</span></div>
                    <Badge>{(storage?.disk?.usagePercent || 0).toFixed(1)}%</Badge>
                  </div>
                  <Progress value={storage?.disk?.usagePercent || 0} className="h-2" />
                  <p className="text-xs text-emerald-400 mt-2">Free: {formatBytes(storage?.disk?.free || 0)}</p>
                </CardContent>
              </Card>
              <Card className={isDark ? 'bg-gray-800/50' : 'bg-white'}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2"><Clock className="w-5 h-5 text-blue-400" /><span className="font-medium">Uptime</span></div>
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <p className="text-lg font-bold">{formatUptime(sys.uptime)}</p>
                  <p className="text-xs text-gray-500">{sys.hostname || 'Server'}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className={isDark ? 'bg-gray-800/50' : 'bg-white'}>
                <CardHeader><CardTitle className="text-emerald-400 flex items-center gap-2"><Zap className="w-5 h-5" />Quick Actions</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={() => execCommand('sudo apt update')}><Download className="w-4 h-4 mr-2" />Update</Button>
                    <Button variant="outline" onClick={() => execCommand('docker ps -a')}><Container className="w-4 h-4 mr-2" />Docker</Button>
                    <Button variant="outline" onClick={() => execCommand('sudo ufw status')}><Shield className="w-4 h-4 mr-2" />Firewall</Button>
                    <Button variant="outline" onClick={() => execCommand('df -h')}><HardDrive className="w-4 h-4 mr-2" />Disk</Button>
                  </div>
                </CardContent>
              </Card>
              <Card className={isDark ? 'bg-gray-800/50' : 'bg-white'}>
                <CardHeader><CardTitle className="text-emerald-400 flex items-center gap-2"><Settings className="w-5 h-5" />Services ({services.filter(s => s.status === 'active').length})</CardTitle></CardHeader>
                <CardContent>
                  <ScrollArea className="h-[150px]">
                    <div className="space-y-1">
                      {services.slice(0, 10).map(s => (
                        <div key={s.name} className="flex items-center justify-between p-2 rounded bg-gray-700/50">
                          <span className="text-sm truncate">{s.name}</span>
                          <Badge variant={s.status === 'active' ? "default" : "destructive"} className="text-xs">{s.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            <Card className={`mt-4 ${isDark ? 'bg-gray-800/50' : 'bg-white'}`}>
              <CardHeader><CardTitle className="text-emerald-400 flex items-center gap-2"><Brain className="w-5 h-5" />AI Models ({models.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {models.map(m => (
                    <div key={m.name} className="p-2 rounded bg-gray-700/50 text-center">
                      <p className="text-sm font-medium truncate">{m.name.split(':')[0]}</p>
                      <p className="text-xs text-gray-500">{formatBytes(m.size)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Chat */}
          <TabsContent value="chat">
            <Card className={isDark ? 'bg-gray-800/50' : 'bg-white'}>
              <CardContent className="p-0">
                <ScrollArea className="h-[50vh] p-4">
                  {messages.length === 0 && (
                    <div className="text-center py-16">
                      <Brain className="w-16 h-16 mx-auto text-emerald-400 mb-4" />
                      <p className="text-lg font-semibold">AI Server Manager</p>
                      <p className="text-sm text-gray-500 mt-2">Управлявайте сървъра с AI</p>
                    </div>
                  )}
                  {messages.map(m => (
                    <div key={m.id} className={`mb-4 flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-xl p-4 ${m.role === 'user' ? 'bg-emerald-600' : 'bg-gray-700'}`}>
                        {m.models && <div className="text-xs text-gray-400 mb-2">🧠 {m.models.join(' + ')}</div>}
                        <div className="prose prose-invert text-sm"><ReactMarkdown>{m.content}</ReactMarkdown></div>
                      </div>
                    </div>
                  ))}
                  <div ref={ref} />
                </ScrollArea>
                <div className="p-4 border-t border-gray-700 flex gap-2">
                  <Input value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && send()} placeholder="Въпрос..." disabled={loading} className="h-12" />
                  <Button onClick={send} disabled={loading} className="bg-emerald-600 px-6 h-12">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Storage */}
          <TabsContent value="storage">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className={isDark ? 'bg-gray-800/50' : 'bg-white'}>
                <CardHeader><CardTitle className="text-emerald-400"><PieChart className="w-5 h-5 inline mr-2" />Storage</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 rounded-lg bg-gray-700/50">
                    <div className="flex justify-between mb-2"><span className="text-sm">AI Models</span><Badge>{models.length}</Badge></div>
                    <p className="text-xs text-gray-500">{formatBytes(storage?.modelsSize || 0)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-700/50">
                    <div className="flex justify-between mb-2"><span className="text-sm">Disk</span><Badge>{(storage?.disk?.usagePercent || 0).toFixed(1)}%</Badge></div>
                    <Progress value={storage?.disk?.usagePercent || 0} className="h-2" />
                  </div>
                </CardContent>
              </Card>
              <Card className={`lg:col-span-2 ${isDark ? 'bg-gray-800/50' : 'bg-white'}`}>
                <CardHeader><CardTitle className="text-emerald-400"><Package className="w-5 h-5 inline mr-2" />Installed Models</CardTitle></CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {models.map(m => (
                        <div key={m.name} className="p-2 rounded bg-gray-700/50 flex justify-between items-center">
                          <div><p className="font-medium">{m.name}</p><p className="text-xs text-gray-500">{formatBytes(m.size)}</p></div>
                          <Button size="sm" variant="ghost" className="text-red-400" onClick={() => deleteModel(m.name)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
            <Card className={`mt-4 ${isDark ? 'bg-gray-800/50' : 'bg-white'}`}>
              <CardHeader><CardTitle className="text-teal-400"><CloudDownload className="w-5 h-5 inline mr-2" />Install Model</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input value={modelSearch} onChange={e => setModelSearch(e.target.value)} placeholder="Model name" className="flex-1" disabled={!!pullingModel} />
                  <Button onClick={() => pullModel(modelSearch)} disabled={!!pullingModel || !modelSearch} className="bg-teal-600">{pullingModel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}</Button>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {['All', 'Llama', 'DeepSeek', 'Qwen', 'Mistral', 'Phi', 'Code'].map(c => (
                    <Button key={c} variant={selectedCategory === c ? 'default' : 'outline'} size="sm" onClick={() => setSelectedCategory(c)} className={selectedCategory === c ? 'bg-emerald-600' : ''}>{c}</Button>
                  ))}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {POPULAR_MODELS.filter(m => selectedCategory === 'All' || m.category === selectedCategory).map(m => (
                    <div key={m.name} className="p-2 rounded bg-gray-700/50">
                      <div className="flex justify-between items-center">
                        <div><p className="text-sm font-medium">{m.name}</p><p className="text-xs text-gray-500">{m.size}</p></div>
                        <Button size="sm" onClick={() => pullModel(m.name)} disabled={!!pullingModel}><Download className="w-3 h-3" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Services */}
          <TabsContent value="services">
            <Card className={isDark ? 'bg-gray-800/50' : 'bg-white'}>
              <CardHeader><CardTitle className="text-emerald-400"><Settings className="w-5 h-5 inline mr-2" />System Services</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {services.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">Loading services...</div>
                  ) : (
                    <div className="space-y-2">
                      {services.map(s => (
                        <div key={s.name} className="p-3 rounded bg-gray-700/50 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{s.name}</span>
                            <Badge variant={s.status === 'active' ? "default" : "destructive"}>{s.status}</Badge>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => manageService(s.name, 'start')}><Play className="w-3 h-3" /></Button>
                            <Button size="sm" variant="outline" onClick={() => manageService(s.name, 'stop')}><Pause className="w-3 h-3" /></Button>
                            <Button size="sm" variant="outline" onClick={() => manageService(s.name, 'restart')}><RotateCcw className="w-3 h-3" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Terminal */}
          <TabsContent value="terminal">
            <Card className={isDark ? 'bg-gray-800/50' : 'bg-white'}>
              <CardHeader><CardTitle className="text-emerald-400"><Terminal className="w-5 h-5 inline mr-2" />Terminal</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input value={cmdInput} onChange={e => setCmdInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && execCommand(cmdInput)} placeholder="Command..." className="font-mono h-10" />
                  <Button onClick={() => execCommand(cmdInput)} disabled={cmdLoading} className="bg-emerald-600">{cmdLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}</Button>
                </div>
                <div className={`p-4 rounded-lg font-mono text-sm bg-gray-900 min-h-[300px] whitespace-pre-wrap overflow-auto`}>{cmdResult || <span className="text-gray-500">Result...</span>}</div>
                <div className="flex gap-2 flex-wrap">
                  {['ls -la', 'df -h', 'free -h', 'docker ps', 'systemctl status', 'journalctl -xe'].map(c => (
                    <Button key={c} variant="outline" size="sm" onClick={() => setCmdInput(c)}>{c}</Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Docker */}
          <TabsContent value="docker">
            <Card className={isDark ? 'bg-gray-800/50' : 'bg-white'}>
              <CardHeader><CardTitle className="text-emerald-400"><Container className="w-5 h-5 inline mr-2" />Docker Containers</CardTitle></CardHeader>
              <CardContent>
                {containers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Container className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No containers found</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => execCommand('docker ps -a')}>Check Docker</Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {containers.map(c => (
                      <div key={c.id} className="p-3 rounded bg-gray-700/50 flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-2"><span className="font-medium">{c.name}</span><Badge variant={c.status.includes('Up') ? "default" : "destructive"}>{c.status}</Badge></div>
                          <p className="text-xs text-gray-500">{c.image}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Network */}
          <TabsContent value="network">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className={isDark ? 'bg-gray-800/50' : 'bg-white'}>
                <CardHeader><CardTitle className="text-emerald-400"><Wifi className="w-5 h-5 inline mr-2" />Network Interfaces</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {network.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">Loading network...</div>
                    ) : (
                      network.map(iface => (
                        <div key={iface.name} className="p-3 rounded bg-gray-700/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{iface.name}</span>
                              <Badge variant={iface.up ? "default" : "destructive"}>{iface.up ? 'UP' : 'DOWN'}</Badge>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">IP: {iface.ip || 'N/A'}</p>
                          <p className="text-xs text-gray-500">MAC: {iface.mac || 'N/A'}</p>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card className={isDark ? 'bg-gray-800/50' : 'bg-white'}>
                <CardHeader><CardTitle className="text-emerald-400"><Shield className="w-5 h-5 inline mr-2" />Firewall</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={() => execCommand('sudo ufw status verbose')}>Check Status</Button>
                    <Button variant="outline" onClick={() => execCommand('sudo ufw enable')}>Enable</Button>
                    <Button variant="outline" onClick={() => execCommand('sudo ufw disable')}>Disable</Button>
                    <Button variant="outline" onClick={() => execCommand('sudo ufw reload')}>Reload</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
            <Card className={`mt-4 ${isDark ? 'bg-gray-800/50' : 'bg-white'}`}>
              <CardHeader><CardTitle className="text-emerald-400"><Globe className="w-5 h-5 inline mr-2" />Quick Network Actions</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Button variant="outline" onClick={() => execCommand('ping -c 4 google.com')}>Ping Google</Button>
                  <Button variant="outline" onClick={() => execCommand('curl ifconfig.me')}>My IP</Button>
                  <Button variant="outline" onClick={() => execCommand('netstat -tuln')}>Open Ports</Button>
                  <Button variant="outline" onClick={() => execCommand('ip route')}>Routes</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs */}
          <TabsContent value="logs">
            <Card className={isDark ? 'bg-gray-800/50' : 'bg-white'}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-emerald-400"><FileText className="w-5 h-5 inline mr-2" />System Logs</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => fetchLogs('syslog')}>Syslog</Button>
                    <Button variant="outline" size="sm" onClick={() => fetchLogs('auth')}>Auth</Button>
                    <Button variant="outline" size="sm" onClick={() => fetchLogs('kern')}>Kernel</Button>
                    <Button variant="outline" size="sm" onClick={() => fetchLogs('docker')}>Docker</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {logs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Select a log source above</p>
                    </div>
                  ) : (
                    <div className="font-mono text-xs space-y-1">
                      {logs.map((log, i) => (
                        <div key={i} className={`p-2 rounded ${log.level === 'error' ? 'bg-red-500/10' : 'bg-gray-700/30'}`}>
                          <span className="text-gray-500">{log.timestamp}</span>
                          <span className="ml-2">{log.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <footer className={`border-t ${isDark ? 'border-gray-800 bg-gray-900' : 'bg-white'} px-4 py-3 mt-auto`}>
        <div className="max-w-7xl mx-auto flex justify-between text-xs text-gray-500">
          <span>CrazyIT v5.0 - Ubuntu Server Manager</span>
          <span>CPU: {sys.cpu.usage.toFixed(0)}% | RAM: {sys.memory.usagePercent.toFixed(0)}%</span>
        </div>
      </footer>
    </div>
  );
}
