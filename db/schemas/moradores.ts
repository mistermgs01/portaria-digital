import { pgTable, serial, text, varchar, timestamp, pgEnum } from 'drizzle-orm/pg-core'

export const statusEnum = pgEnum('status_morador', ['ativo', 'inativo'])

export const moradores = pgTable('moradores', {
  id: serial('id').primaryKey(),
  nome: varchar('nome', { length: 255 }).notNull(),
  apartamento: varchar('apartamento', { length: 20 }).notNull(),
  bloco: varchar('bloco', { length: 10 }),
  telefone: varchar('telefone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  cpf: varchar('cpf', { length: 14 }),
  observacoes: text('observacoes'),
  status: statusEnum('status').notNull().default('ativo'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type Morador = typeof moradores.$inferSelect
export type NovoMorador = typeof moradores.$inferInsert
