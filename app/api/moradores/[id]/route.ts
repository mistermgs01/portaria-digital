import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { moradores } from '@/db/schemas/moradores'
import { eq } from 'drizzle-orm'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const [atualizado] = await db
      .update(moradores)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(moradores.id, parseInt(id)))
      .returning()
    if (!atualizado) {
      return NextResponse.json({ success: false, error: 'Morador não encontrado' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: atualizado })
  } catch (error) {
    console.error('Erro ao atualizar morador:', error)
    return NextResponse.json({ success: false, error: 'Erro ao atualizar' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.delete(moradores).where(eq(moradores.id, parseInt(id)))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao deletar morador:', error)
    return NextResponse.json({ success: false, error: 'Erro ao deletar' }, { status: 500 })
  }
}
