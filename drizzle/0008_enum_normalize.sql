-- 0008: Normalize ig_abertura (remove spaces) and replace resultado_teste_rapido values

-- ig_abertura: '< 12 sem' → '<12 sem', '> 24 sem' → '>24 sem'
ALTER TABLE "gestantes_data"
  ALTER COLUMN "ig_abertura" TYPE text;
--> statement-breakpoint
UPDATE "gestantes_data"
SET "ig_abertura" = CASE
  WHEN "ig_abertura" = '< 12 sem' THEN '<12 sem'
  WHEN "ig_abertura" = '> 24 sem' THEN '>24 sem'
  ELSE "ig_abertura"
END
WHERE "ig_abertura" IS NOT NULL;
--> statement-breakpoint
DROP TYPE "public"."ig_abertura";
--> statement-breakpoint
CREATE TYPE "public"."ig_abertura" AS ENUM ('<12 sem', '12-24 sem', '>24 sem');
--> statement-breakpoint
ALTER TABLE "gestantes_data"
  ALTER COLUMN "ig_abertura" TYPE "public"."ig_abertura"
  USING "ig_abertura"::"public"."ig_abertura";
--> statement-breakpoint

-- resultado_teste_rapido: 4-value → 2-value
ALTER TABLE "gestantes_data"
  ALTER COLUMN "resultado_tr" TYPE text;
--> statement-breakpoint
UPDATE "gestantes_data"
SET "resultado_tr" = CASE
  WHEN "resultado_tr" = 'MONITORAR' THEN 'MONITORAR'
  ELSE 'Seguir com Fluxo habitual'
END
WHERE "resultado_tr" IS NOT NULL;
--> statement-breakpoint
DROP TYPE "public"."resultado_teste_rapido";
--> statement-breakpoint
CREATE TYPE "public"."resultado_teste_rapido" AS ENUM ('MONITORAR', 'Seguir com Fluxo habitual');
--> statement-breakpoint
ALTER TABLE "gestantes_data"
  ALTER COLUMN "resultado_tr" TYPE "public"."resultado_teste_rapido"
  USING "resultado_tr"::"public"."resultado_teste_rapido";
