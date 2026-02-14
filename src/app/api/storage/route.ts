import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { readdir, stat, unlink, rmdir } from 'fs/promises'
import { join } from 'path'

const execAsync = promisify(exec)

const PROJECT_DIR = process.env.PROJECT_DIR || '/home/crezyit/crazyit'

interface FileItem {
  name: string
  path: string
  size: number
  type: 'file' | 'directory'
  modified: string
  extension?: string
}

async function getDirSize(dirPath: string): Promise<number> {
  let size = 0
  try {
    const files = await readdir(dirPath, { withFileTypes: true })
    for (const file of files) {
      const fullPath = join(dirPath, file.name)
      if (file.isDirectory()) {
        size += await getDirSize(fullPath)
      } else {
        const stats = await stat(fullPath)
        size += stats.size
      }
    }
  } catch {}
  return size
}

async function listFiles(dirPath: string, baseDir: string = dirPath): Promise<FileItem[]> {
  const files: FileItem[] = []
  try {
    const items = await readdir(dirPath, { withFileTypes: true })
    for (const item of items) {
      const fullPath = join(dirPath, item.name)
      const relativePath = fullPath.replace(baseDir, '')
      
      if (item.isDirectory()) {
        files.push({
          name: item.name,
          path: relativePath,
          size: await getDirSize(fullPath),
          type: 'directory',
          modified: (await stat(fullPath)).mtime.toISOString()
        })
      } else {
        const stats = await stat(fullPath)
        const ext = item.name.split('.').pop()
        files.push({
          name: item.name,
          path: relativePath,
          size: stats.size,
          type: 'file',
          modified: stats.mtime.toISOString(),
          extension: ext
        })
      }
    }
  } catch {}
  return files.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

async function getStorageInfo() {
  const ollamaModelsPath = '/usr/share/ollama/.ollama/models'
  
  let projectSize = 0
  let ollamaSize = 0
  
  try {
    projectSize = await getDirSize(PROJECT_DIR)
  } catch {}
  
  try {
    ollamaSize = await getDirSize(ollamaModelsPath)
  } catch {}

  // Get disk info
  let diskTotal = 0, diskUsed = 0, diskFree = 0
  try {
    const { stdout } = await execAsync('df -B1 / | tail -1')
    const parts = stdout.trim().split(/\s+/)
    diskTotal = parseInt(parts[1]) || 0
    diskUsed = parseInt(parts[2]) || 0
    diskFree = parseInt(parts[3]) || 0
  } catch {}

  return {
    project: { path: PROJECT_DIR, size: projectSize },
    ollama: { path: ollamaModelsPath, size: ollamaSize },
    disk: { total: diskTotal, used: diskUsed, free: diskFree }
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const action = searchParams.get('action')
  const path = searchParams.get('path') || ''

  try {
    if (action === 'info') {
      const info = await getStorageInfo()
      return NextResponse.json(info)
    }
    
    if (action === 'list') {
      const targetPath = path ? join(PROJECT_DIR, path) : PROJECT_DIR
      const files = await listFiles(targetPath, PROJECT_DIR)
      return NextResponse.json({ files, currentPath: path })
    }

    if (action === 'analyze') {
      // AI analysis of storage
      const info = await getStorageInfo()
      const models = await (await fetch('http://localhost:11434/api/tags')).json()
      
      // Calculate optimizations
      const recommendations = []
      
      if (info.ollama.size > 20 * 1024 * 1024 * 1024) {
        recommendations.push('Ollama models заемат много място. Разгледайте изтриване на неизползвани модели.')
      }
      
      if (info.disk.free < info.disk.total * 0.1) {
        recommendations.push('Дисковото пространство е критично ниско!')
      }

      // Find large files
      const largeFiles: FileItem[] = []
      const allFiles = await listFiles(join(PROJECT_DIR, 'node_modules'), PROJECT_DIR).catch(() => [])
      
      return NextResponse.json({
        info,
        models: models.models || [],
        recommendations,
        canOptimize: recommendations.length > 0
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const path = searchParams.get('path')
  const type = searchParams.get('type')

  if (!path) {
    return NextResponse.json({ error: 'Path required' }, { status: 400 })
  }

  try {
    const fullPath = join(PROJECT_DIR, path)
    
    // Security check - don't allow deleting outside project dir
    if (!fullPath.startsWith(PROJECT_DIR)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (type === 'directory') {
      await rmdir(fullPath, { recursive: true })
    } else {
      await unlink(fullPath)
    }
    
    return NextResponse.json({ success: true, message: `Deleted ${path}` })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
