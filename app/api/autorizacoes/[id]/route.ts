import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { autorizacoes } from '@/db/schemas/autorizacoes'
import { eq } from 'drizzle-orm'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  try {
    const updated = await db
      .update(autorizacoes)
      .set({
        nome: body.nome,
        tipo: body.tipo,
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
        status: body.status,
        motivo: body.motivo || null,
        observacoes: body.observacoes || null,
        updatedAt: new Date(),
      })
      .where(eq(autorizacoes.id, Number(id)))
      .returning()

    return NextResponse.json({ success: true, data: updated[0] })
  } catch (e) {
    console.error('Erro atualizar autorização:', e)
    return NextResponse.json({ success: false, error: 'Erro ao atualizar' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    // Cancelar (não deletar fisicamente) para manter histórico
    await db
      .update(autorizacoes)
      .set({ status: 'cancelada', updatedAt: new Date() })
      .where(eq(autorizacoes.id, Number(id)))

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Erro cancelar autorização:', e)
    return NextResponse.json({ success: false, error: 'Erro ao cancelar' }, { status: 500 })
  }
}
