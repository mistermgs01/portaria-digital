import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { moradores, type NovoMorador } from '@/db/schemas/moradores'
import { ilike, or, eq } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const busca = searchParams.get('busca')?.trim()

    let lista
    if (busca) {
      lista = await db
        .select()
        .from(moradores)
        .where(
          or(
            ilike(moradores.nome, `%${busca}%`),
            ilike(moradores.apartamento, `%${busca}%`),
            ilike(moradores.bloco, `%${busca}%`),
            ilike(moradores.telefone, `%${busca}%`),
          )
        )
        .orderBy(moradores.apartamento)
    } else {
      lista = await db.select().from(moradores).orderBy(moradores.apartamento)
    }

    return NextResponse.json({ success: true, data: lista })
  } catch (error) {
    console.error('Erro ao buscar moradores:', error)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as NovoMorador
    const [novo] = await db.insert(moradores).values(body).returning()
    return NextResponse.json({ success: true, data: novo }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar morador:', error)
    return NextResponse.json({ success: false, error: 'Erro ao criar morador' }, { status: 500 })
  }
}
