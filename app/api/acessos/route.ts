import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { acessos } from '@/db/schemas/veiculos'
import { moradores } from '@/db/schemas/moradores'
import { eq, desc } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') ?? '50')
    const autorizacaoId = searchParams.get('autorizacaoId')

    let query = db
      .select({ acesso: acessos, morador: moradores })
      .from(acessos)
      .leftJoin(moradores, eq(acessos.moradorId, moradores.id))
      .orderBy(desc(acessos.createdAt))

    if (autorizacaoId) {
      const rows = await db
        .select({ acesso: acessos, morador: moradores })
        .from(acessos)
        .leftJoin(moradores, eq(acessos.moradorId, moradores.id))
        .where(eq(acessos.autorizacaoId, parseInt(autorizacaoId)))
        .orderBy(desc(acessos.createdAt))
      return NextResponse.json({ success: true, data: rows })
    }

    const lista = await query.limit(limit)
    return NextResponse.json({ success: true, data: lista })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (body.placa) body.placa = body.placa.toUpperCase().replace(/\s/g, '')
    const [novo] = await db.insert(acessos).values(body).returning()
    return NextResponse.json({ success: true, data: novo }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: 'Erro ao registrar acesso' }, { status: 500 })
  }
}
