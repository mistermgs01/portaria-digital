import { pgTable, serial, varchar, timestamp, text, integer, jsonb } from 'drizzle-orm/pg-core'
import { autorizacoes } from './autorizacoes'

export const visitasArquivadas = pgTable('visitas_arquivadas', {
  id: serial('id').primaryKey(),
  autorizacaoId: integer('autorizacao_id').references(() => autorizacoes.id, { onDelete: 'set null' }),
  nome: varchar('nome', { length: 255 }).notNull(),
  tipo: varchar('tipo', { length: 50 }),
  documento: varchar('documento', { length: 100 }),
  telefone: varchar('telefone', { length: 50 }),
  empresa: varchar('empresa', { length: 255 }),
  placa: varchar('placa', { length: 10 }),
  modelo: varchar('modelo', { length: 100 }),
  cor: varchar('cor', { length: 50 }),
  vaga: varchar('vaga', { length: 20 }),
  moradorNome: varchar('morador_nome', { length: 255 }),
  apartamentoDestino: varchar('apartamento_destino', { length: 20 }),
  blocoDestino: varchar('bloco_destino', { length: 20 }),
  motivo: text('motivo'),
  observacoes: text('observacoes'),
  validoDe: timestamp('valido_de'),
  validoAte: timestamp('valido_ate'),
  statusFinal: varchar('status_final', { length: 20 }),
  movimentacoes: jsonb('movimentacoes').$type<Movimentacao[]>().default([]),
  arquivadoEm: timestamp('arquivado_em').notNull().defaultNow(),
  arquivadoPor: varchar('arquivado_por', { length: 50 }),
})

export interface Movimentacao {
  id: number
  tipo: 'entrada' | 'saida'
  placa: string
  createdAt: string
  nomeVisitante?: string
}

export type VisitaArquivada = typeof visitasArquivadas.$inferSelect
export type NovaVisitaArquivada = typeof visitasArquivadas.$inferInsert
