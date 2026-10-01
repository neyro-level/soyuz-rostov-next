import type { MigrateDownArgs, MigrateUpArgs } from "@payloadcms/db-postgres";
import { sql } from "@payloadcms/db-postgres";

export const geoTaxonomyV3UpSql = `
ALTER TYPE "public"."enum_cities_preposition" RENAME TO "enum_cities_preposition_v2";
CREATE TYPE "public"."enum_cities_preposition" AS ENUM('v', 'vo', 'na');
ALTER TABLE "cities" ALTER COLUMN "preposition" TYPE "public"."enum_cities_preposition"
  USING "preposition"::text::"public"."enum_cities_preposition";
DROP TYPE "public"."enum_cities_preposition_v2";

ALTER TYPE "public"."enum_districts_district_type" RENAME TO "enum_districts_district_type_v2";
CREATE TYPE "public"."enum_districts_district_type" AS ENUM('administrative', 'admin_district', 'microdistrict');
ALTER TABLE "districts" ALTER COLUMN "district_type" TYPE "public"."enum_districts_district_type"
  USING "district_type"::text::"public"."enum_districts_district_type";
DROP TYPE "public"."enum_districts_district_type_v2";
UPDATE "districts" SET "district_type" = 'admin_district' WHERE "district_type" = 'administrative';

ALTER TYPE "public"."enum_districts_preposition" RENAME TO "enum_districts_preposition_v2";
CREATE TYPE "public"."enum_districts_preposition" AS ENUM('v', 'vo', 'na');
ALTER TABLE "districts" ALTER COLUMN "preposition" TYPE "public"."enum_districts_preposition"
  USING "preposition"::text::"public"."enum_districts_preposition";
DROP TYPE "public"."enum_districts_preposition_v2";
`;

export const geoTaxonomyV3DownSql = `
UPDATE "districts" SET "district_type" = 'administrative' WHERE "district_type" = 'admin_district';
UPDATE "cities" SET "preposition" = 'v' WHERE "preposition" = 'vo';
UPDATE "districts" SET "preposition" = 'v' WHERE "preposition" = 'vo';

ALTER TYPE "public"."enum_cities_preposition" RENAME TO "enum_cities_preposition_v3";
CREATE TYPE "public"."enum_cities_preposition" AS ENUM('v', 'na');
ALTER TABLE "cities" ALTER COLUMN "preposition" TYPE "public"."enum_cities_preposition"
  USING "preposition"::text::"public"."enum_cities_preposition";
DROP TYPE "public"."enum_cities_preposition_v3";

ALTER TYPE "public"."enum_districts_district_type" RENAME TO "enum_districts_district_type_v3";
CREATE TYPE "public"."enum_districts_district_type" AS ENUM('administrative', 'microdistrict');
ALTER TABLE "districts" ALTER COLUMN "district_type" TYPE "public"."enum_districts_district_type"
  USING "district_type"::text::"public"."enum_districts_district_type";
DROP TYPE "public"."enum_districts_district_type_v3";

ALTER TYPE "public"."enum_districts_preposition" RENAME TO "enum_districts_preposition_v3";
CREATE TYPE "public"."enum_districts_preposition" AS ENUM('v', 'na');
ALTER TABLE "districts" ALTER COLUMN "preposition" TYPE "public"."enum_districts_preposition"
  USING "preposition"::text::"public"."enum_districts_preposition";
DROP TYPE "public"."enum_districts_preposition_v3";
`;

export async function up({ db }: MigrateUpArgs): Promise<void> {
	await db.execute(sql.raw(geoTaxonomyV3UpSql));
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
	await db.execute(sql.raw(geoTaxonomyV3DownSql));
}
