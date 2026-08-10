CREATE TYPE "public"."status_morador" AS ENUM('ativo', 'inativo');--> statement-breakpoint
CREATE TABLE "moradores" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" varchar(255) NOT NULL,
	"apartamento" varchar(20) NOT NULL,
	"bloco" varchar(10),
	"telefone" varchar(20),
	"email" varchar(255),
	"cpf" varchar(14),
	"observacoes" text,
	"status" "status_morador" DEFAULT 'ativo' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
