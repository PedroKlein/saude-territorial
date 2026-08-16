-- 0005_enum_discipline
--
-- Phase A (plans/sheet-parity.md § Phase A) — every existing text column with
-- a bounded value set becomes a Postgres enum. Canonical values are PT-BR
-- verbatim, except `risco` which stays lowercase to keep the LOCKED alert
-- rule (`risco = 'alto'`) a literal match.
--
-- Migration strategy per column:
--   1. CREATE TYPE  <enum_name> AS ENUM (...);
--   2. ALTER TABLE  ... ALTER COLUMN ... TYPE <enum_name>
--      USING (CASE ... END)  -- normalises legacy values, empty → NULL
--
-- The USING clause is case-insensitive on the input and drops any value that
-- doesn't map — sitting behind synthetic-only data (AGENTS.md § Data
-- Handling), we lose nothing real. Adding a real production dataset later
-- MUST re-audit the mappings.

-- ---------------------------------------------------------------------------
-- Gestantes
-- ---------------------------------------------------------------------------

CREATE TYPE "public"."risco_gestante" AS ENUM ('habitual', 'alto');
ALTER TABLE "gestantes_data"
  ALTER COLUMN "risco" TYPE "public"."risco_gestante"
  USING (
    CASE lower(trim("risco"))
      WHEN '' THEN NULL
      WHEN 'habitual' THEN 'habitual'::risco_gestante
      WHEN 'alto' THEN 'alto'::risco_gestante
      ELSE NULL
    END
  );

CREATE TYPE "public"."ig_abertura" AS ENUM ('< 12 sem', '12-24 sem', '> 24 sem');
ALTER TABLE "gestantes_data"
  ALTER COLUMN "ig_abertura" TYPE "public"."ig_abertura"
  USING (
    CASE lower(trim("ig_abertura"))
      WHEN '' THEN NULL
      WHEN '< 12 sem' THEN '< 12 sem'::ig_abertura
      WHEN '<12 sem' THEN '< 12 sem'::ig_abertura
      WHEN '12-24 sem' THEN '12-24 sem'::ig_abertura
      WHEN '> 24 sem' THEN '> 24 sem'::ig_abertura
      WHEN '>24 sem' THEN '> 24 sem'::ig_abertura
      ELSE NULL
    END
  );

CREATE TYPE "public"."tr_status" AS ENUM ('Feito', 'Não Feito', 'Não realizada');

-- trPrimeiroTri, trSegundoTri, trTerceiroTri all share tr_status.
DO $$
DECLARE col text;
BEGIN
  FOREACH col IN ARRAY ARRAY['tr_primeiro_tri', 'tr_segundo_tri', 'tr_terceiro_tri']
  LOOP
    EXECUTE format($f$
      ALTER TABLE gestantes_data
        ALTER COLUMN %I TYPE tr_status
        USING (
          CASE lower(trim(%I))
            WHEN '' THEN NULL
            WHEN 'feito' THEN 'Feito'::tr_status
            WHEN 'não feito' THEN 'Não Feito'::tr_status
            WHEN 'nao feito' THEN 'Não Feito'::tr_status
            WHEN 'não realizada' THEN 'Não realizada'::tr_status
            WHEN 'nao realizada' THEN 'Não realizada'::tr_status
            ELSE NULL
          END
        )
    $f$, col, col);
  END LOOP;
END $$;

CREATE TYPE "public"."status_realizacao" AS ENUM (
  'Realizada', 'Não realizada', 'A realizar', 'Não se aplica'
);

-- avaliacao_odonto_status, vacina_dtpa, tr_hep_b_hep_c_primeiro_tri,
-- tr_sif_hiv_terceiro_tri, puerperio_consulta, puerperio_visita_domiciliar,
-- puerperio_avaliacao_odonto — all share status_realizacao.
DO $$
DECLARE col text;
BEGIN
  FOREACH col IN ARRAY ARRAY[
    'avaliacao_odonto_status',
    'vacina_dtpa',
    'tr_hep_b_hep_c_primeiro_tri',
    'tr_sif_hiv_terceiro_tri',
    'puerperio_consulta',
    'puerperio_visita_domiciliar',
    'puerperio_avaliacao_odonto'
  ]
  LOOP
    EXECUTE format($f$
      ALTER TABLE gestantes_data
        ALTER COLUMN %I TYPE status_realizacao
        USING (
          CASE lower(trim(%I))
            WHEN '' THEN NULL
            WHEN 'realizada' THEN 'Realizada'::status_realizacao
            WHEN 'agendada' THEN 'A realizar'::status_realizacao
            WHEN 'a realizar' THEN 'A realizar'::status_realizacao
            WHEN 'não realizada' THEN 'Não realizada'::status_realizacao
            WHEN 'nao realizada' THEN 'Não realizada'::status_realizacao
            WHEN 'não se aplica' THEN 'Não se aplica'::status_realizacao
            WHEN 'nao se aplica' THEN 'Não se aplica'::status_realizacao
            WHEN 'n/a' THEN 'Não se aplica'::status_realizacao
            ELSE NULL
          END
        )
    $f$, col, col);
  END LOOP;
END $$;

CREATE TYPE "public"."acompanhamento_status" AS ENUM ('Em dia', 'Atrasada', 'Não realizada');
ALTER TABLE "gestantes_data"
  ALTER COLUMN "acompanhamento_peso_altura" TYPE "public"."acompanhamento_status"
  USING (
    CASE lower(trim("acompanhamento_peso_altura"))
      WHEN '' THEN NULL
      WHEN 'em dia' THEN 'Em dia'::acompanhamento_status
      WHEN 'atrasada' THEN 'Atrasada'::acompanhamento_status
      WHEN 'não realizada' THEN 'Não realizada'::acompanhamento_status
      WHEN 'nao realizada' THEN 'Não realizada'::acompanhamento_status
      ELSE NULL
    END
  );

CREATE TYPE "public"."resultado_teste_rapido" AS ENUM (
  'MONITORAR', 'EXPOSTA', 'REAGENTE', 'Não Reagente'
);
ALTER TABLE "gestantes_data"
  ALTER COLUMN "resultado_tr" TYPE "public"."resultado_teste_rapido"
  USING (
    CASE lower(trim("resultado_tr"))
      WHEN '' THEN NULL
      WHEN 'monitorar' THEN 'MONITORAR'::resultado_teste_rapido
      WHEN 'exposta' THEN 'EXPOSTA'::resultado_teste_rapido
      WHEN 'reagente' THEN 'REAGENTE'::resultado_teste_rapido
      WHEN 'não reagente' THEN 'Não Reagente'::resultado_teste_rapido
      WHEN 'nao reagente' THEN 'Não Reagente'::resultado_teste_rapido
      ELSE NULL
    END
  );

-- ---------------------------------------------------------------------------
-- Tuberculose
-- ---------------------------------------------------------------------------

CREATE TYPE "public"."baciloscopia_resultado" AS ENUM ('Positiva', 'Negativa');
ALTER TABLE "tuberculose_data"
  ALTER COLUMN "baciloscopia_resultado" TYPE "public"."baciloscopia_resultado"
  USING (
    CASE lower(trim("baciloscopia_resultado"))
      WHEN '' THEN NULL
      WHEN 'positiva' THEN 'Positiva'::baciloscopia_resultado
      WHEN 'negativa' THEN 'Negativa'::baciloscopia_resultado
      ELSE NULL
    END
  );

CREATE TYPE "public"."trm_resultado" AS ENUM ('Detectável', 'Não detectável');
ALTER TABLE "tuberculose_data"
  ALTER COLUMN "trm_resultado" TYPE "public"."trm_resultado"
  USING (
    CASE lower(trim("trm_resultado"))
      WHEN '' THEN NULL
      WHEN 'detectável' THEN 'Detectável'::trm_resultado
      WHEN 'detectavel' THEN 'Detectável'::trm_resultado
      WHEN 'não detectável' THEN 'Não detectável'::trm_resultado
      WHEN 'nao detectavel' THEN 'Não detectável'::trm_resultado
      WHEN 'não detectavel' THEN 'Não detectável'::trm_resultado
      ELSE NULL
    END
  );

CREATE TYPE "public"."cultura_resultado" AS ENUM ('Positiva', 'Negativa', 'Pendente');
ALTER TABLE "tuberculose_data"
  ALTER COLUMN "cultura_m_tuberculosis" TYPE "public"."cultura_resultado"
  USING (
    CASE lower(trim("cultura_m_tuberculosis"))
      WHEN '' THEN NULL
      WHEN 'positiva' THEN 'Positiva'::cultura_resultado
      WHEN 'negativa' THEN 'Negativa'::cultura_resultado
      WHEN 'pendente' THEN 'Pendente'::cultura_resultado
      ELSE NULL
    END
  );

CREATE TYPE "public"."tdo_status" AS ENUM (
  'TDO regular', 'TDO irregular/faltoso', 'Não aplicável'
);
ALTER TABLE "tuberculose_data"
  ALTER COLUMN "tdo_status" TYPE "public"."tdo_status"
  USING (
    CASE lower(trim("tdo_status"))
      WHEN '' THEN NULL
      WHEN 'tdo regular' THEN 'TDO regular'::tdo_status
      WHEN 'regular' THEN 'TDO regular'::tdo_status
      WHEN 'tdo irregular/faltoso' THEN 'TDO irregular/faltoso'::tdo_status
      WHEN 'irregular/faltoso' THEN 'TDO irregular/faltoso'::tdo_status
      WHEN 'irregular' THEN 'TDO irregular/faltoso'::tdo_status
      WHEN 'faltoso' THEN 'TDO irregular/faltoso'::tdo_status
      WHEN 'não aplicável' THEN 'Não aplicável'::tdo_status
      WHEN 'nao aplicavel' THEN 'Não aplicável'::tdo_status
      WHEN 'n/a' THEN 'Não aplicável'::tdo_status
      ELSE NULL
    END
  );

CREATE TYPE "public"."tipo_entrada_tb" AS ENUM (
  'Caso novo', 'Recidiva', 'Reingresso após abandono', 'Transferência', 'Não sabe'
);
ALTER TABLE "tuberculose_data"
  ALTER COLUMN "tipo_entrada" TYPE "public"."tipo_entrada_tb"
  USING (
    CASE lower(trim("tipo_entrada"))
      WHEN '' THEN NULL
      WHEN 'caso novo' THEN 'Caso novo'::tipo_entrada_tb
      WHEN 'recidiva' THEN 'Recidiva'::tipo_entrada_tb
      WHEN 'reingresso' THEN 'Reingresso após abandono'::tipo_entrada_tb
      WHEN 'reingresso após abandono' THEN 'Reingresso após abandono'::tipo_entrada_tb
      WHEN 'reingresso apos abandono' THEN 'Reingresso após abandono'::tipo_entrada_tb
      WHEN 'transferência' THEN 'Transferência'::tipo_entrada_tb
      WHEN 'transferencia' THEN 'Transferência'::tipo_entrada_tb
      WHEN 'não sabe' THEN 'Não sabe'::tipo_entrada_tb
      WHEN 'nao sabe' THEN 'Não sabe'::tipo_entrada_tb
      ELSE NULL
    END
  );

CREATE TYPE "public"."encerramento_motivo_tb" AS ENUM (
  'Cura',
  'Abandono',
  'Óbito por TB',
  'Óbito por outra causa',
  'Transferência',
  'Falência',
  'Mudança de diagnóstico'
);
ALTER TABLE "tuberculose_data"
  ALTER COLUMN "encerramento_motivo" TYPE "public"."encerramento_motivo_tb"
  USING (
    CASE lower(trim("encerramento_motivo"))
      WHEN '' THEN NULL
      WHEN 'cura' THEN 'Cura'::encerramento_motivo_tb
      WHEN 'abandono' THEN 'Abandono'::encerramento_motivo_tb
      WHEN 'óbito por tb' THEN 'Óbito por TB'::encerramento_motivo_tb
      WHEN 'obito por tb' THEN 'Óbito por TB'::encerramento_motivo_tb
      WHEN 'óbito' THEN 'Óbito por TB'::encerramento_motivo_tb
      WHEN 'obito' THEN 'Óbito por TB'::encerramento_motivo_tb
      WHEN 'óbito por outra causa' THEN 'Óbito por outra causa'::encerramento_motivo_tb
      WHEN 'obito por outra causa' THEN 'Óbito por outra causa'::encerramento_motivo_tb
      WHEN 'transferência' THEN 'Transferência'::encerramento_motivo_tb
      WHEN 'transferencia' THEN 'Transferência'::encerramento_motivo_tb
      WHEN 'falência' THEN 'Falência'::encerramento_motivo_tb
      WHEN 'falencia' THEN 'Falência'::encerramento_motivo_tb
      WHEN 'mudança de diagnóstico' THEN 'Mudança de diagnóstico'::encerramento_motivo_tb
      WHEN 'mudanca de diagnostico' THEN 'Mudança de diagnóstico'::encerramento_motivo_tb
      ELSE NULL
    END
  );

-- ---------------------------------------------------------------------------
-- PPD bounds — synthetic check (matches Zod PpdMmSchema).
-- Not a hard CHECK: synthetic seed rows may exceed briefly during import
-- reconciliation. Enforced by the API boundary; SQL constraint deferred to
-- Phase E when the importer lands.
-- ---------------------------------------------------------------------------
