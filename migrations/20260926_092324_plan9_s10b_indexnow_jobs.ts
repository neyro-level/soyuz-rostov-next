import {
	type MigrateDownArgs,
	type MigrateUpArgs,
	sql,
} from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
	await db.execute(sql`
		ALTER TYPE "public"."enum_payload_jobs_log_task_slug"
			ADD VALUE IF NOT EXISTS 'submitIndexNow';
		ALTER TYPE "public"."enum_payload_jobs_task_slug"
			ADD VALUE IF NOT EXISTS 'submitIndexNow';
	`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
	await db.execute(sql`
		DO $$
		BEGIN
			IF EXISTS (
				SELECT 1 FROM "payload_jobs"
				WHERE "task_slug"::text = 'submitIndexNow'
			) OR EXISTS (
				SELECT 1 FROM "payload_jobs_log"
				WHERE "task_slug"::text = 'submitIndexNow'
			) THEN
				RAISE EXCEPTION 'Cannot remove submitIndexNow enum while IndexNow jobs or logs exist';
			END IF;
		END $$;

		ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" TYPE text;
		DROP TYPE "public"."enum_payload_jobs_log_task_slug";
		CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM(
			'inline', 'dispatchDueFeeds', 'importFeed', 'jobsJanitor',
			'leadRetentionCleanup', 'catalogLifecycle',
			'recoverLeadDeliveries', 'deliverLead'
		);
		ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug"
			TYPE "public"."enum_payload_jobs_log_task_slug"
			USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";

		ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" TYPE text;
		DROP TYPE "public"."enum_payload_jobs_task_slug";
		CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM(
			'inline', 'dispatchDueFeeds', 'importFeed', 'jobsJanitor',
			'leadRetentionCleanup', 'catalogLifecycle',
			'recoverLeadDeliveries', 'deliverLead'
		);
		ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug"
			TYPE "public"."enum_payload_jobs_task_slug"
			USING "task_slug"::"public"."enum_payload_jobs_task_slug";
	`);
}
