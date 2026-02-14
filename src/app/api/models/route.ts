import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const OLLAMA_API = 'http://localhost:11434'

// Get installed models
async function getInstalledModels() {
  try {
    const res = await fetch(`${OLLAMA_API}/api/tags`)
    const data = await res.json()
    return data.models || []
  } catch {
    return []
  }
}

// Pull new model
async function pullModel(modelName: string, onProgress?: (status: string) => void) {
  try {
    const res = await fetch(`${OLLAMA_API}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName, stream: false })
    })
    return res.ok
  } catch {
    return false
  }
}

// Delete model
async function deleteModel(modelName: string) {
  try {
    const res = await fetch(`${OLLAMA_API}/api/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName })
    })
    return res.ok
  } catch {
    return false
  }
}

// Get model info
async function getModelInfo(modelName: string) {
  try {
    const res = await fetch(`${OLLAMA_API}/api/show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName })
    })
    return await res.json()
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const action = searchParams.get('action')
  const model = searchParams.get('model')

  try {
    if (action === 'list') {
      const models = await getInstalledModels()
      return NextResponse.json({ models })
    }
    
    if (action === 'info' && model) {
      const info = await getModelInfo(model)
      return NextResponse.json(info || { error: 'Model not found' })
    }

    // Default: list models
    const models = await getInstalledModels()
    return NextResponse.json({ models })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, model } = body

    if (action === 'pull' && model) {
      const success = await pullModel(model)
      return NextResponse.json({ success, message: success ? `Model ${model} installed` : 'Failed to install model' })
    }

    if (action === 'delete' && model) {
      const success = await deleteModel(model)
      return NextResponse.json({ success, message: success ? `Model ${model} deleted` : 'Failed to delete model' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const model = searchParams.get('model')

  if (!model) {
    return NextResponse.json({ error: 'Model name required' }, { status: 400 })
  }

  const success = await deleteModel(model)
  return NextResponse.json({ success })
}
