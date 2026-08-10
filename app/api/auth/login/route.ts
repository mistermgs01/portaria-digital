import { NextRequest, NextResponse } from 'next/server'
import { loginWithPassword } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json() as { username: string; password: string }
    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'INVALID_INPUT' }, { status: 400 })
    }
    const result = await loginWithPassword(username, password)
    if (!result.success) {
      return NextResponse.json({ success: false, error: 'Usuário ou senha incorretos' }, { status: 401 })
    }
    return NextResponse.json({ success: true, user: result.user })
  } catch {
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
