import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    success: true,
    models: [
      { name: 'qwen2.5:32b', displayName: 'Qwen 2.5 32B', size: '~20GB', ramRequired: '24GB', description: 'Най-добър' },
      { name: 'deepseek-r1:14b', displayName: 'DeepSeek R1 14B', size: '~9GB', ramRequired: '14GB', description: 'Разсъждения' },
      { name: 'qwen2.5-coder:7b', displayName: 'Qwen 2.5 Coder 7B', size: '~5GB', ramRequired: '8GB', description: 'Код' },
      { name: 'llama3.2:3b', displayName: 'Llama 3.2 3B', size: '~2GB', ramRequired: '4GB', description: 'Бърз' }
    ]
  })
}
