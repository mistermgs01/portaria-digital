import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { veiculos } from '@/db/schemas/veiculos'
import { eq } from 'drizzle-orm'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.delete(veiculos).where(eq(veiculos.id, parseInt(id)))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: 'Erro ao remover' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    if (body.placa) body.placa = body.placa.toUpperCase().replace(/\s/g, '')
    const [updated] = await db.update(veiculos).set(body).where(eq(veiculos.id, parseInt(id))).returning()
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: 'Erro ao atualizar' }, { status: 500 })
  }
}
