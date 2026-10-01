import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
	await db.execute(sql`
		UPDATE "feed_sources"
		SET "next_due_at" = NOW()
		WHERE "enabled" = true
			AND "next_due_at" IS NULL;
	`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
	await db.execute(sql`SELECT 1`);
}
