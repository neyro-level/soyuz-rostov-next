import {
	type MigrateDownArgs,
	type MigrateUpArgs,
	sql,
} from "@payloadcms/db-postgres";

export const geoHierarchyUpSql = `
CREATE TYPE "public"."enum_regions_status" AS ENUM('draft', 'published', 'archived');
CREATE TYPE "public"."enum_cities_status" AS ENUM('draft', 'published', 'archived');
CREATE TYPE "public"."enum_cities_preposition" AS ENUM('v', 'na');
CREATE TYPE "public"."enum_cities_city_type" AS ENUM('city', 'urban_settlement', 'settlement', 'village');
CREATE TYPE "public"."enum_districts_status" AS ENUM('draft', 'published', 'archived');
CREATE TYPE "public"."enum_districts_district_type" AS ENUM('administrative', 'microdistrict');
CREATE TYPE "public"."enum_districts_preposition" AS ENUM('v', 'na');

CREATE TABLE "regions" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar NOT NULL,
	"title" varchar NOT NULL,
	"morphology_nominative" varchar NOT NULL,
	"morphology_genitive" varchar NOT NULL,
	"morphology_prepositional" varchar NOT NULL,
	"short_name" varchar NOT NULL,
	"sort_order" numeric DEFAULT 0 NOT NULL,
	"status" "enum_regions_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp(3) with time zone,
	"updated_at" timestamp(3) with time zone NOT NULL,
	"created_at" timestamp(3) with time zone NOT NULL,
	CONSTRAINT "regions_published_status_check" CHECK ("status" <> 'published' OR "published_at" IS NOT NULL)
);

CREATE TABLE "cities" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar NOT NULL,
	"title" varchar NOT NULL,
	"morphology_nominative" varchar NOT NULL,
	"morphology_genitive" varchar NOT NULL,
	"morphology_prepositional" varchar NOT NULL,
	"preposition" "enum_cities_preposition" NOT NULL,
	"city_type" "enum_cities_city_type" NOT NULL,
	"region_id" integer NOT NULL,
	"agglomeration_of_id" integer,
	"coordinates_latitude" numeric,
	"coordinates_longitude" numeric,
	"morphology_approved" boolean DEFAULT false NOT NULL,
	"sort_order" numeric DEFAULT 0 NOT NULL,
	"status" "enum_cities_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp(3) with time zone,
	"updated_at" timestamp(3) with time zone NOT NULL,
	"created_at" timestamp(3) with time zone NOT NULL,
	CONSTRAINT "cities_published_status_check" CHECK ("status" <> 'published' OR "published_at" IS NOT NULL),
	CONSTRAINT "cities_agglomeration_not_self_check" CHECK ("agglomeration_of_id" IS NULL OR "agglomeration_of_id" <> "id")
);

CREATE TABLE "districts_synonyms" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"id" varchar PRIMARY KEY NOT NULL,
	"value" varchar NOT NULL
);

CREATE TABLE "districts" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar NOT NULL,
	"title" varchar NOT NULL,
	"morphology_nominative" varchar NOT NULL,
	"morphology_genitive" varchar NOT NULL,
	"morphology_prepositional" varchar NOT NULL,
	"district_type" "enum_districts_district_type" NOT NULL,
	"city_id" integer NOT NULL,
	"parent_id" integer,
	"preposition" "enum_districts_preposition" NOT NULL,
	"morphology_approved" boolean DEFAULT false NOT NULL,
	"sort_order" numeric DEFAULT 0 NOT NULL,
	"status" "enum_districts_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp(3) with time zone,
	"updated_at" timestamp(3) with time zone NOT NULL,
	"created_at" timestamp(3) with time zone NOT NULL,
	CONSTRAINT "districts_published_status_check" CHECK ("status" <> 'published' OR "published_at" IS NOT NULL)
);

ALTER TABLE "cities" ADD CONSTRAINT "cities_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "cities" ADD CONSTRAINT "cities_agglomeration_of_id_cities_id_fk" FOREIGN KEY ("agglomeration_of_id") REFERENCES "public"."cities"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "districts" ADD CONSTRAINT "districts_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "districts" ADD CONSTRAINT "districts_parent_id_districts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."districts"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "districts_synonyms" ADD CONSTRAINT "districts_synonyms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."districts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "regions_id" integer;
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "cities_id" integer;
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "districts_id" integer;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_regions_fk" FOREIGN KEY ("regions_id") REFERENCES "public"."regions"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cities_fk" FOREIGN KEY ("cities_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_districts_fk" FOREIGN KEY ("districts_id") REFERENCES "public"."districts"("id") ON DELETE cascade ON UPDATE no action;

CREATE UNIQUE INDEX "regions_slug_idx" ON "regions" USING btree ("slug");
CREATE INDEX "regions_status_idx" ON "regions" USING btree ("status");
CREATE INDEX "regions_published_at_idx" ON "regions" USING btree ("published_at");
CREATE INDEX "regions_updated_at_idx" ON "regions" USING btree ("updated_at");
CREATE INDEX "regions_created_at_idx" ON "regions" USING btree ("created_at");
CREATE UNIQUE INDEX "cities_slug_idx" ON "cities" USING btree ("slug");
CREATE INDEX "cities_region_idx" ON "cities" USING btree ("region_id");
CREATE INDEX "cities_agglomeration_of_idx" ON "cities" USING btree ("agglomeration_of_id");
CREATE INDEX "cities_status_idx" ON "cities" USING btree ("status");
CREATE INDEX "cities_published_at_idx" ON "cities" USING btree ("published_at");
CREATE INDEX "cities_updated_at_idx" ON "cities" USING btree ("updated_at");
CREATE INDEX "cities_created_at_idx" ON "cities" USING btree ("created_at");
CREATE UNIQUE INDEX "districts_city_slug_unique_idx" ON "districts" USING btree ("city_id", "slug");
CREATE INDEX "districts_slug_idx" ON "districts" USING btree ("slug");
CREATE INDEX "districts_city_idx" ON "districts" USING btree ("city_id");
CREATE INDEX "districts_parent_idx" ON "districts" USING btree ("parent_id");
CREATE INDEX "districts_synonyms_order_idx" ON "districts_synonyms" USING btree ("_order");
CREATE INDEX "districts_synonyms_parent_id_idx" ON "districts_synonyms" USING btree ("_parent_id");
CREATE INDEX "districts_status_idx" ON "districts" USING btree ("status");
CREATE INDEX "districts_published_at_idx" ON "districts" USING btree ("published_at");
CREATE INDEX "districts_updated_at_idx" ON "districts" USING btree ("updated_at");
CREATE INDEX "districts_created_at_idx" ON "districts" USING btree ("created_at");
CREATE INDEX "payload_locked_documents_rels_regions_id_idx" ON "payload_locked_documents_rels" USING btree ("regions_id");
CREATE INDEX "payload_locked_documents_rels_cities_id_idx" ON "payload_locked_documents_rels" USING btree ("cities_id");
CREATE INDEX "payload_locked_documents_rels_districts_id_idx" ON "payload_locked_documents_rels" USING btree ("districts_id");

CREATE OR REPLACE FUNCTION "geo_prevent_published_slug_change"() RETURNS trigger AS $$
BEGIN
	IF (OLD."published_at" IS NOT NULL OR OLD."status" = 'published') AND NEW."slug" <> OLD."slug" THEN
		RAISE EXCEPTION 'Published geo slug is immutable until redirect lifecycle is enabled';
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "regions_prevent_published_slug_change" BEFORE UPDATE ON "regions" FOR EACH ROW EXECUTE FUNCTION "geo_prevent_published_slug_change"();
CREATE TRIGGER "cities_prevent_published_slug_change" BEFORE UPDATE ON "cities" FOR EACH ROW EXECUTE FUNCTION "geo_prevent_published_slug_change"();
CREATE TRIGGER "districts_prevent_published_slug_change" BEFORE UPDATE ON "districts" FOR EACH ROW EXECUTE FUNCTION "geo_prevent_published_slug_change"();

CREATE OR REPLACE FUNCTION "geo_root_slug_guard"() RETURNS trigger AS $$
DECLARE
	reserved text[] := ARRAY[
		'_next','admin','api','media','robots.txt','sitemap.xml','sitemap','search',
		'kvartiry','doma','uchastki','kommercheskaya-nedvizhimost','komnaty','garazhi',
		'arenda','novostroyki','kottedzhnye-poselki','zastroyshchiki','komplex','journal',
		'nedvizhimost','uslugi','o-kompanii','ipoteka','prodat','sdat','kontakty',
		'politika-konfidencialnosti','soglasie-na-obrabotku-personalnyh-dannyh'
	];
BEGIN
	PERFORM pg_advisory_xact_lock(hashtextextended('geo-root:' || NEW."slug", 0));
	IF NEW."slug" = ANY(reserved) THEN
		RAISE EXCEPTION 'Geo root slug collides with reserved namespace: %', NEW."slug";
	END IF;
	IF TG_TABLE_NAME = 'regions' AND EXISTS (SELECT 1 FROM "cities" WHERE "slug" = NEW."slug") THEN
		RAISE EXCEPTION 'Geo root slug is already owned by a city: %', NEW."slug";
	END IF;
	IF TG_TABLE_NAME = 'cities' AND EXISTS (SELECT 1 FROM "regions" WHERE "slug" = NEW."slug") THEN
		RAISE EXCEPTION 'Geo root slug is already owned by a region: %', NEW."slug";
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "regions_root_slug_guard" BEFORE INSERT OR UPDATE OF "slug" ON "regions" FOR EACH ROW EXECUTE FUNCTION "geo_root_slug_guard"();
CREATE TRIGGER "cities_root_slug_guard" BEFORE INSERT OR UPDATE OF "slug" ON "cities" FOR EACH ROW EXECUTE FUNCTION "geo_root_slug_guard"();

CREATE OR REPLACE FUNCTION "district_slug_guard"() RETURNS trigger AS $$
BEGIN
	IF NEW."slug" = ANY(ARRAY['rooms','district','price','area','developer','completion-year','dvukhkomnatnye','s-gazom','odnokomnatnye']) THEN
		RAISE EXCEPTION 'District slug collides with reserved facet namespace: %', NEW."slug";
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "districts_slug_guard" BEFORE INSERT OR UPDATE OF "slug" ON "districts" FOR EACH ROW EXECUTE FUNCTION "district_slug_guard"();

CREATE OR REPLACE FUNCTION "cities_agglomeration_guard"() RETURNS trigger AS $$
DECLARE
	parent_region_id integer;
	cycle_found boolean;
BEGIN
	IF NEW."agglomeration_of_id" IS NULL THEN
		RETURN NEW;
	END IF;
	IF NEW."agglomeration_of_id" = NEW."id" THEN
		RAISE EXCEPTION 'City cannot be its own agglomeration parent';
	END IF;
	SELECT "region_id" INTO parent_region_id FROM "cities" WHERE "id" = NEW."agglomeration_of_id";
	IF parent_region_id IS NULL OR parent_region_id <> NEW."region_id" THEN
		RAISE EXCEPTION 'Agglomeration parent must belong to the same region';
	END IF;
	WITH RECURSIVE ancestors AS (
		SELECT "id", "agglomeration_of_id" FROM "cities" WHERE "id" = NEW."agglomeration_of_id"
		UNION ALL
		SELECT city."id", city."agglomeration_of_id"
		FROM "cities" city
		JOIN ancestors parent ON city."id" = parent."agglomeration_of_id"
	)
	SELECT EXISTS (SELECT 1 FROM ancestors WHERE "id" = NEW."id") INTO cycle_found;
	IF cycle_found THEN
		RAISE EXCEPTION 'City agglomeration hierarchy contains a cycle';
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "cities_agglomeration_guard" BEFORE INSERT OR UPDATE OF "region_id", "agglomeration_of_id" ON "cities" FOR EACH ROW EXECUTE FUNCTION "cities_agglomeration_guard"();

CREATE OR REPLACE FUNCTION "districts_parent_guard"() RETURNS trigger AS $$
DECLARE
	parent_city_id integer;
	cycle_found boolean;
BEGIN
	IF NEW."parent_id" IS NULL THEN
		RETURN NEW;
	END IF;
	IF NEW."parent_id" = NEW."id" THEN
		RAISE EXCEPTION 'District cannot be its own parent';
	END IF;
	SELECT "city_id" INTO parent_city_id FROM "districts" WHERE "id" = NEW."parent_id";
	IF parent_city_id IS NULL OR parent_city_id <> NEW."city_id" THEN
		RAISE EXCEPTION 'District parent must belong to the same city';
	END IF;
	WITH RECURSIVE ancestors AS (
		SELECT "id", "parent_id" FROM "districts" WHERE "id" = NEW."parent_id"
		UNION ALL
		SELECT district."id", district."parent_id"
		FROM "districts" district
		JOIN ancestors parent ON district."id" = parent."parent_id"
	)
	SELECT EXISTS (SELECT 1 FROM ancestors WHERE "id" = NEW."id") INTO cycle_found;
	IF cycle_found THEN
		RAISE EXCEPTION 'District hierarchy contains a cycle';
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "districts_parent_guard" BEFORE INSERT OR UPDATE OF "city_id", "parent_id" ON "districts" FOR EACH ROW EXECUTE FUNCTION "districts_parent_guard"();
`;

export const geoHierarchyDownSql = `
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_regions_fk";
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_cities_fk";
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_districts_fk";
DROP INDEX "payload_locked_documents_rels_regions_id_idx";
DROP INDEX "payload_locked_documents_rels_cities_id_idx";
DROP INDEX "payload_locked_documents_rels_districts_id_idx";
ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "regions_id";
ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "cities_id";
ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "districts_id";
DROP TABLE "districts" CASCADE;
DROP TABLE "districts_synonyms" CASCADE;
DROP TABLE "cities" CASCADE;
DROP TABLE "regions" CASCADE;
DROP FUNCTION IF EXISTS "cities_agglomeration_guard"();
DROP FUNCTION IF EXISTS "districts_parent_guard"();
DROP FUNCTION IF EXISTS "district_slug_guard"();
DROP FUNCTION IF EXISTS "geo_root_slug_guard"();
DROP FUNCTION IF EXISTS "geo_prevent_published_slug_change"();
DROP TYPE "enum_districts_status";
DROP TYPE "enum_districts_preposition";
DROP TYPE "enum_districts_district_type";
DROP TYPE "enum_cities_status";
DROP TYPE "enum_cities_city_type";
DROP TYPE "enum_cities_preposition";
DROP TYPE "enum_regions_status";
`;

export async function up({ db }: MigrateUpArgs): Promise<void> {
	await db.execute(sql.raw(geoHierarchyUpSql));
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
	await db.execute(sql.raw(geoHierarchyDownSql));
}
