import {
	type MigrateDownArgs,
	type MigrateUpArgs,
	sql,
} from "@payloadcms/db-postgres";

const upSql = `
CREATE TYPE "public"."enum_developments_media_items_kind" AS ENUM('managed', 'external');
ALTER TABLE "developments_media_items" ADD COLUMN "kind" "enum_developments_media_items_kind" DEFAULT 'managed' NOT NULL;
ALTER TABLE "developments_media_items" ALTER COLUMN "media_id" DROP NOT NULL;
ALTER TABLE "developments_media_items" ADD COLUMN "external_url" varchar;
ALTER TABLE "developments_media_items" ADD CONSTRAINT "developments_media_items_origin_guard" CHECK (
  ("kind" = 'managed' AND "media_id" IS NOT NULL AND "external_url" IS NULL)
  OR ("kind" = 'external' AND "media_id" IS NULL AND NULLIF("external_url", '') IS NOT NULL)
);
`;

const downSql = `
ALTER TABLE "developments_media_items" DROP CONSTRAINT "developments_media_items_origin_guard";
DELETE FROM "developments_media_items" WHERE "kind" = 'external';
ALTER TABLE "developments_media_items" ALTER COLUMN "media_id" SET NOT NULL;
ALTER TABLE "developments_media_items" DROP COLUMN "external_url";
ALTER TABLE "developments_media_items" DROP COLUMN "kind";
DROP TYPE "public"."enum_developments_media_items_kind";
`;

export async function up({ db }: MigrateUpArgs): Promise<void> {
	await db.execute(sql.raw(upSql));
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
	await db.execute(sql.raw(downSql));
}
