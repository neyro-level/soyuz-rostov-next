import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export const leadContextUpSql = `
ALTER TYPE "public"."enum_leads_form_kind" ADD VALUE IF NOT EXISTS 'legal';
ALTER TYPE "public"."enum_leads_form_kind" ADD VALUE IF NOT EXISTS 'development_price';
ALTER TYPE "public"."enum_leads_form_kind" ADD VALUE IF NOT EXISTS 'quiz';
CREATE TYPE "public"."enum_leads_context_surface" AS ENUM('apartments', 'new-buildings', 'houses', 'plots', 'commercial', 'garages');
ALTER TABLE "leads" ADD COLUMN "context_geo" varchar;
ALTER TABLE "leads" ADD COLUMN "context_surface" "enum_leads_context_surface";
ALTER TABLE "leads" ADD COLUMN "context_district" varchar;
ALTER TABLE "leads" ADD COLUMN "context_property_url_id" varchar;
ALTER TABLE "leads" ADD COLUMN "context_development" varchar;
ALTER TABLE "leads" ADD COLUMN "context_developer" varchar;
CREATE INDEX "leads_context_geo_idx" ON "leads" ("context_geo");
CREATE INDEX "leads_context_district_idx" ON "leads" ("context_district");
CREATE INDEX "leads_context_property_url_id_idx" ON "leads" ("context_property_url_id");
CREATE INDEX "leads_context_development_idx" ON "leads" ("context_development");
CREATE INDEX "leads_context_developer_idx" ON "leads" ("context_developer");
`;

export const leadContextDownSql = `
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "leads"
    WHERE "form_kind"::text IN ('legal', 'development_price', 'quiz')
       OR "context_geo" IS NOT NULL
       OR "context_surface" IS NOT NULL
       OR "context_district" IS NOT NULL
       OR "context_property_url_id" IS NOT NULL
       OR "context_development" IS NOT NULL
       OR "context_developer" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'extended lead context exists; disable intake and recover/forward-fix instead of migrating down';
  END IF;
END $$;
DROP INDEX "leads_context_developer_idx";
DROP INDEX "leads_context_development_idx";
DROP INDEX "leads_context_property_url_id_idx";
DROP INDEX "leads_context_district_idx";
DROP INDEX "leads_context_geo_idx";
ALTER TABLE "leads" DROP COLUMN "context_developer";
ALTER TABLE "leads" DROP COLUMN "context_development";
ALTER TABLE "leads" DROP COLUMN "context_property_url_id";
ALTER TABLE "leads" DROP COLUMN "context_district";
ALTER TABLE "leads" DROP COLUMN "context_surface";
ALTER TABLE "leads" DROP COLUMN "context_geo";
DROP TYPE "public"."enum_leads_context_surface";
ALTER TYPE "public"."enum_leads_form_kind" RENAME TO "enum_leads_form_kind_extended";
CREATE TYPE "public"."enum_leads_form_kind" AS ENUM('property_request', 'callback', 'consultation', 'generic');
ALTER TABLE "leads" ALTER COLUMN "form_kind" TYPE "public"."enum_leads_form_kind" USING "form_kind"::text::"public"."enum_leads_form_kind";
DROP TYPE "public"."enum_leads_form_kind_extended";
`;

export async function up({ db }: MigrateUpArgs): Promise<void> {
	await db.execute(sql.raw(leadContextUpSql));
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
	await db.execute(sql.raw(leadContextDownSql));
}
