CREATE TYPE "public"."geocode_status" AS ENUM('geocoded', 'manual', 'unresolved');--> statement-breakpoint
CREATE TABLE "geocode_cache" (
	"key" text PRIMARY KEY NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"confidence" double precision NOT NULL,
	"display_name" text,
	"cached_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gestantes_data" (
	"patient_id" uuid PRIMARY KEY NOT NULL,
	"dum" date,
	"dpp" date,
	"risco" text,
	"ig_abertura" text,
	"data_ultima_consulta" date,
	"data_proxima_consulta" date,
	"numero_consultas" integer DEFAULT 0 NOT NULL,
	"has_previa_tag" text,
	"diabetes_previa_tag" text,
	"pressao_arterial" text,
	"acompanhamento_peso_altura" text,
	"numero_visitas_domiciliares" integer DEFAULT 0 NOT NULL,
	"avaliacao_odonto_status" text,
	"vacina_dtpa" text,
	"tr_primeiro_tri" text,
	"tr_segundo_tri" text,
	"tr_terceiro_tri" text,
	"resultado_tr" text,
	"tr_hep_b_hep_c_primeiro_tri" text,
	"tr_sif_hiv_terceiro_tri" text,
	"is_puerpera" boolean DEFAULT false NOT NULL,
	"puerperio_consulta" text,
	"puerperio_visita_domiciliar" text,
	"puerperio_avaliacao_odonto" text,
	"is_exposta" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "has_data" (
	"patient_id" uuid PRIMARY KEY NOT NULL,
	"data_ultima_consulta" date,
	"data_proxima_consulta" date,
	"data_ultima_afericao_pa" date,
	"pressao_arterial" text,
	"registro_notas" text,
	"encaminhamentos" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cns" text NOT NULL,
	"nome_completo" text NOT NULL,
	"data_nascimento" text,
	"idade" integer,
	"telefone" text,
	"rua" text,
	"numero" text,
	"complemento" text,
	"bairro" text,
	"microarea" text,
	"lat" double precision,
	"lng" double precision,
	"geocode_status" "geocode_status" DEFAULT 'unresolved' NOT NULL,
	"geocode_reference" text,
	"vulnerabilidades" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	CONSTRAINT "patients_cns_unique" UNIQUE("cns")
);
--> statement-breakpoint
CREATE TABLE "tuberculose_consultas" (
	"patient_id" uuid NOT NULL,
	"mes" integer NOT NULL,
	"realizada" boolean DEFAULT false NOT NULL,
	"data" date,
	"observacao" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tuberculose_consultas_patient_id_mes_pk" PRIMARY KEY("patient_id","mes"),
	CONSTRAINT "tuberculose_consultas_mes_range" CHECK ("tuberculose_consultas"."mes" BETWEEN 1 AND 9)
);
--> statement-breakpoint
CREATE TABLE "tuberculose_data" (
	"patient_id" uuid PRIMARY KEY NOT NULL,
	"tipo" text,
	"gal_registro" text,
	"baciloscopia_primeira_data" date,
	"baciloscopia_segunda_data" date,
	"baciloscopia_resultado" text,
	"trm_primeira_data" date,
	"trm_segunda_data" date,
	"trm_resultado" text,
	"cultura_m_tuberculosis" text,
	"ppd_mm" integer,
	"histopatologia" text,
	"rx_torax" text,
	"outros_exames" text,
	"forma_clinica" text,
	"tipo_entrada" text,
	"esquema" text,
	"data_inicio" date,
	"forma_tratamento" text,
	"tdo_status" text,
	"encerramento_motivo" text,
	"encerramento_data" date,
	"contatos_coabitantes" integer,
	"contatos_examinados" integer,
	"todos_contatos_examinados" boolean,
	"contatos_lista" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gestantes_data" ADD CONSTRAINT "gestantes_data_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "has_data" ADD CONSTRAINT "has_data_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tuberculose_consultas" ADD CONSTRAINT "tuberculose_consultas_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tuberculose_data" ADD CONSTRAINT "tuberculose_data_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "patients_microarea_idx" ON "patients" USING btree ("microarea");