'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Bot, Send, Code2, Brain, Zap, Settings, Terminal, Cpu, Database, AlertCircle, CheckCircle, 
  Sparkles, FileCode, Bug, Lightbulb, Copy, Trash2, RefreshCw, Server, Activity, Shield, 
  MessageSquare, Clock, BarChart3, Thermometer, HardDrive, Gauge, CpuIcon, User, Loader2, 
  MemoryStick, Timer, Download, Package, FolderOpen, File, Folder, Trash, HardDriveDownload,
  Plus, X, Check, Info, Warning, Optimized
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  model?: string;
  processingTime?: number;
}

interface SystemInfo {
  cpu: { usage: number; temp: number; cores: number; model: string; loadAvg: string };
  memory: { total: number; used: number; free: number; cached: number; usagePercent: number };
  gpu: { name: string; memory: { total: number; used: number; free: number }; temp: number; power: number; utilization: number; fan: number } | null;
  disk: { total: number; used: number; free: number; usagePercent: number };
  uptime: string;
  timestamp: number;
}

interface AIModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
  details?: { family: string; parameter_size: string; quantization_level: string };
}

interface StorageInfo {
  project: { path: string; size: number };
  ollama: { path: string; size: number };
  disk: { total: number; used: number; free: number };
}

interface FileItem {
  name: string;
  path: string;
  size: number;
  type: 'file' | 'directory';
  modified: string;
  extension?: string;
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('bg-BG', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const POPULAR_MODELS = [
  { name: 'phi3:mini', desc: 'Бърз, 3.8B параметъра', size: '~2.2GB' },
  { name: 'phi3:medium', desc: 'Среден, 14B параметъра', size: '~8GB' },
  { name: 'qwen2.5-coder:7b', desc: 'Web & Code specialist', size: '~4.7GB' },
  { name: 'qwen2.5:14b', desc: 'Мощен general purpose', size: '~9GB' },
  { name: 'deepseek-coder:6.7b', desc: 'Backend & Architecture', size: '~3.8GB' },
  { name: 'deepseek-r1:7b', desc: 'Reasoning model', size: '~4.7GB' },
  { name: 'llama3.2:3b', desc: 'Meta Llama 3.2', size: '~2GB' },
  { name: 'mistral:7b', desc: 'Mistral 7B', size: '~4.1GB' },
  { name: 'codellama:7b', desc: 'Code specialist', size: '~3.8GB' },
  { name: 'gemma2:9b', desc: 'Google Gemma 2', size: '~5.5GB' },
];

export default function CrazyITApp() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('console');
  const [codeInput, setCodeInput] = useState('');
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const [codeOutput, setCodeOutput] = useState('');
  const [codeDescription, setCodeDescription] = useState('');
  const [modelName, setModelName] = useState('phi3:mini');
  const [stats, setStats] = useState({ messages: 0, requests: 0, totalTime: 0 });
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  
  // Models state
  const [installedModels, setInstalledModels] = useState<AIModel[]>([]);
  const [isPulling, setIsPulling] = useState(false);
  const [pullModelName, setPullModelName] = useState('');
  const [pullProgress, setPullProgress] = useState('');
  
  // Storage state
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch system info
  const fetchSystemInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/system');
      const data = await res.json();
      setSystemInfo(data);
    } catch (e) {}
  }, []);

  // Fetch installed models
  const fetchModels = useCallback(async () => {
    try {
      const res = await fetch('/api/models?action=list');
      const data = await res.json();
      setInstalledModels(data.models || []);
    } catch (e) {}
  }, []);

  // Fetch storage info
  const fetchStorageInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/storage?action=info');
      const data = await res.json();
      setStorageInfo(data);
    } catch (e) {}
  }, []);

  // Fetch files
  const fetchFiles = useCallback(async (path: string = '') => {
    try {
      const res = await fetch(`/api/storage?action=list&path=${encodeURIComponent(path)}`);
      const data = await res.json();
      setFiles(data.files || []);
      setCurrentPath(data.currentPath || '');
    } catch (e) {}
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  
  useEffect(() => {
    fetchSystemInfo();
    fetchModels();
    fetchStorageInfo();
    const interval = setInterval(fetchSystemInfo, 3000);
    return () => clearInterval(interval);
  }, [fetchSystemInfo, fetchModels, fetchStorageInfo]);

  useEffect(() => {
    if (activeTab === 'storage') {
      fetchFiles(currentPath);
    }
  }, [activeTab, currentPath, fetchFiles]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsProcessing(true);

    const startTime = Date.now();

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputMessage.trim(),
          model: modelName,
          history: messages.slice(-6).map(m => ({ role: m.role, content: m.content }))
        })
      });

      const data = await response.json();
      const processingTime = Date.now() - startTime;

      if (data.error) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `❌ Грешка: ${data.error}`,
          timestamp: new Date().toISOString()
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.content,
          timestamp: new Date().toISOString(),
          model: data.model,
          processingTime: data.processingTime || processingTime
        }]);
        setStats(s => ({ messages: s.messages + 1, requests: s.requests + 1, totalTime: s.totalTime + processingTime }));
      }
    } catch (error: any) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ Грешка: ${error.message}`,
        timestamp: new Date().toISOString()
      }]);
    }

    setIsProcessing(false);
    inputRef.current?.focus();
  };

  const handleCodeAction = async (action: string) => {
    if ((!codeInput.trim() && !codeDescription.trim()) || isProcessing) return;

    setIsProcessing(true);
    setCodeOutput('');

    const prompts: Record<string, string> = {
      generate: `Генерирай ${codeLanguage} код за: ${codeDescription}`,
      analyze: `Анализирай този ${codeLanguage} код:\n\`\`\`${codeLanguage}\n${codeInput}\n\`\`\``,
      debug: `Намери и поправи грешките в този ${codeLanguage} код:\n\`\`\`${codeLanguage}\n${codeInput}\n\`\`\``,
      explain: `Обясни този ${codeLanguage} код:\n\`\`\`${codeLanguage}\n${codeInput}\n\`\`\``
    };

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompts[action], model: modelName })
      });
      const data = await response.json();
      setCodeOutput(data.content || data.error || 'Няма отговор');
      setStats(s => ({ ...s, requests: s.requests + 1 }));
    } catch (error: any) {
      setCodeOutput(`Грешка: ${error.message}`);
    }

    setIsProcessing(false);
  };

  // Pull new model
  const handlePullModel = async (modelName: string) => {
    setIsPulling(true);
    setPullModelName(modelName);
    setPullProgress('Изтегляне...');
    
    try {
      const res = await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pull', model: modelName })
      });
      const data = await res.json();
      
      if (data.success) {
        setPullProgress('Инсталиран успешно!');
        await fetchModels();
      } else {
        setPullProgress('Грешка при инсталация');
      }
    } catch (e) {
      setPullProgress('Грешка при инсталация');
    }
    
    setTimeout(() => {
      setIsPulling(false);
      setPullModelName('');
      setPullProgress('');
    }, 2000);
  };

  // Delete model
  const handleDeleteModel = async (modelName: string) => {
    if (!confirm(`Сигурни ли сте, че искате да изтриете ${modelName}?`)) return;
    
    try {
      await fetch(`/api/models?model=${encodeURIComponent(modelName)}`, { method: 'DELETE' });
      await fetchModels();
      await fetchStorageInfo();
    } catch (e) {}
  };

  // Delete file
  const handleDeleteFile = async (file: FileItem) => {
    if (!confirm(`Изтриване на ${file.name}?`)) return;
    
    try {
      await fetch(`/api/storage?path=${encodeURIComponent(file.path)}&type=${file.type}`, { method: 'DELETE' });
      fetchFiles(currentPath);
      fetchStorageInfo();
    } catch (e) {}
  };

  // Optimize storage with AI
  const optimizeStorage = async () => {
    setIsProcessing(true);
    setCodeOutput('');
    
    const prompt = `Анализирай системата и предложи оптимизации:
    
Проект: ${formatBytes(storageInfo?.project.size || 0)}
Ollama модели: ${formatBytes(storageInfo?.ollama.size || 0)}
Диск свободен: ${formatBytes(storageInfo?.disk.free || 0)} от ${formatBytes(storageInfo?.disk.total || 0)}

Инсталирани модели: ${installedModels.map(m => `${m.name} (${formatBytes(m.size)})`).join(', ')}

Предложи конкретни стъпки за оптимизация на дисковото пространство.`;

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt, model: 'phi3:mini' })
      });
      const data = await response.json();
      setCodeOutput(data.content || 'Няма предложения');
    } catch (e: any) {
      setCodeOutput(`Грешка: ${e.message}`);
    }
    
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white flex flex-col">
      <header className="border-b border-gray-800/50 bg-gray-900/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">CrazyIT</h1>
                <p className="text-xs text-gray-500 font-mono">v2.0 • AI Storage & Model Manager</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/30">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-mono text-gray-300">ONLINE</span>
              </div>
              <select value={modelName} onChange={(e) => setModelName(e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs">
                {installedModels.map(m => <option key={m.name} value={m.name}>{m.name.split(':')[0]}</option>)}
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-3">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6 mb-3 bg-gray-800/30 border border-gray-700/50 p-0.5 rounded-lg h-9">
            <TabsTrigger value="console" className="text-xs h-7 data-[state=active]:bg-emerald-600/20"><MessageSquare className="w-3 h-3 mr-1" />Чат</TabsTrigger>
            <TabsTrigger value="code" className="text-xs h-7 data-[state=active]:bg-emerald-600/20"><Code2 className="w-3 h-3 mr-1" />Код</TabsTrigger>
            <TabsTrigger value="models" className="text-xs h-7 data-[state=active]:bg-emerald-600/20"><Package className="w-3 h-3 mr-1" />Модели</TabsTrigger>
            <TabsTrigger value="storage" className="text-xs h-7 data-[state=active]:bg-emerald-600/20"><HardDrive className="w-3 h-3 mr-1" />Сторидж</TabsTrigger>
            <TabsTrigger value="debug" className="text-xs h-7 data-[state=active]:bg-emerald-600/20"><Bug className="w-3 h-3 mr-1" />Поправки</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs h-7 data-[state=active]:bg-emerald-600/20"><Settings className="w-3 h-3 mr-1" />Монитор</TabsTrigger>
          </TabsList>

          {/* Console Tab */}
          <TabsContent value="console">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
              <div className="lg:col-span-1 space-y-2">
                {/* Mini Stats */}
                <Card className="bg-gray-800/30 border-gray-700/50">
                  <CardContent className="p-2 grid grid-cols-2 gap-1">
                    <div className="p-1.5 rounded bg-gray-700/20 text-center">
                      <p className="text-base font-bold text-emerald-400">{systemInfo?.cpu.usage.toFixed(0) || 0}%</p>
                      <p className="text-[10px] text-gray-500">CPU</p>
                    </div>
                    <div className="p-1.5 rounded bg-gray-700/20 text-center">
                      <p className="text-base font-bold text-teal-400">{systemInfo?.memory.usagePercent || 0}%</p>
                      <p className="text-[10px] text-gray-500">RAM</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gray-800/30 border-gray-700/50">
                  <CardContent className="p-2">
                    <div className="text-[10px] text-gray-500 mb-1">Модели: {installedModels.length}</div>
                    <div className="text-[10px] text-gray-500">Заявки: {stats.requests}</div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-4">
                <Card className="bg-gray-800/30 border-gray-700/50 flex flex-col h-[65vh]">
                  <CardContent className="flex-1 flex flex-col p-0">
                    <ScrollArea className="flex-1 p-3">
                      <div className="space-y-2">
                        {messages.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                            <Bot className="w-12 h-12 text-emerald-400 mb-2" />
                            <p className="text-base font-semibold text-white mb-1">Здравей! Аз съм CrazyIT</p>
                            <p className="text-center text-gray-500 text-xs">Локален AI с управление на модели и сторидж.</p>
                          </div>
                        ) : (
                          messages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[85%] rounded-lg p-2 ${msg.role === 'user' ? 'bg-emerald-600/20' : 'bg-gray-700/50'}`}>
                                <div className="text-xs prose prose-invert prose-sm max-w-none">
                                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                                </div>
                                <div className="text-[10px] text-gray-500 mt-1">{new Date(msg.timestamp).toLocaleTimeString('bg-BG')}</div>
                              </div>
                            </div>
                          ))
                        )}
                        {isProcessing && <div className="flex items-center gap-2 text-xs text-gray-400"><Loader2 className="w-3 h-3 animate-spin" /> AI мисли...</div>}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>
                    <div className="border-t border-gray-700/50 p-2">
                      <div className="flex gap-2">
                        <Input ref={inputRef} value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} placeholder="Напиши съобщение..." className="bg-gray-700/50 border-gray-600/50 h-8 text-sm" disabled={isProcessing} />
                        <Button onClick={sendMessage} disabled={isProcessing || !inputMessage.trim()} className="bg-emerald-600 h-8 px-3">{isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Code Tab */}
          <TabsContent value="code">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <Card className="bg-gray-800/30 border-gray-700/50">
                <CardHeader className="py-2"><CardTitle className="text-sm">Код Инструменти</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex gap-1 flex-wrap">
                    {['javascript', 'typescript', 'python', 'java', 'go', 'rust'].map(lang => (
                      <Button key={lang} variant={codeLanguage === lang ? 'default' : 'outline'} size="sm" onClick={() => setCodeLanguage(lang)} className={codeLanguage === lang ? 'bg-emerald-600 h-6 text-xs' : 'h-6 text-xs'}>{lang}</Button>
                    ))}
                  </div>
                  <Input value={codeDescription} onChange={(e) => setCodeDescription(e.target.value)} placeholder="Описание за генериране" className="h-8" />
                  <Textarea value={codeInput} onChange={(e) => setCodeInput(e.target.value)} placeholder="Код за анализ..." className="font-mono text-xs min-h-[150px]" />
                  <div className="grid grid-cols-4 gap-1">
                    <Button onClick={() => handleCodeAction('generate')} disabled={isProcessing} size="sm" className="bg-emerald-600 h-7 text-xs"><Sparkles className="w-3 h-3 mr-1" />Ген.</Button>
                    <Button onClick={() => handleCodeAction('analyze')} disabled={isProcessing} size="sm" variant="outline" className="h-7 text-xs"><Lightbulb className="w-3 h-3 mr-1" />Анал.</Button>
                    <Button onClick={() => handleCodeAction('debug')} disabled={isProcessing} size="sm" variant="outline" className="h-7 text-xs"><Bug className="w-3 h-3 mr-1" />Попр.</Button>
                    <Button onClick={() => handleCodeAction('explain')} disabled={isProcessing} size="sm" variant="outline" className="h-7 text-xs"><FileCode className="w-3 h-3 mr-1" />Обяс.</Button>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gray-800/30 border-gray-700/50">
                <CardHeader className="py-2">
                  <div className="flex justify-between">
                    <CardTitle className="text-sm">Резултат</CardTitle>
                    {codeOutput && <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(codeOutput)} className="h-6 text-xs"><Copy className="w-3 h-3" /></Button>}
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[280px]">
                    {codeOutput ? <pre className="text-xs whitespace-pre-wrap font-mono">{codeOutput}</pre> : <div className="text-center text-gray-500 py-8"><Code2 className="w-8 h-8 mx-auto mb-2" />Избери действие</div>}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Models Tab */}
          <TabsContent value="models">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Installed Models */}
              <Card className="bg-gray-800/30 border-gray-700/50">
                <CardHeader className="py-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2"><Package className="w-4 h-4 text-emerald-400" />Инсталирани Модели ({installedModels.length})</CardTitle>
                    <Button variant="ghost" size="sm" onClick={fetchModels} className="h-6"><RefreshCw className="w-3 h-3" /></Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[50vh] overflow-auto">
                  {installedModels.map(model => (
                    <div key={model.name} className="p-2 rounded bg-gray-700/20 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{model.name}</span>
                          <Badge className="bg-green-600 text-[10px] h-4">Активен</Badge>
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatBytes(model.size)} • {model.details?.parameter_size || '-'} • {model.details?.quantization_level || '-'}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setModelName(model.name)} className="h-6 text-xs">
                          {modelName === model.name ? <Check className="w-3 h-3 text-emerald-400" /> : <Plus className="w-3 h-3" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteModel(model.name)} className="h-6 text-red-400 hover:text-red-300">
                          <Trash className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Available Models */}
              <Card className="bg-gray-800/30 border-gray-700/50">
                <CardHeader className="py-2">
                  <CardTitle className="text-sm flex items-center gap-2"><Download className="w-4 h-4 text-teal-400" />Достъпни за Инсталация</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 max-h-[50vh] overflow-auto">
                  {POPULAR_MODELS.filter(m => !installedModels.some(im => im.name === m.name || im.name.startsWith(m.name.split(':')[0]))).map(model => (
                    <div key={model.name} className="p-2 rounded bg-gray-700/20 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{model.name}</div>
                        <div className="text-xs text-gray-500">{model.desc} • {model.size}</div>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handlePullModel(model.name)} 
                        disabled={isPulling}
                        className="h-6 bg-teal-600 hover:bg-teal-500"
                      >
                        {isPulling && pullModelName === model.name ? (
                          <><Loader2 className="w-3 h-3 animate-spin mr-1" />{pullProgress.slice(0, 10)}...</>
                        ) : <><Download className="w-3 h-3 mr-1" />Инст.</>}
                      </Button>
                    </div>
                  ))}
                  
                  {/* Custom model input */}
                  <div className="pt-2 border-t border-gray-700/50">
                    <div className="flex gap-2">
                      <Input 
                        placeholder="друг-модел:версия" 
                        className="h-7 text-xs"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            const target = e.target as HTMLInputElement;
                            if (target.value.trim()) handlePullModel(target.value.trim());
                          }
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Storage Tab */}
          <TabsContent value="storage">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {/* Storage Overview */}
              <Card className="bg-gray-800/30 border-gray-700/50">
                <CardHeader className="py-2">
                  <CardTitle className="text-sm flex items-center gap-2"><HardDrive className="w-4 h-4 text-purple-400" />Преглед на Сторидж</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-2 rounded bg-gray-700/20">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Диск</span>
                      <span className="text-purple-400">{storageInfo?.disk ? Math.round((storageInfo.disk.used / storageInfo.disk.total) * 100) : 0}%</span>
                    </div>
                    <Progress value={storageInfo?.disk ? (storageInfo.disk.used / storageInfo.disk.total) * 100 : 0} className="h-1.5" />
                    <div className="text-[10px] text-gray-500 mt-1">
                      {formatBytes(storageInfo?.disk.used || 0)} / {formatBytes(storageInfo?.disk.total || 0)}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-gray-700/20">
                      <div className="text-gray-500">Проект</div>
                      <div className="text-emerald-400 font-mono">{formatBytes(storageInfo?.project.size || 0)}</div>
                    </div>
                    <div className="p-2 rounded bg-gray-700/20">
                      <div className="text-gray-500">Ollama</div>
                      <div className="text-teal-400 font-mono">{formatBytes(storageInfo?.ollama.size || 0)}</div>
                    </div>
                    <div className="p-2 rounded bg-gray-700/20 col-span-2">
                      <div className="text-gray-500">Свободно</div>
                      <div className="text-green-400 font-mono">{formatBytes(storageInfo?.disk.free || 0)}</div>
                    </div>
                  </div>

                  <Button onClick={optimizeStorage} disabled={isProcessing} className="w-full h-8 bg-gradient-to-r from-purple-600 to-pink-600">
                    {isProcessing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                    AI Оптимизация
                  </Button>
                  {codeOutput && <pre className="text-[10px] whitespace-pre-wrap bg-gray-900/50 p-2 rounded max-h-[150px] overflow-auto">{codeOutput}</pre>}
                </CardContent>
              </Card>

              {/* Models Storage */}
              <Card className="bg-gray-800/30 border-gray-700/50">
                <CardHeader className="py-2">
                  <CardTitle className="text-sm flex items-center gap-2"><Package className="w-4 h-4 text-emerald-400" />Модели Сторидж</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 max-h-[40vh] overflow-auto">
                  {installedModels.map(m => (
                    <div key={m.name} className="p-2 rounded bg-gray-700/20 flex items-center justify-between text-xs">
                      <div className="truncate flex-1">{m.name}</div>
                      <div className="flex items-center gap-2">
                        <span className="text-teal-400 font-mono">{formatBytes(m.size)}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteModel(m.name)} className="h-5 text-red-400">
                          <Trash className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-xs">
                    <span className="text-gray-400">Общо:</span>
                    <span className="text-emerald-400 font-mono ml-1">{formatBytes(installedModels.reduce((a, m) => a + m.size, 0))}</span>
                  </div>
                </CardContent>
              </Card>

              {/* File Browser */}
              <Card className="bg-gray-800/30 border-gray-700/50">
                <CardHeader className="py-2">
                  <CardTitle className="text-sm flex items-center gap-2"><FolderOpen className="w-4 h-4 text-yellow-400" />Файлове</CardTitle>
                </CardHeader>
                <CardContent className="max-h-[40vh] overflow-auto">
                  {currentPath && (
                    <Button variant="ghost" size="sm" onClick={() => setCurrentPath(currentPath.split('/').slice(0, -1).join('/'))} className="h-6 text-xs mb-1">
                      <Folder className="w-3 h-3 mr-1" />..
                    </Button>
                  )}
                  <div className="space-y-0.5">
                    {files.map(file => (
                      <div key={file.path} className="p-1.5 rounded bg-gray-700/20 flex items-center justify-between text-xs hover:bg-gray-700/40">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {file.type === 'directory' ? <Folder className="w-3 h-3 text-yellow-400" /> : <File className="w-3 h-3 text-gray-400" />}
                          <span className="truncate">{file.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 font-mono">{formatBytes(file.size)}</span>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteFile(file)} className="h-5 text-red-400">
                            <Trash className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Debug Tab */}
          <TabsContent value="debug">
            <Card className="bg-gray-800/30 border-gray-700/50">
              <CardHeader className="py-2"><CardTitle className="text-sm flex items-center gap-2"><Bug className="w-4 h-4 text-emerald-400" />AI Debugger</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Textarea value={codeInput} onChange={(e) => setCodeInput(e.target.value)} placeholder="Постави код с грешка или опиши проблема..." className="font-mono text-xs min-h-[180px]" />
                <Button onClick={() => handleCodeAction('debug')} disabled={isProcessing || !codeInput.trim()} className="w-full h-8 bg-emerald-600">
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Bug className="w-4 h-4 mr-1" />}Намери и поправи грешките
                </Button>
                {codeOutput && <pre className="text-xs whitespace-pre-wrap bg-gray-900/50 p-3 rounded max-h-[250px] overflow-auto">{codeOutput}</pre>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings/Monitor Tab */}
          <TabsContent value="settings">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              <Card className="bg-gray-800/30 border-gray-700/50">
                <CardContent className="p-2">
                  <div className="flex items-center gap-2 mb-1"><Cpu className="w-4 h-4 text-emerald-400" /><span className="text-xs text-gray-400">CPU</span></div>
                  <div className="text-xl font-bold text-emerald-400">{systemInfo?.cpu.usage.toFixed(0) || 0}%</div>
                  <Progress value={systemInfo?.cpu.usage || 0} className="h-1 mt-1" />
                  <div className="text-[10px] text-gray-500 mt-1">{systemInfo?.cpu.temp || 0}°C • {systemInfo?.cpu.cores || 0} ядра</div>
                </CardContent>
              </Card>
              <Card className="bg-gray-800/30 border-gray-700/50">
                <CardContent className="p-2">
                  <div className="flex items-center gap-2 mb-1"><MemoryStick className="w-4 h-4 text-teal-400" /><span className="text-xs text-gray-400">RAM</span></div>
                  <div className="text-xl font-bold text-teal-400">{systemInfo?.memory.usagePercent || 0}%</div>
                  <Progress value={systemInfo?.memory.usagePercent || 0} className="h-1 mt-1" />
                  <div className="text-[10px] text-gray-500 mt-1">{formatBytes(systemInfo?.memory.used || 0)} / {formatBytes(systemInfo?.memory.total || 0)}</div>
                </CardContent>
              </Card>
              {systemInfo?.gpu && (
                <Card className="bg-gray-800/30 border-gray-700/50">
                  <CardContent className="p-2">
                    <div className="flex items-center gap-2 mb-1"><CpuIcon className="w-4 h-4 text-cyan-400" /><span className="text-xs text-gray-400">GPU</span></div>
                    <div className="text-xl font-bold text-cyan-400">{systemInfo.gpu.utilization}%</div>
                    <Progress value={systemInfo.gpu.utilization} className="h-1 mt-1" />
                    <div className="text-[10px] text-gray-500 mt-1">{systemInfo.gpu.temp}°C • {systemInfo.gpu.power.toFixed(0)}W</div>
                  </CardContent>
                </Card>
              )}
              <Card className="bg-gray-800/30 border-gray-700/50">
                <CardContent className="p-2">
                  <div className="flex items-center gap-2 mb-1"><HardDrive className="w-4 h-4 text-purple-400" /><span className="text-xs text-gray-400">Диск</span></div>
                  <div className="text-xl font-bold text-purple-400">{systemInfo?.disk.usagePercent || 0}%</div>
                  <Progress value={systemInfo?.disk.usagePercent || 0} className="h-1 mt-1" />
                  <div className="text-[10px] text-gray-500 mt-1">{formatBytes(systemInfo?.disk.free || 0)} свободно</div>
                </CardContent>
              </Card>
              <Card className="bg-gray-800/30 border-gray-700/50">
                <CardContent className="p-2">
                  <div className="flex items-center gap-2 mb-1"><Package className="w-4 h-4 text-emerald-400" /><span className="text-xs text-gray-400">Модели</span></div>
                  <div className="text-xl font-bold text-emerald-400">{installedModels.length}</div>
                  <div className="text-[10px] text-gray-500 mt-1">{formatBytes(installedModels.reduce((a, m) => a + m.size, 0))}</div>
                </CardContent>
              </Card>
              <Card className="bg-gray-800/30 border-gray-700/50">
                <CardContent className="p-2">
                  <div className="flex items-center gap-2 mb-1"><MessageSquare className="w-4 h-4 text-teal-400" /><span className="text-xs text-gray-400">Съобщения</span></div>
                  <div className="text-xl font-bold text-teal-400">{stats.messages}</div>
                  <div className="text-[10px] text-gray-500 mt-1">{stats.requests} заявки</div>
                </CardContent>
              </Card>
              <Card className="bg-gray-800/30 border-gray-700/50">
                <CardContent className="p-2">
                  <div className="flex items-center gap-2 mb-1"><Timer className="w-4 h-4 text-yellow-400" /><span className="text-xs text-gray-400">Uptime</span></div>
                  <div className="text-sm font-bold text-yellow-400">{systemInfo?.uptime || '-'}</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-gray-800/50 bg-gray-900/80 py-2">
        <div className="container mx-auto px-4 flex items-center justify-between text-[10px] text-gray-500">
          <div className="flex items-center gap-3">
            <span>🔧 {installedModels.length} модела</span>
            <span>💾 {formatBytes(storageInfo?.disk.free || 0)} свободно</span>
          </div>
          <span>CrazyIT v2.0 • Storage & Model Manager</span>
        </div>
      </footer>
    </div>
  );
}
