import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export const propertyIdentityUpSql = `
ALTER TYPE "public"."enum_properties_category" ADD VALUE IF NOT EXISTS 'room';
ALTER TYPE "public"."enum_properties_category" ADD VALUE IF NOT EXISTS 'garage';
CREATE SEQUENCE IF NOT EXISTS "properties_public_url_id_seq" AS bigint START WITH 1;
ALTER TABLE "properties" ADD COLUMN "public_url_id" bigint;
ALTER TABLE "properties" ALTER COLUMN "public_url_id" SET DEFAULT nextval('properties_public_url_id_seq');
UPDATE "properties" SET "public_url_id" = nextval('properties_public_url_id_seq') WHERE "public_url_id" IS NULL;
SELECT setval('properties_public_url_id_seq', GREATEST(COALESCE((SELECT MAX("public_url_id") FROM "properties"), 0) + 1, 1), false);
ALTER TABLE "properties" ALTER COLUMN "public_url_id" SET NOT NULL;
CREATE UNIQUE INDEX "properties_public_url_id_idx" ON "properties" USING btree ("public_url_id");

CREATE OR REPLACE FUNCTION prevent_property_public_url_id_change() RETURNS trigger AS $$
BEGIN
  IF NEW.public_url_id IS DISTINCT FROM OLD.public_url_id THEN
    RAISE EXCEPTION 'properties.public_url_id is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER properties_public_url_id_immutable
BEFORE UPDATE OF public_url_id ON properties
FOR EACH ROW EXECUTE FUNCTION prevent_property_public_url_id_change();

ALTER TABLE "properties" ADD COLUMN "house_type" varchar;
ALTER TABLE "properties" ADD COLUMN "plot_area_sotka" numeric;
ALTER TABLE "properties" ADD COLUMN "land_category" varchar;
ALTER TABLE "properties" ADD COLUMN "permitted_use" varchar;
ALTER TABLE "properties" ADD COLUMN "communications_gas" boolean DEFAULT false;
ALTER TABLE "properties" ADD COLUMN "communications_electricity" boolean DEFAULT false;
ALTER TABLE "properties" ADD COLUMN "communications_water" boolean DEFAULT false;
ALTER TABLE "properties" ADD COLUMN "communications_sewer" boolean DEFAULT false;
ALTER TABLE "properties" ADD COLUMN "commercial_type" varchar;
ALTER TABLE "properties" ADD COLUMN "document_check_summary" varchar;
`;

export async function up({ db }: MigrateUpArgs): Promise<void> {
	await db.execute(sql.raw(propertyIdentityUpSql));
}

export async function down(_args: MigrateDownArgs): Promise<void> {
	throw new Error(
		"P8-08 identity migration is intentionally irreversible: keep assigned publicUrlId values, disable URL wiring, and forward-fix the sequence.",
	);
}
