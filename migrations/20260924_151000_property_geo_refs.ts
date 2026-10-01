import {
	type MigrateDownArgs,
	type MigrateUpArgs,
	sql,
} from "@payloadcms/db-postgres";

export const propertyGeoRefsUpSql = `
ALTER TABLE "properties" ADD COLUMN "region_ref_id" integer;
ALTER TABLE "properties" ADD COLUMN "city_ref_id" integer;
ALTER TABLE "properties" ADD COLUMN "district_ref_id" integer;
ALTER TABLE "properties" ADD CONSTRAINT "properties_region_ref_id_regions_id_fk" FOREIGN KEY ("region_ref_id") REFERENCES "public"."regions"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "properties" ADD CONSTRAINT "properties_city_ref_id_cities_id_fk" FOREIGN KEY ("city_ref_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "properties" ADD CONSTRAINT "properties_district_ref_id_districts_id_fk" FOREIGN KEY ("district_ref_id") REFERENCES "public"."districts"("id") ON DELETE set null ON UPDATE no action;
CREATE INDEX "properties_region_ref_idx" ON "properties" USING btree ("region_ref_id");
CREATE INDEX "properties_city_ref_idx" ON "properties" USING btree ("city_ref_id");
CREATE INDEX "properties_district_ref_idx" ON "properties" USING btree ("district_ref_id");
`;

export const propertyGeoRefsDownSql = `
ALTER TABLE "properties" DROP CONSTRAINT "properties_region_ref_id_regions_id_fk";
ALTER TABLE "properties" DROP CONSTRAINT "properties_city_ref_id_cities_id_fk";
ALTER TABLE "properties" DROP CONSTRAINT "properties_district_ref_id_districts_id_fk";
DROP INDEX "properties_region_ref_idx";
DROP INDEX "properties_city_ref_idx";
DROP INDEX "properties_district_ref_idx";
ALTER TABLE "properties" DROP COLUMN "region_ref_id";
ALTER TABLE "properties" DROP COLUMN "city_ref_id";
ALTER TABLE "properties" DROP COLUMN "district_ref_id";
`;

export async function up({ db }: MigrateUpArgs): Promise<void> {
	await db.execute(sql.raw(propertyGeoRefsUpSql));
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
	await db.execute(sql.raw(propertyGeoRefsDownSql));
}
