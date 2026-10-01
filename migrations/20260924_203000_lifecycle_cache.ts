import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export const lifecycleCacheUpSql = `
CREATE TYPE "public"."enum_lifecycle_events_entity_type" AS ENUM('property', 'development', 'developer');
CREATE TYPE "public"."enum_lifecycle_events_action" AS ENUM('published', 'archived', 'purged', 'canonical_move');
CREATE TYPE "public"."enum_redirects_entity_type" AS ENUM('property', 'development', 'developer');
ALTER TABLE "developers" ADD COLUMN "content_purged_at" timestamp(3) with time zone;
ALTER TABLE "developments" ADD COLUMN "content_purged_at" timestamp(3) with time zone;
ALTER TABLE "redirects" ADD COLUMN "entity_type" "enum_redirects_entity_type";
ALTER TABLE "redirects" ADD COLUMN "entity_id" varchar;
CREATE TABLE "lifecycle_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "entity_type" "enum_lifecycle_events_entity_type" NOT NULL,
  "entity_id" varchar NOT NULL,
  "action" "enum_lifecycle_events_action" NOT NULL,
  "canonical_path" varchar, "from_path" varchar, "to_path" varchar, "reason" varchar,
  "occurred_at" timestamp(3) with time zone NOT NULL,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "lifecycle_events_id" integer;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_lifecycle_events_fk" FOREIGN KEY ("lifecycle_events_id") REFERENCES "lifecycle_events"("id") ON DELETE cascade;
CREATE INDEX "developers_content_purged_at_idx" ON "developers" ("content_purged_at");
CREATE INDEX "developments_content_purged_at_idx" ON "developments" ("content_purged_at");
CREATE INDEX "redirects_entity_id_idx" ON "redirects" ("entity_id");
CREATE INDEX "lifecycle_events_entity_type_idx" ON "lifecycle_events" ("entity_type");
CREATE INDEX "lifecycle_events_entity_id_idx" ON "lifecycle_events" ("entity_id");
CREATE INDEX "lifecycle_events_action_idx" ON "lifecycle_events" ("action");
CREATE INDEX "lifecycle_events_occurred_at_idx" ON "lifecycle_events" ("occurred_at");
CREATE INDEX "lifecycle_events_updated_at_idx" ON "lifecycle_events" ("updated_at");
CREATE INDEX "lifecycle_events_created_at_idx" ON "lifecycle_events" ("created_at");
CREATE INDEX "payload_locked_documents_rels_lifecycle_events_id_idx" ON "payload_locked_documents_rels" ("lifecycle_events_id");
CREATE FUNCTION "lifecycle_events_append_only_guard"() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'lifecycle_events is append-only'; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "lifecycle_events_append_only" BEFORE UPDATE OR DELETE ON "lifecycle_events" FOR EACH ROW EXECUTE FUNCTION "lifecycle_events_append_only_guard"();
CREATE FUNCTION "redirects_direct_only_guard"() RETURNS trigger AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('redirects_direct_only_guard'));
  IF NEW."from" = NEW."to" THEN RAISE EXCEPTION 'redirect self-loop is forbidden'; END IF;
  IF EXISTS (SELECT 1 FROM "redirects" existing WHERE existing.id <> COALESCE(NEW.id, 0) AND (existing."from" = NEW."to" OR existing."to" = NEW."from")) THEN
    RAISE EXCEPTION 'redirect chains and loops are forbidden';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "redirects_direct_only" BEFORE INSERT OR UPDATE OF "from", "to" ON "redirects" FOR EACH ROW EXECUTE FUNCTION "redirects_direct_only_guard"();
`;

export const lifecycleCacheDownSql = `
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "lifecycle_events" LIMIT 1) THEN
    RAISE EXCEPTION 'lifecycle history exists; rollback is forbidden, apply a forward fix';
  END IF;
END;
$$;
DROP TRIGGER "redirects_direct_only" ON "redirects";
DROP FUNCTION "redirects_direct_only_guard"();
DROP TRIGGER "lifecycle_events_append_only" ON "lifecycle_events";
DROP FUNCTION "lifecycle_events_append_only_guard"();
DROP INDEX "payload_locked_documents_rels_lifecycle_events_id_idx";
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_lifecycle_events_fk";
ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "lifecycle_events_id";
DROP TABLE "lifecycle_events";
DROP INDEX "redirects_entity_id_idx";
DROP INDEX "developments_content_purged_at_idx";
DROP INDEX "developers_content_purged_at_idx";
ALTER TABLE "redirects" DROP COLUMN "entity_id";
ALTER TABLE "redirects" DROP COLUMN "entity_type";
ALTER TABLE "developments" DROP COLUMN "content_purged_at";
ALTER TABLE "developers" DROP COLUMN "content_purged_at";
DROP TYPE "enum_redirects_entity_type";
DROP TYPE "enum_lifecycle_events_action";
DROP TYPE "enum_lifecycle_events_entity_type";
`;

export async function up({ db }: MigrateUpArgs): Promise<void> {
	await db.execute(sql.raw(lifecycleCacheUpSql));
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
	await db.execute(sql.raw(lifecycleCacheDownSql));
}
