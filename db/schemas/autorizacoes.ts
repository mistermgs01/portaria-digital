import { pgTable, serial, varchar, timestamp, text, integer, pgEnum } from 'drizzle-orm/pg-core'
import { moradores } from './moradores'

export const tipoAutorizacaoEnum = pgEnum('tipo_autorizacao', ['visitante', 'prestador', 'entrega', 'outro'])
export const statusAutorizacaoEnum = pgEnum('status_autorizacao', ['ativa', 'expirada', 'cancelada'])

export const autorizacoes = pgTable('autorizacoes', {
  id: serial('id').primaryKey(),
  // Pessoa
  nome: varchar('nome', { length: 255 }).notNull(),
  tipo: tipoAutorizacaoEnum('tipo').notNull().default('visitante'),
  documento: varchar('documento', { length: 50 }), // RG ou CPF
  telefone: varchar('telefone', { length: 20 }),
  empresa: varchar('empresa', { length: 255 }), // para prestadores
  // Veículo
  placa: varchar('placa', { length: 10 }),
  modelo: varchar('modelo', { length: 100 }),
  cor: varchar('cor', { length: 50 }),
  fotoVeiculo: text('foto_veiculo'), // base64 da foto do veículo
  // Destino
  moradorId: integer('morador_id').references(() => moradores.id, { onDelete: 'set null' }),
  apartamentoDestino: varchar('apartamento_destino', { length: 20 }),
  blocoDestino: varchar('bloco_destino', { length: 10 }),
  // Validade
  validoAte: timestamp('valido_ate').notNull(),
  status: statusAutorizacaoEnum('status').notNull().default('ativa'),
  // Observações
  motivo: text('motivo'),
  observacoes: text('observacoes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type Autorizacao = typeof autorizacoes.$inferSelect
export type NovaAutorizacao = typeof autorizacoes.$inferInsert
