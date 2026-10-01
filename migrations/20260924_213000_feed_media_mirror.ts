import {
	type MigrateDownArgs,
	type MigrateUpArgs,
	sql,
} from "@payloadcms/db-postgres";

export const feedMediaMirrorUpSql = `
ALTER TABLE "media" ADD COLUMN "ownership" varchar DEFAULT 'manual' NOT NULL;
ALTER TABLE "media" ADD COLUMN "source_url" varchar;
ALTER TABLE "media" ADD COLUMN "source_host" varchar;
ALTER TABLE "media" ADD COLUMN "source_rights" varchar;
ALTER TABLE "media" ADD COLUMN "source_sha256" varchar;
ALTER TABLE "media" ADD COLUMN "source_feed_id" integer;
ALTER TABLE "media" ADD COLUMN "mirrored_at" timestamp(3) with time zone;
ALTER TABLE "media" ADD CONSTRAINT "media_source_feed_id_feed_sources_id_fk" FOREIGN KEY ("source_feed_id") REFERENCES "feed_sources"("id") ON DELETE set null;
CREATE UNIQUE INDEX "media_source_sha256_idx" ON "media" ("source_sha256");
CREATE INDEX "media_source_feed_idx" ON "media" ("source_feed_id");
`;

export const feedMediaMirrorDownSql = `
DROP INDEX "media_source_feed_idx";
DROP INDEX "media_source_sha256_idx";
ALTER TABLE "media" DROP CONSTRAINT "media_source_feed_id_feed_sources_id_fk";
ALTER TABLE "media" DROP COLUMN "mirrored_at";
ALTER TABLE "media" DROP COLUMN "source_feed_id";
ALTER TABLE "media" DROP COLUMN "source_sha256";
ALTER TABLE "media" DROP COLUMN "source_rights";
ALTER TABLE "media" DROP COLUMN "source_host";
ALTER TABLE "media" DROP COLUMN "source_url";
ALTER TABLE "media" DROP COLUMN "ownership";
`;

export async function up({ db }: MigrateUpArgs): Promise<void> {
	await db.execute(sql.raw(feedMediaMirrorUpSql));
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
	await db.execute(sql.raw(feedMediaMirrorDownSql));
}
