import { pgTable, serial, varchar, timestamp, pgEnum, integer, text } from 'drizzle-orm/pg-core'
import { moradores } from './moradores'

export const tipoVeiculoEnum = pgEnum('tipo_veiculo', ['carro', 'moto', 'caminhao', 'outro'])
export const tipoAcessoEnum = pgEnum('tipo_acesso', ['entrada', 'saida'])
export const origemEnum = pgEnum('origem_acesso', ['morador', 'visitante'])

export const veiculos = pgTable('veiculos', {
  id: serial('id').primaryKey(),
  placa: varchar('placa', { length: 10 }).notNull().unique(),
  modelo: varchar('modelo', { length: 100 }),
  cor: varchar('cor', { length: 50 }),
  tipo: tipoVeiculoEnum('tipo').notNull().default('carro'),
  moradorId: integer('morador_id').references(() => moradores.id, { onDelete: 'set null' }),
  proprietario: varchar('proprietario', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const acessos = pgTable('acessos', {
  id: serial('id').primaryKey(),
  placa: varchar('placa', { length: 10 }).notNull(),
  tipo: tipoAcessoEnum('tipo').notNull(),
  origem: origemEnum('origem').notNull().default('visitante'),
  moradorId: integer('morador_id').references(() => moradores.id, { onDelete: 'set null' }),
  nomeVisitante: varchar('nome_visitante', { length: 255 }),
  apartamentoDestino: varchar('apartamento_destino', { length: 20 }),
  observacoes: text('observacoes'),
  imagemPlaca: text('imagem_placa'), // base64 ou URL da foto tirada
  confiancaLeitura: varchar('confianca_leitura', { length: 10 }), // ex: "alta", "media", "baixa"
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type Veiculo = typeof veiculos.$inferSelect
export type NovoVeiculo = typeof veiculos.$inferInsert
export type Acesso = typeof acessos.$inferSelect
export type NovoAcesso = typeof acessos.$inferInsert
