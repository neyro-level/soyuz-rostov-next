import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
	await db.execute(sql`
		ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "context_region" varchar;
		ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "context_city" varchar;
		ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "context_data_tier" varchar;
		ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "context_preferences" jsonb;
		CREATE INDEX IF NOT EXISTS "leads_context_region_idx" ON "leads" USING btree ("context_region");
		CREATE INDEX IF NOT EXISTS "leads_context_city_idx" ON "leads" USING btree ("context_city");
	`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
	await db.execute(sql`
		DROP INDEX IF EXISTS "leads_context_city_idx";
		DROP INDEX IF EXISTS "leads_context_region_idx";
		ALTER TABLE "leads" DROP COLUMN IF EXISTS "context_preferences";
		ALTER TABLE "leads" DROP COLUMN IF EXISTS "context_data_tier";
		ALTER TABLE "leads" DROP COLUMN IF EXISTS "context_city";
		ALTER TABLE "leads" DROP COLUMN IF EXISTS "context_region";
	`);
}
