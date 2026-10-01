import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_status" AS ENUM('draft', 'published', 'archived');
  CREATE TYPE "public"."enum_properties_images_kind" AS ENUM('external', 'managed');
  CREATE TYPE "public"."enum_properties_origin" AS ENUM('feed', 'manual');
  CREATE TYPE "public"."enum_properties_status" AS ENUM('active', 'archived');
  CREATE TYPE "public"."enum_properties_market" AS ENUM('secondary', 'newbuild');
  CREATE TYPE "public"."enum_properties_category" AS ENUM('apartment', 'house', 'land', 'commercial');
  CREATE TYPE "public"."enum_properties_deal_type" AS ENUM('sale', 'rent');
  CREATE TYPE "public"."enum_properties_currency" AS ENUM('RUB');
  CREATE TYPE "public"."enum_feed_sources_parser" AS ENUM('yrl');
  CREATE TYPE "public"."enum_feed_sources_market" AS ENUM('secondary', 'newbuild');
  CREATE TYPE "public"."enum_import_runs_status" AS ENUM('queued', 'running', 'success', 'unchanged', 'suspicious', 'interrupted', 'failed');
  CREATE TYPE "public"."enum_import_issues_severity" AS ENUM('info', 'warning', 'error');
  CREATE TYPE "public"."enum_redirects_status_code" AS ENUM('301', '302');
  CREATE TABLE "pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"status" "enum_pages_status" DEFAULT 'draft' NOT NULL,
  	"published_at" timestamp(3) with time zone,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_noindex" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "properties_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"kind" "enum_properties_images_kind" DEFAULT 'external' NOT NULL,
  	"url" varchar,
  	"media_id" integer,
  	"alt" varchar,
  	"order" numeric
  );
  
  CREATE TABLE "properties_manual_overrides" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"field" varchar NOT NULL,
  	"set_at" timestamp(3) with time zone NOT NULL,
  	"set_by_id" integer
  );
  
  CREATE TABLE "properties" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"feed_source_id" integer,
  	"external_id" varchar,
  	"origin" "enum_properties_origin" DEFAULT 'manual' NOT NULL,
  	"import_hash" varchar,
  	"first_seen_at" timestamp(3) with time zone,
  	"last_seen_at" timestamp(3) with time zone,
  	"last_import_run_id" integer,
  	"external_complex_id" varchar,
  	"external_complex_name" varchar,
  	"external_building_id" varchar,
  	"external_layout_id" varchar,
  	"status" "enum_properties_status" DEFAULT 'active' NOT NULL,
  	"deactivated_at" timestamp(3) with time zone,
  	"deactivated_by_run_id" integer,
  	"needs_review" boolean DEFAULT false,
  	"published_at" timestamp(3) with time zone,
  	"content_purged_at" timestamp(3) with time zone,
  	"slug" varchar NOT NULL,
  	"market" "enum_properties_market" DEFAULT 'secondary' NOT NULL,
  	"category" "enum_properties_category" NOT NULL,
  	"deal_type" "enum_properties_deal_type" NOT NULL,
  	"price_minor" numeric,
  	"currency" "enum_properties_currency" DEFAULT 'RUB',
  	"price_per_meter_minor" numeric,
  	"rooms" numeric,
  	"total_area" numeric,
  	"living_area" numeric,
  	"kitchen_area" numeric,
  	"floor" numeric,
  	"floors" numeric,
  	"region" varchar,
  	"locality" varchar,
  	"district" varchar,
  	"street" varchar,
  	"house" varchar,
  	"public_address" varchar,
  	"lat" numeric,
  	"lng" numeric,
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"unit_number" varchar,
  	"cadastral_number" varchar,
  	"internal_comment" varchar,
  	"owner_contact" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "feed_sources" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"parser" "enum_feed_sources_parser" DEFAULT 'yrl' NOT NULL,
  	"market" "enum_feed_sources_market" DEFAULT 'secondary' NOT NULL,
  	"feed_url_ref" varchar NOT NULL,
  	"enabled" boolean DEFAULT false,
  	"refresh_interval_minutes" numeric DEFAULT 1440 NOT NULL,
  	"next_due_at" timestamp(3) with time zone,
  	"last_attempt_at" timestamp(3) with time zone,
  	"last_successful_run_at" timestamp(3) with time zone,
  	"last_full_run_at" timestamp(3) with time zone,
  	"safety_threshold_percent" numeric DEFAULT 30 NOT NULL,
  	"max_deactivations_per_run" numeric DEFAULT 50 NOT NULL,
  	"last_offer_count" numeric,
  	"last_etag" varchar,
  	"last_modified" varchar,
  	"last_feed_hash" varchar,
  	"deactivation_approval_run_id_id" integer,
  	"deactivation_approval_approved_by_id" integer,
  	"deactivation_approval_approved_at" timestamp(3) with time zone,
  	"deactivation_approval_expires_at" timestamp(3) with time zone,
  	"deactivation_approval_consumed_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "import_runs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"feed_source_id" integer NOT NULL,
  	"status" "enum_import_runs_status" DEFAULT 'queued' NOT NULL,
  	"queued_at" timestamp(3) with time zone NOT NULL,
  	"started_at" timestamp(3) with time zone,
  	"finished_at" timestamp(3) with time zone,
  	"heartbeat_at" timestamp(3) with time zone,
  	"job_id" varchar,
  	"offered_count" numeric,
  	"created_count" numeric,
  	"updated_count" numeric,
  	"archived_count" numeric,
  	"skipped_count" numeric,
  	"warning_count" numeric,
  	"error_count" numeric,
  	"feed_hash" varchar,
  	"last_error_redacted" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "import_issues" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"import_run_id" integer NOT NULL,
  	"feed_source_id" integer,
  	"property_id" integer,
  	"external_id" varchar,
  	"severity" "enum_import_issues_severity" DEFAULT 'warning' NOT NULL,
  	"code" varchar NOT NULL,
  	"message_redacted" varchar NOT NULL,
  	"field" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "redirects" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"from" varchar NOT NULL,
  	"to" varchar NOT NULL,
  	"status_code" "enum_redirects_status_code" DEFAULT '301' NOT NULL,
  	"reason" varchar,
  	"created_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "pages_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "properties_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "feed_sources_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "import_runs_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "import_issues_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "redirects_id" integer;
  ALTER TABLE "properties_images" ADD CONSTRAINT "properties_images_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "properties_images" ADD CONSTRAINT "properties_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "properties_manual_overrides" ADD CONSTRAINT "properties_manual_overrides_set_by_id_users_id_fk" FOREIGN KEY ("set_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "properties_manual_overrides" ADD CONSTRAINT "properties_manual_overrides_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "properties" ADD CONSTRAINT "properties_feed_source_id_feed_sources_id_fk" FOREIGN KEY ("feed_source_id") REFERENCES "public"."feed_sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "properties" ADD CONSTRAINT "properties_last_import_run_id_import_runs_id_fk" FOREIGN KEY ("last_import_run_id") REFERENCES "public"."import_runs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "properties" ADD CONSTRAINT "properties_deactivated_by_run_id_import_runs_id_fk" FOREIGN KEY ("deactivated_by_run_id") REFERENCES "public"."import_runs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "feed_sources" ADD CONSTRAINT "feed_sources_deactivation_approval_run_id_id_import_runs_id_fk" FOREIGN KEY ("deactivation_approval_run_id_id") REFERENCES "public"."import_runs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "feed_sources" ADD CONSTRAINT "feed_sources_deactivation_approval_approved_by_id_users_id_fk" FOREIGN KEY ("deactivation_approval_approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "import_runs" ADD CONSTRAINT "import_runs_feed_source_id_feed_sources_id_fk" FOREIGN KEY ("feed_source_id") REFERENCES "public"."feed_sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "import_issues" ADD CONSTRAINT "import_issues_import_run_id_import_runs_id_fk" FOREIGN KEY ("import_run_id") REFERENCES "public"."import_runs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "import_issues" ADD CONSTRAINT "import_issues_feed_source_id_feed_sources_id_fk" FOREIGN KEY ("feed_source_id") REFERENCES "public"."feed_sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "import_issues" ADD CONSTRAINT "import_issues_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "redirects" ADD CONSTRAINT "redirects_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");
  CREATE INDEX "pages_status_idx" ON "pages" USING btree ("status");
  CREATE INDEX "pages_updated_at_idx" ON "pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "pages" USING btree ("created_at");
  CREATE INDEX "properties_images_order_idx" ON "properties_images" USING btree ("_order");
  CREATE INDEX "properties_images_parent_id_idx" ON "properties_images" USING btree ("_parent_id");
  CREATE INDEX "properties_images_media_idx" ON "properties_images" USING btree ("media_id");
  CREATE INDEX "properties_manual_overrides_order_idx" ON "properties_manual_overrides" USING btree ("_order");
  CREATE INDEX "properties_manual_overrides_parent_id_idx" ON "properties_manual_overrides" USING btree ("_parent_id");
  CREATE INDEX "properties_manual_overrides_set_by_idx" ON "properties_manual_overrides" USING btree ("set_by_id");
  CREATE INDEX "properties_feed_source_idx" ON "properties" USING btree ("feed_source_id");
  CREATE INDEX "properties_external_id_idx" ON "properties" USING btree ("external_id");
  CREATE INDEX "properties_origin_idx" ON "properties" USING btree ("origin");
  CREATE INDEX "properties_last_import_run_idx" ON "properties" USING btree ("last_import_run_id");
  CREATE INDEX "properties_external_complex_id_idx" ON "properties" USING btree ("external_complex_id");
  CREATE INDEX "properties_external_building_id_idx" ON "properties" USING btree ("external_building_id");
  CREATE INDEX "properties_external_layout_id_idx" ON "properties" USING btree ("external_layout_id");
  CREATE INDEX "properties_status_idx" ON "properties" USING btree ("status");
  CREATE INDEX "properties_deactivated_by_run_idx" ON "properties" USING btree ("deactivated_by_run_id");
  CREATE INDEX "properties_needs_review_idx" ON "properties" USING btree ("needs_review");
  CREATE INDEX "properties_content_purged_at_idx" ON "properties" USING btree ("content_purged_at");
  CREATE UNIQUE INDEX "properties_slug_idx" ON "properties" USING btree ("slug");
  CREATE INDEX "properties_market_idx" ON "properties" USING btree ("market");
  CREATE INDEX "properties_category_idx" ON "properties" USING btree ("category");
  CREATE INDEX "properties_deal_type_idx" ON "properties" USING btree ("deal_type");
  CREATE INDEX "properties_price_minor_idx" ON "properties" USING btree ("price_minor");
  CREATE INDEX "properties_rooms_idx" ON "properties" USING btree ("rooms");
  CREATE INDEX "properties_district_idx" ON "properties" USING btree ("district");
  CREATE INDEX "properties_updated_at_idx" ON "properties" USING btree ("updated_at");
  CREATE INDEX "properties_created_at_idx" ON "properties" USING btree ("created_at");
  CREATE UNIQUE INDEX "feed_sources_code_idx" ON "feed_sources" USING btree ("code");
  CREATE INDEX "feed_sources_market_idx" ON "feed_sources" USING btree ("market");
  CREATE INDEX "feed_sources_enabled_idx" ON "feed_sources" USING btree ("enabled");
  CREATE INDEX "feed_sources_next_due_at_idx" ON "feed_sources" USING btree ("next_due_at");
  CREATE INDEX "feed_sources_deactivation_approval_deactivation_approval_idx" ON "feed_sources" USING btree ("deactivation_approval_run_id_id");
  CREATE INDEX "feed_sources_deactivation_approval_deactivation_approv_1_idx" ON "feed_sources" USING btree ("deactivation_approval_approved_by_id");
  CREATE INDEX "feed_sources_updated_at_idx" ON "feed_sources" USING btree ("updated_at");
  CREATE INDEX "feed_sources_created_at_idx" ON "feed_sources" USING btree ("created_at");
  CREATE INDEX "import_runs_feed_source_idx" ON "import_runs" USING btree ("feed_source_id");
  CREATE INDEX "import_runs_status_idx" ON "import_runs" USING btree ("status");
  CREATE INDEX "import_runs_queued_at_idx" ON "import_runs" USING btree ("queued_at");
  CREATE INDEX "import_runs_heartbeat_at_idx" ON "import_runs" USING btree ("heartbeat_at");
  CREATE INDEX "import_runs_updated_at_idx" ON "import_runs" USING btree ("updated_at");
  CREATE INDEX "import_runs_created_at_idx" ON "import_runs" USING btree ("created_at");
  CREATE INDEX "import_issues_import_run_idx" ON "import_issues" USING btree ("import_run_id");
  CREATE INDEX "import_issues_feed_source_idx" ON "import_issues" USING btree ("feed_source_id");
  CREATE INDEX "import_issues_property_idx" ON "import_issues" USING btree ("property_id");
  CREATE INDEX "import_issues_severity_idx" ON "import_issues" USING btree ("severity");
  CREATE INDEX "import_issues_code_idx" ON "import_issues" USING btree ("code");
  CREATE INDEX "import_issues_updated_at_idx" ON "import_issues" USING btree ("updated_at");
  CREATE INDEX "import_issues_created_at_idx" ON "import_issues" USING btree ("created_at");
  CREATE UNIQUE INDEX "redirects_from_idx" ON "redirects" USING btree ("from");
  CREATE INDEX "redirects_created_by_idx" ON "redirects" USING btree ("created_by_id");
  CREATE INDEX "redirects_updated_at_idx" ON "redirects" USING btree ("updated_at");
  CREATE INDEX "redirects_created_at_idx" ON "redirects" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_properties_fk" FOREIGN KEY ("properties_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_feed_sources_fk" FOREIGN KEY ("feed_sources_id") REFERENCES "public"."feed_sources"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_import_runs_fk" FOREIGN KEY ("import_runs_id") REFERENCES "public"."import_runs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_import_issues_fk" FOREIGN KEY ("import_issues_id") REFERENCES "public"."import_issues"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_redirects_fk" FOREIGN KEY ("redirects_id") REFERENCES "public"."redirects"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("pages_id");
  CREATE INDEX "payload_locked_documents_rels_properties_id_idx" ON "payload_locked_documents_rels" USING btree ("properties_id");
  CREATE INDEX "payload_locked_documents_rels_feed_sources_id_idx" ON "payload_locked_documents_rels" USING btree ("feed_sources_id");
  CREATE INDEX "payload_locked_documents_rels_import_runs_id_idx" ON "payload_locked_documents_rels" USING btree ("import_runs_id");
  CREATE INDEX "payload_locked_documents_rels_import_issues_id_idx" ON "payload_locked_documents_rels" USING btree ("import_issues_id");
  CREATE INDEX "payload_locked_documents_rels_redirects_id_idx" ON "payload_locked_documents_rels" USING btree ("redirects_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "properties_images" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "properties_manual_overrides" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "properties" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "feed_sources" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "import_runs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "import_issues" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "redirects" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "pages" CASCADE;
  DROP TABLE "properties_images" CASCADE;
  DROP TABLE "properties_manual_overrides" CASCADE;
  DROP TABLE "properties" CASCADE;
  DROP TABLE "feed_sources" CASCADE;
  DROP TABLE "import_runs" CASCADE;
  DROP TABLE "import_issues" CASCADE;
  DROP TABLE "redirects" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_pages_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_properties_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_feed_sources_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_import_runs_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_import_issues_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_redirects_fk";
  
  DROP INDEX "payload_locked_documents_rels_pages_id_idx";
  DROP INDEX "payload_locked_documents_rels_properties_id_idx";
  DROP INDEX "payload_locked_documents_rels_feed_sources_id_idx";
  DROP INDEX "payload_locked_documents_rels_import_runs_id_idx";
  DROP INDEX "payload_locked_documents_rels_import_issues_id_idx";
  DROP INDEX "payload_locked_documents_rels_redirects_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "pages_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "properties_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "feed_sources_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "import_runs_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "import_issues_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "redirects_id";
  DROP TYPE "public"."enum_pages_status";
  DROP TYPE "public"."enum_properties_images_kind";
  DROP TYPE "public"."enum_properties_origin";
  DROP TYPE "public"."enum_properties_status";
  DROP TYPE "public"."enum_properties_market";
  DROP TYPE "public"."enum_properties_category";
  DROP TYPE "public"."enum_properties_deal_type";
  DROP TYPE "public"."enum_properties_currency";
  DROP TYPE "public"."enum_feed_sources_parser";
  DROP TYPE "public"."enum_feed_sources_market";
  DROP TYPE "public"."enum_import_runs_status";
  DROP TYPE "public"."enum_import_issues_severity";
  DROP TYPE "public"."enum_redirects_status_code";`)
}
