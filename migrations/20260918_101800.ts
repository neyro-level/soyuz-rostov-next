import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
	await db.execute(sql`
		CREATE INDEX IF NOT EXISTS "properties_public_catalog_idx"
			ON "properties" USING btree (
				"category",
				"deal_type",
				"locality",
				"district",
				"rooms",
				"price_minor",
				"total_area"
			)
			WHERE "status" = 'active'
				AND "published_at" IS NOT NULL
				AND "content_purged_at" IS NULL;

		CREATE INDEX IF NOT EXISTS "properties_public_sitemap_idx"
			ON "properties" USING btree ("updated_at" DESC, "id" DESC)
			WHERE "status" = 'active'
				AND "published_at" IS NOT NULL
				AND "content_purged_at" IS NULL;
	`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
	await db.execute(sql`
		DROP INDEX IF EXISTS "properties_public_sitemap_idx";
		DROP INDEX IF EXISTS "properties_public_catalog_idx";
	`);
}
