import type { MigrateDownArgs, MigrateUpArgs } from "@payloadcms/db-postgres";
import { sql } from "@payloadcms/db-postgres";

export const districtMorphologyUpSql = `
ALTER TABLE "districts" ADD COLUMN "adj_locative" varchar;
ALTER TABLE "districts" ADD COLUMN "adj_genitive" varchar;
ALTER TABLE "districts" ADD COLUMN "locative" varchar;

UPDATE "districts"
SET "locative" = "morphology_prepositional"
WHERE "district_type" = 'microdistrict';

UPDATE "districts" AS district
SET
  "adj_locative" = source."adj_locative",
  "adj_genitive" = source."adj_genitive"
FROM "cities" AS city,
  (VALUES
    ('primorsk', 'yuzhnyy', 'Южном', 'Южного'),
    ('zarechnyy', 'tsentralnyy', 'Центральном', 'Центрального'),
    ('rostov-na-donu', 'leninskiy', 'Ленинском', 'Ленинского'),
    ('rostov-na-donu', 'voroshilovskiy', 'Ворошиловском', 'Ворошиловского')
  ) AS source("city_slug", "district_slug", "adj_locative", "adj_genitive")
WHERE district."city_id" = city."id"
  AND city."slug" = source."city_slug"
  AND district."slug" = source."district_slug"
  AND district."district_type" = 'admin_district';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "districts"
    WHERE "district_type" = 'admin_district'
      AND ("adj_locative" IS NULL OR "adj_genitive" IS NULL)
  ) THEN
    RAISE EXCEPTION 'District morphology migration requires an explicit admin district mapping';
  END IF;
END $$;

ALTER TABLE "districts"
  ADD CONSTRAINT "districts_explicit_morphology_guard" CHECK (
    ("district_type" = 'admin_district'
      AND NULLIF("adj_locative", '') IS NOT NULL
      AND NULLIF("adj_genitive", '') IS NOT NULL)
    OR
    ("district_type" = 'microdistrict'
      AND NULLIF("locative", '') IS NOT NULL
      AND "adj_locative" IS NULL
      AND "adj_genitive" IS NULL)
  );
`;

export const districtMorphologyDownSql = `
ALTER TABLE "districts" DROP CONSTRAINT IF EXISTS "districts_explicit_morphology_guard";
ALTER TABLE "districts" DROP COLUMN IF EXISTS "locative";
ALTER TABLE "districts" DROP COLUMN IF EXISTS "adj_genitive";
ALTER TABLE "districts" DROP COLUMN IF EXISTS "adj_locative";
`;

export async function up({ db }: MigrateUpArgs): Promise<void> {
	await db.execute(sql.raw(districtMorphologyUpSql));
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
	await db.execute(sql.raw(districtMorphologyDownSql));
}
