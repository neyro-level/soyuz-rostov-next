import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export const developmentsUpSql = `
CREATE TYPE "public"."enum_developers_status" AS ENUM('draft', 'published', 'archived');
CREATE TYPE "public"."enum_developments_prices_currency" AS ENUM('RUB');
CREATE TYPE "public"."enum_developments_media_items_media_type" AS ENUM('image', 'plan', 'document');
CREATE TYPE "public"."enum_developments_descriptions_kind" AS ENUM('short', 'full', 'location', 'infrastructure');
CREATE TYPE "public"."enum_developments_kind" AS ENUM('residential_complex', 'cottage_village');
CREATE TYPE "public"."enum_developments_sales_status" AS ENUM('available', 'limited', 'sold_out', 'paused');
CREATE TYPE "public"."enum_developments_data_tier" AS ENUM('A', 'B', 'C');
CREATE TYPE "public"."enum_developments_status" AS ENUM('draft', 'published', 'archived');

CREATE TABLE "developers" (
  "id" serial PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "slug" varchar NOT NULL,
  "legal_name" varchar, "logo_id" integer, "site_url" varchar, "description" varchar,
  "source" varchar NOT NULL, "checked_at" timestamp(3) with time zone NOT NULL,
  "status" "enum_developers_status" DEFAULT 'draft' NOT NULL, "published_at" timestamp(3) with time zone,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL, "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "developers_aliases" (
  "_order" integer NOT NULL, "_parent_id" integer NOT NULL, "id" varchar PRIMARY KEY NOT NULL, "value" varchar NOT NULL
);

CREATE TABLE "developments" (
  "id" serial PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "slug" varchar NOT NULL,
  "kind" "enum_developments_kind" NOT NULL, "region_id" integer NOT NULL, "city_id" integer NOT NULL,
  "district_id" integer, "developer_id" integer NOT NULL, "address" varchar,
  "coordinates_latitude" numeric, "coordinates_longitude" numeric, "class" varchar, "completion" varchar,
  "deadline" timestamp(3) with time zone, "sales_status" "enum_developments_sales_status", "availability" varchar,
  "data_tier" "enum_developments_data_tier" DEFAULT 'C' NOT NULL, "source" varchar NOT NULL,
  "checked_at" timestamp(3) with time zone NOT NULL, "lots_count" numeric,
  "communications_gas" boolean, "communications_electricity" boolean, "communications_water" boolean,
  "communications_sewer" boolean, "total_area" numeric, "plots_count" numeric, "village_class" varchar,
  "status" "enum_developments_status" DEFAULT 'draft' NOT NULL, "published_at" timestamp(3) with time zone,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL, "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "developments_kind_fields_guard" CHECK (
    kind <> 'residential_complex' OR (
      COALESCE(communications_gas, false) = false AND COALESCE(communications_electricity, false) = false
      AND COALESCE(communications_water, false) = false AND COALESCE(communications_sewer, false) = false
      AND total_area IS NULL AND plots_count IS NULL AND village_class IS NULL
    )
  )
);

CREATE TABLE "developments_prices" (
  "_order" integer NOT NULL, "_parent_id" integer NOT NULL, "id" varchar PRIMARY KEY NOT NULL,
  "label" varchar NOT NULL, "amount_minor" numeric NOT NULL,
  "currency" "enum_developments_prices_currency" DEFAULT 'RUB' NOT NULL,
  "source" varchar NOT NULL, "checked_at" timestamp(3) with time zone NOT NULL
);
CREATE TABLE "developments_media_items" (
  "_order" integer NOT NULL, "_parent_id" integer NOT NULL, "id" varchar PRIMARY KEY NOT NULL,
  "media_id" integer NOT NULL, "media_type" "enum_developments_media_items_media_type" NOT NULL,
  "rights" varchar NOT NULL, "source" varchar NOT NULL, "checked_at" timestamp(3) with time zone NOT NULL
);
CREATE TABLE "developments_layouts" (
  "_order" integer NOT NULL, "_parent_id" integer NOT NULL, "id" varchar PRIMARY KEY NOT NULL,
  "external_id" varchar, "rooms" numeric, "area" numeric, "title" varchar NOT NULL
);
CREATE TABLE "developments_progress" (
  "_order" integer NOT NULL, "_parent_id" integer NOT NULL, "id" varchar PRIMARY KEY NOT NULL,
  "date" timestamp(3) with time zone NOT NULL, "percent" numeric, "note" varchar,
  "source" varchar NOT NULL, "checked_at" timestamp(3) with time zone NOT NULL
);
CREATE TABLE "developments_descriptions" (
  "_order" integer NOT NULL, "_parent_id" integer NOT NULL, "id" varchar PRIMARY KEY NOT NULL,
  "kind" "enum_developments_descriptions_kind" NOT NULL, "text" varchar NOT NULL,
  "source" varchar NOT NULL, "checked_at" timestamp(3) with time zone NOT NULL
);
CREATE TABLE "developments_faq" (
  "_order" integer NOT NULL, "_parent_id" integer NOT NULL, "id" varchar PRIMARY KEY NOT NULL,
  "question" varchar NOT NULL, "answer" varchar NOT NULL,
  "source" varchar NOT NULL, "checked_at" timestamp(3) with time zone NOT NULL
);
CREATE TABLE "developments_external_identities" (
  "_order" integer NOT NULL, "_parent_id" integer NOT NULL, "id" varchar PRIMARY KEY NOT NULL,
  "source" varchar NOT NULL, "external_id" varchar NOT NULL
);

ALTER TABLE "developers_aliases" ADD CONSTRAINT "developers_aliases_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "developers"("id") ON DELETE cascade;
ALTER TABLE "developers" ADD CONSTRAINT "developers_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "media"("id") ON DELETE set null;
ALTER TABLE "developments" ADD CONSTRAINT "developments_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE restrict;
ALTER TABLE "developments" ADD CONSTRAINT "developments_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE restrict;
ALTER TABLE "developments" ADD CONSTRAINT "developments_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE set null;
ALTER TABLE "developments" ADD CONSTRAINT "developments_developer_id_developers_id_fk" FOREIGN KEY ("developer_id") REFERENCES "developers"("id") ON DELETE restrict;
ALTER TABLE "developments_prices" ADD CONSTRAINT "developments_prices_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "developments"("id") ON DELETE cascade;
ALTER TABLE "developments_media_items" ADD CONSTRAINT "developments_media_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "developments"("id") ON DELETE cascade;
ALTER TABLE "developments_media_items" ADD CONSTRAINT "developments_media_items_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE restrict;
ALTER TABLE "developments_layouts" ADD CONSTRAINT "developments_layouts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "developments"("id") ON DELETE cascade;
ALTER TABLE "developments_progress" ADD CONSTRAINT "developments_progress_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "developments"("id") ON DELETE cascade;
ALTER TABLE "developments_descriptions" ADD CONSTRAINT "developments_descriptions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "developments"("id") ON DELETE cascade;
ALTER TABLE "developments_faq" ADD CONSTRAINT "developments_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "developments"("id") ON DELETE cascade;
ALTER TABLE "developments_external_identities" ADD CONSTRAINT "developments_external_identities_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "developments"("id") ON DELETE cascade;

CREATE UNIQUE INDEX "developers_slug_idx" ON "developers" ("slug");
CREATE INDEX "developers_logo_idx" ON "developers" ("logo_id");
CREATE INDEX "developers_checked_at_idx" ON "developers" ("checked_at");
CREATE INDEX "developers_status_idx" ON "developers" ("status");
CREATE INDEX "developers_published_at_idx" ON "developers" ("published_at");
CREATE INDEX "developers_updated_at_idx" ON "developers" ("updated_at");
CREATE INDEX "developers_created_at_idx" ON "developers" ("created_at");
CREATE INDEX "developers_aliases_order_idx" ON "developers_aliases" ("_order");
CREATE INDEX "developers_aliases_parent_id_idx" ON "developers_aliases" ("_parent_id");
CREATE UNIQUE INDEX "developments_slug_idx" ON "developments" ("slug");
CREATE INDEX "developments_kind_idx" ON "developments" ("kind");
CREATE INDEX "developments_region_idx" ON "developments" ("region_id");
CREATE INDEX "developments_city_idx" ON "developments" ("city_id");
CREATE INDEX "developments_district_idx" ON "developments" ("district_id");
CREATE INDEX "developments_developer_idx" ON "developments" ("developer_id");
CREATE INDEX "developments_status_idx" ON "developments" ("status");
CREATE INDEX "developments_published_at_idx" ON "developments" ("published_at");
CREATE INDEX "developments_updated_at_idx" ON "developments" ("updated_at");
CREATE INDEX "developments_created_at_idx" ON "developments" ("created_at");
CREATE INDEX "developments_prices_order_idx" ON "developments_prices" ("_order");
CREATE INDEX "developments_prices_parent_id_idx" ON "developments_prices" ("_parent_id");
CREATE INDEX "developments_media_items_order_idx" ON "developments_media_items" ("_order");
CREATE INDEX "developments_media_items_parent_id_idx" ON "developments_media_items" ("_parent_id");
CREATE INDEX "developments_media_items_media_idx" ON "developments_media_items" ("media_id");
CREATE INDEX "developments_layouts_order_idx" ON "developments_layouts" ("_order");
CREATE INDEX "developments_layouts_parent_id_idx" ON "developments_layouts" ("_parent_id");
CREATE INDEX "developments_progress_order_idx" ON "developments_progress" ("_order");
CREATE INDEX "developments_progress_parent_id_idx" ON "developments_progress" ("_parent_id");
CREATE INDEX "developments_descriptions_order_idx" ON "developments_descriptions" ("_order");
CREATE INDEX "developments_descriptions_parent_id_idx" ON "developments_descriptions" ("_parent_id");
CREATE INDEX "developments_faq_order_idx" ON "developments_faq" ("_order");
CREATE INDEX "developments_faq_parent_id_idx" ON "developments_faq" ("_parent_id");
CREATE INDEX "developments_external_identities_order_idx" ON "developments_external_identities" ("_order");
CREATE INDEX "developments_external_identities_parent_id_idx" ON "developments_external_identities" ("_parent_id");

ALTER TABLE "properties" ADD COLUMN "development_id" integer;
ALTER TABLE "properties" ADD CONSTRAINT "properties_development_id_developments_id_fk" FOREIGN KEY ("development_id") REFERENCES "developments"("id") ON DELETE set null;
CREATE INDEX "properties_development_idx" ON "properties" ("development_id");

ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "developers_id" integer;
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "developments_id" integer;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_developers_fk" FOREIGN KEY ("developers_id") REFERENCES "developers"("id") ON DELETE cascade;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_developments_fk" FOREIGN KEY ("developments_id") REFERENCES "developments"("id") ON DELETE cascade;
CREATE INDEX "payload_locked_documents_rels_developers_id_idx" ON "payload_locked_documents_rels" ("developers_id");
CREATE INDEX "payload_locked_documents_rels_developments_id_idx" ON "payload_locked_documents_rels" ("developments_id");
`;

export const developmentsDownSql = `
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_developers_fk";
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_developments_fk";
DROP INDEX "payload_locked_documents_rels_developers_id_idx";
DROP INDEX "payload_locked_documents_rels_developments_id_idx";
ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "developers_id";
ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "developments_id";
DROP INDEX "properties_development_idx";
ALTER TABLE "properties" DROP CONSTRAINT "properties_development_id_developments_id_fk";
ALTER TABLE "properties" DROP COLUMN "development_id";
DROP TABLE "developers_aliases" CASCADE;
DROP TABLE "developments_prices" CASCADE;
DROP TABLE "developments_media_items" CASCADE;
DROP TABLE "developments_layouts" CASCADE;
DROP TABLE "developments_progress" CASCADE;
DROP TABLE "developments_descriptions" CASCADE;
DROP TABLE "developments_faq" CASCADE;
DROP TABLE "developments_external_identities" CASCADE;
DROP TABLE "developments" CASCADE;
DROP TABLE "developers" CASCADE;
DROP TYPE "enum_developments_status";
DROP TYPE "enum_developments_data_tier";
DROP TYPE "enum_developments_sales_status";
DROP TYPE "enum_developments_kind";
DROP TYPE "enum_developments_descriptions_kind";
DROP TYPE "enum_developments_media_items_media_type";
DROP TYPE "enum_developments_prices_currency";
DROP TYPE "enum_developers_status";
`;

export async function up({ db }: MigrateUpArgs): Promise<void> {
	await db.execute(sql.raw(developmentsUpSql));
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
	await db.execute(sql.raw(developmentsDownSql));
}
