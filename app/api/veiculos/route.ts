import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { veiculos } from '@/db/schemas/veiculos'
import { moradores } from '@/db/schemas/moradores'
import { eq, ilike, or } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const busca = searchParams.get('busca')?.trim()
    const placa = searchParams.get('placa')?.trim()

    if (placa) {
      // Look up single plate (for access control)
      const [veiculo] = await db
        .select({
          veiculo: veiculos,
          morador: moradores,
        })
        .from(veiculos)
        .leftJoin(moradores, eq(veiculos.moradorId, moradores.id))
        .where(eq(veiculos.placa, placa.toUpperCase()))
        .limit(1)
      return NextResponse.json({ success: true, data: veiculo ?? null })
    }

    let lista
    if (busca) {
      lista = await db
        .select({ veiculo: veiculos, morador: moradores })
        .from(veiculos)
        .leftJoin(moradores, eq(veiculos.moradorId, moradores.id))
        .where(or(
          ilike(veiculos.placa, `%${busca}%`),
          ilike(veiculos.modelo, `%${busca}%`),
          ilike(veiculos.proprietario, `%${busca}%`),
        ))
    } else {
      lista = await db
        .select({ veiculo: veiculos, morador: moradores })
        .from(veiculos)
        .leftJoin(moradores, eq(veiculos.moradorId, moradores.id))
    }

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
    const [novo] = await db.insert(veiculos).values(body).returning()
    return NextResponse.json({ success: true, data: novo }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: 'Erro ao cadastrar veículo' }, { status: 500 })
  }
}
