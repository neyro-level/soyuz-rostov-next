import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
	await db.execute(sql`
		CREATE UNIQUE INDEX IF NOT EXISTS "properties_feed_identity_unique_idx"
			ON "properties" USING btree ("feed_source_id", "external_id")
			WHERE "origin" = 'feed'
				AND "feed_source_id" IS NOT NULL
				AND "external_id" IS NOT NULL;

		CREATE INDEX IF NOT EXISTS "properties_feed_active_seen_idx"
			ON "properties" USING btree ("feed_source_id", "status", "last_seen_at")
			WHERE "origin" = 'feed';

		CREATE UNIQUE INDEX IF NOT EXISTS "lead_deliveries_lead_channel_unique_idx"
			ON "lead_deliveries" USING btree ("lead_id", "channel_id")
			WHERE "lead_id" IS NOT NULL;

		CREATE INDEX IF NOT EXISTS "lead_deliveries_recovery_due_idx"
			ON "lead_deliveries" USING btree ("status", "next_attempt_at")
			WHERE "status" IN ('pending', 'failed');

		CREATE INDEX IF NOT EXISTS "lead_deliveries_stale_sending_idx"
			ON "lead_deliveries" USING btree ("status", "heartbeat_at")
			WHERE "status" = 'sending';

		CREATE INDEX IF NOT EXISTS "feed_sources_enabled_due_idx"
			ON "feed_sources" USING btree ("next_due_at", "id")
			WHERE "enabled" = true;

		CREATE OR REPLACE FUNCTION "public"."prevent_feed_source_delete_with_links"()
		RETURNS trigger AS $$
		BEGIN
			IF EXISTS (SELECT 1 FROM "properties" WHERE "feed_source_id" = OLD."id") THEN
				RAISE EXCEPTION 'feed source % cannot be deleted while linked properties exist', OLD."id";
			END IF;

			IF EXISTS (SELECT 1 FROM "import_runs" WHERE "feed_source_id" = OLD."id") THEN
				RAISE EXCEPTION 'feed source % cannot be deleted while linked import runs exist', OLD."id";
			END IF;

			IF EXISTS (SELECT 1 FROM "import_issues" WHERE "feed_source_id" = OLD."id") THEN
				RAISE EXCEPTION 'feed source % cannot be deleted while linked import issues exist', OLD."id";
			END IF;

			RETURN OLD;
		END;
		$$ LANGUAGE plpgsql;

		DROP TRIGGER IF EXISTS "feed_sources_prevent_delete_with_links" ON "feed_sources";

		CREATE TRIGGER "feed_sources_prevent_delete_with_links"
			BEFORE DELETE ON "feed_sources"
			FOR EACH ROW
			EXECUTE FUNCTION "public"."prevent_feed_source_delete_with_links"();
	`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
	await db.execute(sql`
		DROP TRIGGER IF EXISTS "feed_sources_prevent_delete_with_links" ON "feed_sources";
		DROP FUNCTION IF EXISTS "public"."prevent_feed_source_delete_with_links"();
		DROP INDEX IF EXISTS "feed_sources_enabled_due_idx";
		DROP INDEX IF EXISTS "lead_deliveries_stale_sending_idx";
		DROP INDEX IF EXISTS "lead_deliveries_recovery_due_idx";
		DROP INDEX IF EXISTS "lead_deliveries_lead_channel_unique_idx";
		DROP INDEX IF EXISTS "properties_feed_active_seen_idx";
		DROP INDEX IF EXISTS "properties_feed_identity_unique_idx";
	`);
}
