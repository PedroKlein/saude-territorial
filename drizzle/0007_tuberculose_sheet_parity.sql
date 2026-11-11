-- Migration: 0007_tuberculose_sheet_parity
-- Forward migration to align Tuberculose schema and enums with the canonical PET workbook.

-- 1. baciloscopia_resultado: Expand to canonical sheet values and add 2nd sample column
CREATE TYPE "public"."baciloscopia_resultado_new" AS ENUM (
  'Negativo',
  'Positivo+',
  'Positivo++',
  'Positivo+++',
  'Não realizado',
  '<9 bacilos em 100 campos',
  'Amostra Insuficiente.'
);
--> statement-breakpoint
ALTER TABLE "tuberculose_data"
  ALTER COLUMN "baciloscopia_resultado" TYPE "public"."baciloscopia_resultado_new"
  USING (
    CASE lower(trim("baciloscopia_resultado"::text))
      WHEN '' THEN NULL
      WHEN 'negativo' THEN 'Negativo'::baciloscopia_resultado_new
      WHEN 'negativa' THEN 'Negativo'::baciloscopia_resultado_new
      WHEN 'positivo+' THEN 'Positivo+'::baciloscopia_resultado_new
      WHEN 'positivo' THEN 'Positivo+'::baciloscopia_resultado_new
      WHEN 'positiva' THEN 'Positivo+'::baciloscopia_resultado_new
      WHEN 'positivo++' THEN 'Positivo++'::baciloscopia_resultado_new
      WHEN 'positivo+++' THEN 'Positivo+++'::baciloscopia_resultado_new
      WHEN 'não realizado' THEN 'Não realizado'::baciloscopia_resultado_new
      WHEN 'nao realizado' THEN 'Não realizado'::baciloscopia_resultado_new
      WHEN '<9 bacilos em 100 campos' THEN '<9 bacilos em 100 campos'::baciloscopia_resultado_new
      WHEN '< 9 bacilos em 100 campos' THEN '<9 bacilos em 100 campos'::baciloscopia_resultado_new
      WHEN 'amostra insuficiente.' THEN 'Amostra Insuficiente.'::baciloscopia_resultado_new
      WHEN 'amostra insuficiente' THEN 'Amostra Insuficiente.'::baciloscopia_resultado_new
      ELSE NULL
    END
  );
--> statement-breakpoint
DROP TYPE "public"."baciloscopia_resultado";
--> statement-breakpoint
ALTER TYPE "public"."baciloscopia_resultado_new" RENAME TO "baciloscopia_resultado";
--> statement-breakpoint
ALTER TABLE "tuberculose_data"
  ADD COLUMN IF NOT EXISTS "baciloscopia_segunda_resultado" "public"."baciloscopia_resultado";
--> statement-breakpoint

-- 2. trm_resultado: Expand to canonical spreadsheet values and add trm_data
CREATE TYPE "public"."trm_resultado_new" AS ENUM (
  'Detectado/ Rifampicina Sensível',
  'Detectado Resistência à Rifampicina Não Detectado',
  'Detectado Resistência à Rifampicina Detectado',
  'Detectado traços / Rifampicina indeterminada',
  'Não Detectado',
  'Não realizado',
  'Amostra Insuficiente.',
  'Laudo indisponivel'
);
--> statement-breakpoint
ALTER TABLE "tuberculose_data"
  ALTER COLUMN "trm_resultado" TYPE "public"."trm_resultado_new"
  USING (
    CASE lower(trim("trm_resultado"::text))
      WHEN '' THEN NULL
      WHEN 'detectado/ rifampicina sensível' THEN 'Detectado/ Rifampicina Sensível'::trm_resultado_new
      WHEN 'detectado/ rifampicina sensivel' THEN 'Detectado/ Rifampicina Sensível'::trm_resultado_new
      WHEN 'detectado resistência à rifampicina não detectado' THEN 'Detectado Resistência à Rifampicina Não Detectado'::trm_resultado_new
      WHEN 'detectado resistencia a rifampicina nao detectado' THEN 'Detectado Resistência à Rifampicina Não Detectado'::trm_resultado_new
      WHEN 'detectado resistência à rifampicina detectado' THEN 'Detectado Resistência à Rifampicina Detectado'::trm_resultado_new
      WHEN 'detectado resistencia a rifampicina detectado' THEN 'Detectado Resistência à Rifampicina Detectado'::trm_resultado_new
      WHEN 'detectado traços / rifampicina indeterminada' THEN 'Detectado traços / Rifampicina indeterminada'::trm_resultado_new
      WHEN 'detectado tracos / rifampicina indeterminada' THEN 'Detectado traços / Rifampicina indeterminada'::trm_resultado_new
      WHEN 'não detectado' THEN 'Não Detectado'::trm_resultado_new
      WHEN 'nao detectado' THEN 'Não Detectado'::trm_resultado_new
      WHEN 'não realizado' THEN 'Não realizado'::trm_resultado_new
      WHEN 'nao realizado' THEN 'Não realizado'::trm_resultado_new
      WHEN 'amostra insuficiente.' THEN 'Amostra Insuficiente.'::trm_resultado_new
      WHEN 'amostra insuficiente' THEN 'Amostra Insuficiente.'::trm_resultado_new
      WHEN 'laudo indisponivel' THEN 'Laudo indisponivel'::trm_resultado_new
      WHEN 'laudo indisponível' THEN 'Laudo indisponivel'::trm_resultado_new
      WHEN 'detectável' THEN 'Detectado/ Rifampicina Sensível'::trm_resultado_new
      WHEN 'detectavel' THEN 'Detectado/ Rifampicina Sensível'::trm_resultado_new
      WHEN 'não detectável' THEN 'Não Detectado'::trm_resultado_new
      WHEN 'nao detectavel' THEN 'Não Detectado'::trm_resultado_new
      ELSE NULL
    END
  );
--> statement-breakpoint
DROP TYPE "public"."trm_resultado";
--> statement-breakpoint
ALTER TYPE "public"."trm_resultado_new" RENAME TO "trm_resultado";
--> statement-breakpoint
ALTER TABLE "tuberculose_data" ADD COLUMN IF NOT EXISTS "trm_data" date;
--> statement-breakpoint

-- 3. cultura_resultado: Add 'Não realizada' and cultura_outros column
CREATE TYPE "public"."cultura_resultado_new" AS ENUM ('Positiva', 'Negativa', 'Pendente', 'Não realizada');
--> statement-breakpoint
ALTER TABLE "tuberculose_data"
  ALTER COLUMN "cultura_m_tuberculosis" TYPE "public"."cultura_resultado_new"
  USING (
    CASE lower(trim("cultura_m_tuberculosis"::text))
      WHEN '' THEN NULL
      WHEN 'positiva' THEN 'Positiva'::cultura_resultado_new
      WHEN 'negativa' THEN 'Negativa'::cultura_resultado_new
      WHEN 'pendente' THEN 'Pendente'::cultura_resultado_new
      WHEN 'não realizada' THEN 'Não realizada'::cultura_resultado_new
      WHEN 'nao realizada' THEN 'Não realizada'::cultura_resultado_new
      ELSE NULL
    END
  );
--> statement-breakpoint
DROP TYPE "public"."cultura_resultado";
--> statement-breakpoint
ALTER TYPE "public"."cultura_resultado_new" RENAME TO "cultura_resultado";
--> statement-breakpoint
ALTER TABLE "tuberculose_data" ADD COLUMN IF NOT EXISTS "cultura_outros" text;
--> statement-breakpoint

-- 4. tdo_status: Align with canonical sheet options ('Não está em TDO', 'TDO em dia', 'TDO irregular/faltoso')
CREATE TYPE "public"."tdo_status_new" AS ENUM (
  'Não está em TDO', 'TDO em dia', 'TDO irregular/faltoso'
);
--> statement-breakpoint
ALTER TABLE "tuberculose_data"
  ALTER COLUMN "tdo_status" TYPE "public"."tdo_status_new"
  USING (
    CASE lower(trim("tdo_status"::text))
      WHEN '' THEN NULL
      WHEN 'não está em tdo' THEN 'Não está em TDO'::tdo_status_new
      WHEN 'nao esta em tdo' THEN 'Não está em TDO'::tdo_status_new
      WHEN 'tdo em dia' THEN 'TDO em dia'::tdo_status_new
      WHEN 'em dia' THEN 'TDO em dia'::tdo_status_new
      WHEN 'tdo irregular/faltoso' THEN 'TDO irregular/faltoso'::tdo_status_new
      WHEN 'irregular/faltoso' THEN 'TDO irregular/faltoso'::tdo_status_new
      WHEN 'irregular' THEN 'TDO irregular/faltoso'::tdo_status_new
      WHEN 'faltoso' THEN 'TDO irregular/faltoso'::tdo_status_new
      WHEN 'tdo regular' THEN 'TDO em dia'::tdo_status_new
      WHEN 'regular' THEN 'TDO em dia'::tdo_status_new
      ELSE NULL
    END
  );
--> statement-breakpoint
DROP TYPE "public"."tdo_status";
--> statement-breakpoint
ALTER TYPE "public"."tdo_status_new" RENAME TO "tdo_status";
--> statement-breakpoint

-- 5. encerramento_motivo_tb: Align with canonical spreadsheet values
CREATE TYPE "public"."encerramento_motivo_tb_new" AS ENUM (
  'Cura',
  'Completou tratamento',
  'Êxito do tratamento',
  'Abandono',
  'Transferência',
  'Óbito',
  'Falência',
  'Mudança diagnóstico'
);
--> statement-breakpoint
ALTER TABLE "tuberculose_data"
  ALTER COLUMN "encerramento_motivo" TYPE "public"."encerramento_motivo_tb_new"
  USING (
    CASE lower(trim("encerramento_motivo"::text))
      WHEN '' THEN NULL
      WHEN 'cura' THEN 'Cura'::encerramento_motivo_tb_new
      WHEN 'completou tratamento' THEN 'Completou tratamento'::encerramento_motivo_tb_new
      WHEN 'êxito do tratamento' THEN 'Êxito do tratamento'::encerramento_motivo_tb_new
      WHEN 'exito do tratamento' THEN 'Êxito do tratamento'::encerramento_motivo_tb_new
      WHEN 'abandono' THEN 'Abandono'::encerramento_motivo_tb_new
      WHEN 'transferência' THEN 'Transferência'::encerramento_motivo_tb_new
      WHEN 'transferencia' THEN 'Transferência'::encerramento_motivo_tb_new
      WHEN 'óbito' THEN 'Óbito'::encerramento_motivo_tb_new
      WHEN 'obito' THEN 'Óbito'::encerramento_motivo_tb_new
      WHEN 'falência' THEN 'Falência'::encerramento_motivo_tb_new
      WHEN 'falencia' THEN 'Falência'::encerramento_motivo_tb_new
      WHEN 'mudança diagnóstico' THEN 'Mudança diagnóstico'::encerramento_motivo_tb_new
      WHEN 'mudanca diagnostico' THEN 'Mudança diagnóstico'::encerramento_motivo_tb_new
      WHEN 'óbito por tb' THEN 'Óbito'::encerramento_motivo_tb_new
      WHEN 'obito por tb' THEN 'Óbito'::encerramento_motivo_tb_new
      WHEN 'óbito por outra causa' THEN 'Óbito'::encerramento_motivo_tb_new
      WHEN 'obito por outra causa' THEN 'Óbito'::encerramento_motivo_tb_new
      WHEN 'mudança de diagnóstico' THEN 'Mudança diagnóstico'::encerramento_motivo_tb_new
      WHEN 'mudanca de diagnostico' THEN 'Mudança diagnóstico'::encerramento_motivo_tb_new
      ELSE NULL
    END
  );
--> statement-breakpoint
DROP TYPE "public"."encerramento_motivo_tb";
--> statement-breakpoint
ALTER TYPE "public"."encerramento_motivo_tb_new" RENAME TO "encerramento_motivo_tb";
