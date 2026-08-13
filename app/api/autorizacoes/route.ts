import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { autorizacoes } from '@/db/schemas/autorizacoes'
import { moradores } from '@/db/schemas/moradores'
import { eq, desc, or, ilike, and, lte, sql } from 'drizzle-orm'

// Auto-expire: atualiza registros expirados antes de retornar
async function atualizarExpiradas() {
  try {
    await db
      .update(autorizacoes)
      .set({ status: 'expirada' })
      .where(and(eq(autorizacoes.status, 'ativa'), lte(autorizacoes.validoAte, sql`NOW()`)))
  } catch { /* ignora */ }
}

export async function GET(req: NextRequest) {

  await atualizarExpiradas()

  const { searchParams } = new URL(req.url)
  const busca = searchParams.get('busca') ?? ''
  const filtroStatus = searchParams.get('status') ?? 'todas'

  const lista = await db
    .select({
      id: autorizacoes.id,
      nome: autorizacoes.nome,
      tipo: autorizacoes.tipo,
      documento: autorizacoes.documento,
      telefone: autorizacoes.telefone,
      empresa: autorizacoes.empresa,
      placa: autorizacoes.placa,
      modelo: autorizacoes.modelo,
      cor: autorizacoes.cor,
      fotoVeiculo: autorizacoes.fotoVeiculo,
      moradorId: autorizacoes.moradorId,
      apartamentoDestino: autorizacoes.apartamentoDestino,
      blocoDestino: autorizacoes.blocoDestino,
      vaga: autorizacoes.vaga,
      validoAte: autorizacoes.validoAte,
      status: autorizacoes.status,
      motivo: autorizacoes.motivo,
      observacoes: autorizacoes.observacoes,
      createdAt: autorizacoes.createdAt,
      moradorNome: moradores.nome,
    })
    .from(autorizacoes)
    .leftJoin(moradores, eq(autorizacoes.moradorId, moradores.id))
    .where(
      and(
        busca
          ? or(
              ilike(autorizacoes.nome, `%${busca}%`),
              ilike(autorizacoes.placa, `%${busca}%`),
              ilike(autorizacoes.apartamentoDestino, `%${busca}%`),
              ilike(autorizacoes.empresa, `%${busca}%`),
            )
          : undefined,
        filtroStatus !== 'todas'
          ? eq(autorizacoes.status, filtroStatus as 'ativa' | 'expirada' | 'cancelada')
          : undefined,
      )
    )
    .orderBy(desc(autorizacoes.createdAt))
    .limit(200)

  return NextResponse.json({ success: true, data: lista })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const nova = await db
      .insert(autorizacoes)
      .values({
        nome: body.nome,
        tipo: body.tipo ?? 'visitante',
        documento: body.documento || null,
        telefone: body.telefone || null,
        empresa: body.empresa || null,
        placa: body.placa ? body.placa.toUpperCase().replace(/[^A-Z0-9]/g, '') : null,
        modelo: body.modelo || null,
        cor: body.cor || null,
        fotoVeiculo: body.fotoVeiculo || null,
        moradorId: body.moradorId ? Number(body.moradorId) : null,
        apartamentoDestino: body.apartamentoDestino || null,
        blocoDestino: body.blocoDestino || null,
        vaga: body.vaga || null,
        validoAte: new Date(body.validoAte),
        motivo: body.motivo || null,
        observacoes: body.observacoes || null,
      })
      .returning()

    return NextResponse.json({ success: true, data: nova[0] })
  } catch (e) {
    console.error('Erro criar autorização:', e)
    return NextResponse.json({ success: false, error: 'Erro ao criar autorização' }, { status: 500 })
  }
}
