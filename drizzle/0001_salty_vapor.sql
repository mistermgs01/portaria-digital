CREATE TYPE "public"."origem_acesso" AS ENUM('morador', 'visitante');--> statement-breakpoint
CREATE TYPE "public"."tipo_acesso" AS ENUM('entrada', 'saida');--> statement-breakpoint
CREATE TYPE "public"."tipo_veiculo" AS ENUM('carro', 'moto', 'caminhao', 'outro');--> statement-breakpoint
CREATE TABLE "acessos" (
	"id" serial PRIMARY KEY NOT NULL,
	"placa" varchar(10) NOT NULL,
	"tipo" "tipo_acesso" NOT NULL,
	"origem" "origem_acesso" DEFAULT 'visitante' NOT NULL,
	"morador_id" integer,
	"nome_visitante" varchar(255),
	"apartamento_destino" varchar(20),
	"observacoes" text,
	"imagem_placa" text,
	"confianca_leitura" varchar(10),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "veiculos" (
	"id" serial PRIMARY KEY NOT NULL,
	"placa" varchar(10) NOT NULL,
	"modelo" varchar(100),
	"cor" varchar(50),
	"tipo" "tipo_veiculo" DEFAULT 'carro' NOT NULL,
	"morador_id" integer,
	"proprietario" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "veiculos_placa_unique" UNIQUE("placa")
);
--> statement-breakpoint
ALTER TABLE "acessos" ADD CONSTRAINT "acessos_morador_id_moradores_id_fk" FOREIGN KEY ("morador_id") REFERENCES "public"."moradores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "veiculos" ADD CONSTRAINT "veiculos_morador_id_moradores_id_fk" FOREIGN KEY ("morador_id") REFERENCES "public"."moradores"("id") ON DELETE set null ON UPDATE no action;