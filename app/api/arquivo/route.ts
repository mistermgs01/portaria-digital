import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { visitasArquivadas } from '@/db/schemas/visitas_arquivadas'
import { autorizacoes } from '@/db/schemas/autorizacoes'
import { acessos } from '@/db/schemas/veiculos'
import { moradores } from '@/db/schemas/moradores'
import { eq, desc } from 'drizzle-orm'

// GET /api/arquivo — lista visitas arquivadas
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') ?? '50')
    const offset = parseInt(searchParams.get('offset') ?? '0')

    const lista = await db
      .select()
      .from(visitasArquivadas)
      .orderBy(desc(visitasArquivadas.arquivadoEm))
      .limit(limit)
      .offset(offset)

    return NextResponse.json({ success: true, data: lista })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ success: false, error: 'Erro ao listar arquivo' }, { status: 500 })
  }
}

// POST /api/arquivo — arquiva uma autorização com seus acessos
export async function POST(req: NextRequest) {
  try {
    const { autorizacaoId } = await req.json() as { autorizacaoId: number }
    if (!autorizacaoId) return NextResponse.json({ success: false, error: 'autorizacaoId obrigatório' }, { status: 400 })

    // Busca autorização completa com morador
    const rows = await db
      .select({
        aut: autorizacoes,
        moradorNome: moradores.nome,
      })
      .from(autorizacoes)
      .leftJoin(moradores, eq(autorizacoes.moradorId, moradores.id))
      .where(eq(autorizacoes.id, autorizacaoId))
      .limit(1)

    if (rows.length === 0) return NextResponse.json({ success: false, error: 'Autorização não encontrada' }, { status: 404 })
    const { aut, moradorNome } = rows[0]

    // Busca todos os acessos vinculados
    const movRows = await db
      .select({ acesso: acessos })
      .from(acessos)
      .where(eq(acessos.autorizacaoId, autorizacaoId))
      .orderBy(acessos.createdAt)

    const movimentacoes = movRows.map(r => ({
      id: r.acesso.id,
      tipo: r.acesso.tipo as 'entrada' | 'saida',
      placa: r.acesso.placa,
      createdAt: r.acesso.createdAt as unknown as string,
      nomeVisitante: r.acesso.nomeVisitante ?? undefined,
    }))

    // Insere no arquivo
    const [arquivada] = await db.insert(visitasArquivadas).values({
      autorizacaoId: aut.id,
      nome: aut.nome,
      tipo: aut.tipo,
      documento: aut.documento ?? null,
      telefone: aut.telefone ?? null,
      empresa: aut.empresa ?? null,
      placa: aut.placa ?? null,
      modelo: aut.modelo ?? null,
      cor: aut.cor ?? null,
      vaga: aut.vaga ?? null,
      moradorNome: moradorNome ?? null,
      apartamentoDestino: aut.apartamentoDestino ?? null,
      blocoDestino: aut.blocoDestino ?? null,
      motivo: aut.motivo ?? null,
      observacoes: aut.observacoes ?? null,
      validoDe: aut.createdAt,
      validoAte: aut.validoAte,
      statusFinal: aut.status,
      movimentacoes,
    }).returning()

    return NextResponse.json({ success: true, data: arquivada })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ success: false, error: 'Erro ao arquivar visita' }, { status: 500 })
  }
}
