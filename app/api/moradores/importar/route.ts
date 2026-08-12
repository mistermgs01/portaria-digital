import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { moradores } from '@/db/schemas/moradores'
import { eq } from 'drizzle-orm'

type LinhaImport = {
  nome: string
  apartamento: string
  bloco?: string
  telefone?: string
  email?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { linhas: LinhaImport[] }
    if (!Array.isArray(body.linhas) || body.linhas.length === 0) {
      return NextResponse.json({ success: false, error: 'Nenhuma linha para importar' }, { status: 400 })
    }

    let inseridos = 0
    let atualizados = 0
    let erros: string[] = []

    for (const linha of body.linhas) {
      if (!linha.nome?.trim() || !linha.apartamento?.trim()) {
        erros.push(`Linha ignorada: nome ou apartamento vazio`)
        continue
      }

      try {
        // Unicidade: mesmo nome (case-insensitive) + mesmo apartamento + mesmo bloco
        // Permite múltiplos moradores por apartamento (famílias)
        const nomeLower = linha.nome.trim().toLowerCase()
        const aptoTrim = linha.apartamento.trim()
        const blocoTrim = (linha.bloco ?? '').trim().toLowerCase()

        const existentes = await db
          .select()
          .from(moradores)
          .where(eq(moradores.apartamento, aptoTrim))

        const mesmaPessoa = existentes.find(m =>
          m.nome.toLowerCase() === nomeLower &&
          (m.bloco ?? '').toLowerCase() === blocoTrim
        )

        if (mesmaPessoa) {
          // Atualiza somente dados de contato do mesmo morador
          await db.update(moradores)
            .set({
              bloco: linha.bloco?.trim() || null,
              telefone: linha.telefone?.trim() || null,
              email: linha.email?.trim() || null,
              updatedAt: new Date(),
            })
            .where(eq(moradores.id, mesmaPessoa.id))
          atualizados++
        } else {
          // Novo morador (mesmo que no mesmo apartamento)
          await db.insert(moradores).values({
            nome: linha.nome.trim(),
            apartamento: aptoTrim,
            bloco: linha.bloco?.trim() || null,
            telefone: linha.telefone?.trim() || null,
            email: linha.email?.trim() || null,
            status: 'ativo',
          })
          inseridos++
        }
      } catch (e) {
        erros.push(`Erro ao processar ${linha.nome}: ${e instanceof Error ? e.message : 'desconhecido'}`)
      }
    }

    return NextResponse.json({ success: true, data: { inseridos, atualizados, erros } })
  } catch (error) {
    console.error('Erro importação:', error)
    return NextResponse.json({ success: false, error: 'Erro interno na importação' }, { status: 500 })
  }
}
