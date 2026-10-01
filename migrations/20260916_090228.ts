import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_leads_form_kind" AS ENUM('property_request', 'callback', 'consultation', 'generic');
  CREATE TYPE "public"."enum_leads_status" AS ENUM('new', 'in_progress', 'processed', 'rejected');
  CREATE TYPE "public"."enum_leads_retention_mode" AS ENUM('delete', 'anonymize');
  CREATE TYPE "public"."enum_lead_deliveries_attempt_log_outcome" AS ENUM('delivered', 'retryable', 'permanent', 'skipped');
  CREATE TYPE "public"."enum_lead_deliveries_channel_kind" AS ENUM('messenger', 'crm');
  CREATE TYPE "public"."enum_lead_deliveries_status" AS ENUM('pending', 'sending', 'delivered', 'failed', 'abandoned');
  CREATE TYPE "public"."enum_lead_deliveries_last_error_kind" AS ENUM('retryable', 'permanent');
  CREATE TYPE "public"."enum_lead_deliveries_abandoned_reason" AS ENUM('exhausted', 'permanent', 'manual');
  CREATE TABLE "leads" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"phone_raw" varchar,
  	"phone_e164" varchar NOT NULL,
  	"email" varchar,
  	"message" varchar,
  	"form_kind" "enum_leads_form_kind" NOT NULL,
  	"source_page" varchar NOT NULL,
  	"referrer" varchar,
  	"property_id" integer,
  	"utm_source" varchar,
  	"utm_medium" varchar,
  	"utm_campaign" varchar,
  	"utm_content" varchar,
  	"utm_term" varchar,
  	"consent_accepted" boolean DEFAULT false NOT NULL,
  	"consent_version" varchar NOT NULL,
  	"consent_consented_at" timestamp(3) with time zone NOT NULL,
  	"status" "enum_leads_status" DEFAULT 'new' NOT NULL,
  	"idempotency_key" varchar NOT NULL,
  	"retention_mode" "enum_leads_retention_mode" DEFAULT 'delete' NOT NULL,
  	"retention_until" timestamp(3) with time zone,
  	"pii_purged_at" timestamp(3) with time zone,
  	"fraud_fingerprint" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "lead_deliveries_attempt_log" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"attempted_at" timestamp(3) with time zone NOT NULL,
  	"safe_code" varchar,
  	"outcome" "enum_lead_deliveries_attempt_log_outcome" NOT NULL,
  	"redacted_note" varchar
  );
  
  CREATE TABLE "lead_deliveries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"lead_id" integer NOT NULL,
  	"channel_id" varchar NOT NULL,
  	"channel_kind" "enum_lead_deliveries_channel_kind" NOT NULL,
  	"status" "enum_lead_deliveries_status" DEFAULT 'pending' NOT NULL,
  	"attempts" numeric DEFAULT 0 NOT NULL,
  	"next_attempt_at" timestamp(3) with time zone,
  	"job_id" varchar,
  	"claimed_at" timestamp(3) with time zone,
  	"heartbeat_at" timestamp(3) with time zone,
  	"delivered_at" timestamp(3) with time zone,
  	"idempotency_key" varchar NOT NULL,
  	"external_ref" varchar,
  	"last_error_kind" "enum_lead_deliveries_last_error_kind",
  	"last_error_redacted" varchar,
  	"abandoned_reason" "enum_lead_deliveries_abandoned_reason",
  	"diagnostics_purged_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "leads_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "lead_deliveries_id" integer;
  ALTER TABLE "leads" ADD CONSTRAINT "leads_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "lead_deliveries_attempt_log" ADD CONSTRAINT "lead_deliveries_attempt_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."lead_deliveries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lead_deliveries" ADD CONSTRAINT "lead_deliveries_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "leads_phone_e164_idx" ON "leads" USING btree ("phone_e164");
  CREATE INDEX "leads_form_kind_idx" ON "leads" USING btree ("form_kind");
  CREATE INDEX "leads_source_page_idx" ON "leads" USING btree ("source_page");
  CREATE INDEX "leads_property_idx" ON "leads" USING btree ("property_id");
  CREATE INDEX "leads_consent_consent_version_idx" ON "leads" USING btree ("consent_version");
  CREATE INDEX "leads_status_idx" ON "leads" USING btree ("status");
  CREATE UNIQUE INDEX "leads_idempotency_key_idx" ON "leads" USING btree ("idempotency_key");
  CREATE INDEX "leads_retention_until_idx" ON "leads" USING btree ("retention_until");
  CREATE INDEX "leads_pii_purged_at_idx" ON "leads" USING btree ("pii_purged_at");
  CREATE INDEX "leads_updated_at_idx" ON "leads" USING btree ("updated_at");
  CREATE INDEX "leads_created_at_idx" ON "leads" USING btree ("created_at");
  CREATE INDEX "lead_deliveries_attempt_log_order_idx" ON "lead_deliveries_attempt_log" USING btree ("_order");
  CREATE INDEX "lead_deliveries_attempt_log_parent_id_idx" ON "lead_deliveries_attempt_log" USING btree ("_parent_id");
  CREATE INDEX "lead_deliveries_lead_idx" ON "lead_deliveries" USING btree ("lead_id");
  CREATE INDEX "lead_deliveries_channel_id_idx" ON "lead_deliveries" USING btree ("channel_id");
  CREATE INDEX "lead_deliveries_channel_kind_idx" ON "lead_deliveries" USING btree ("channel_kind");
  CREATE INDEX "lead_deliveries_status_idx" ON "lead_deliveries" USING btree ("status");
  CREATE INDEX "lead_deliveries_next_attempt_at_idx" ON "lead_deliveries" USING btree ("next_attempt_at");
  CREATE INDEX "lead_deliveries_job_id_idx" ON "lead_deliveries" USING btree ("job_id");
  CREATE INDEX "lead_deliveries_claimed_at_idx" ON "lead_deliveries" USING btree ("claimed_at");
  CREATE INDEX "lead_deliveries_heartbeat_at_idx" ON "lead_deliveries" USING btree ("heartbeat_at");
  CREATE INDEX "lead_deliveries_delivered_at_idx" ON "lead_deliveries" USING btree ("delivered_at");
  CREATE UNIQUE INDEX "lead_deliveries_idempotency_key_idx" ON "lead_deliveries" USING btree ("idempotency_key");
  CREATE INDEX "lead_deliveries_diagnostics_purged_at_idx" ON "lead_deliveries" USING btree ("diagnostics_purged_at");
  CREATE INDEX "lead_deliveries_updated_at_idx" ON "lead_deliveries" USING btree ("updated_at");
  CREATE INDEX "lead_deliveries_created_at_idx" ON "lead_deliveries" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_leads_fk" FOREIGN KEY ("leads_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_lead_deliveries_fk" FOREIGN KEY ("lead_deliveries_id") REFERENCES "public"."lead_deliveries"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_leads_id_idx" ON "payload_locked_documents_rels" USING btree ("leads_id");
  CREATE INDEX "payload_locked_documents_rels_lead_deliveries_id_idx" ON "payload_locked_documents_rels" USING btree ("lead_deliveries_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "leads" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "lead_deliveries_attempt_log" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "lead_deliveries" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "leads" CASCADE;
  DROP TABLE "lead_deliveries_attempt_log" CASCADE;
  DROP TABLE "lead_deliveries" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_leads_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_lead_deliveries_fk";
  
  DROP INDEX "payload_locked_documents_rels_leads_id_idx";
  DROP INDEX "payload_locked_documents_rels_lead_deliveries_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "leads_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "lead_deliveries_id";
  DROP TYPE "public"."enum_leads_form_kind";
  DROP TYPE "public"."enum_leads_status";
  DROP TYPE "public"."enum_leads_retention_mode";
  DROP TYPE "public"."enum_lead_deliveries_attempt_log_outcome";
  DROP TYPE "public"."enum_lead_deliveries_channel_kind";
  DROP TYPE "public"."enum_lead_deliveries_status";
  DROP TYPE "public"."enum_lead_deliveries_last_error_kind";
  DROP TYPE "public"."enum_lead_deliveries_abandoned_reason";`)
}
