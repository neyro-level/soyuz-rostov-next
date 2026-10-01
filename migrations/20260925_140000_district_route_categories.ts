import {
	type MigrateDownArgs,
	type MigrateUpArgs,
	sql,
} from "@payloadcms/db-postgres";

export const districtRouteCategoriesUpSql = `
CREATE TYPE "public"."enum_districts_categories" AS ENUM(
	'kvartiry',
	'doma',
	'uchastki',
	'kommercheskaya-nedvizhimost',
	'komnaty',
	'garazhi',
	'arenda',
	'novostroyki',
	'kottedzhnye-poselki'
);

CREATE TABLE "districts_categories" (
	"order" integer NOT NULL,
	"parent_id" integer NOT NULL,
	"value" "enum_districts_categories" NOT NULL,
	"id" serial PRIMARY KEY NOT NULL
);

ALTER TABLE "districts_categories"
	ADD CONSTRAINT "districts_categories_parent_fk"
	FOREIGN KEY ("parent_id") REFERENCES "public"."districts"("id")
	ON DELETE cascade ON UPDATE no action;

CREATE INDEX "districts_categories_order_idx"
	ON "districts_categories" USING btree ("order");
CREATE INDEX "districts_categories_parent_idx"
	ON "districts_categories" USING btree ("parent_id");
CREATE UNIQUE INDEX "districts_categories_parent_value_unique_idx"
	ON "districts_categories" USING btree ("parent_id", "value");

INSERT INTO "districts_categories" ("order", "parent_id", "value")
SELECT category.ordinality - 1, district.id, category.value::"enum_districts_categories"
FROM "districts" district
CROSS JOIN unnest(ARRAY[
	'kvartiry',
	'doma',
	'uchastki',
	'kommercheskaya-nedvizhimost',
	'komnaty',
	'garazhi',
	'arenda',
	'novostroyki',
	'kottedzhnye-poselki'
]) WITH ORDINALITY AS category(value, ordinality);

CREATE OR REPLACE FUNCTION "district_slug_guard"() RETURNS trigger AS $$
BEGIN

	IF NEW."slug" = ANY(ARRAY[
		'_next','admin','api','journal','legal','media','poisk','robots.txt',
		'sotrudniki','komplex','sitemap.xml','sitemap','search',
		'kvartiry','doma','uchastki','kommercheskaya-nedvizhimost','komnaty',
		'garazhi','arenda','novostroyki','kottedzhnye-poselki','zastroyshchiki',
		'nedvizhimost','uslugi','o-kompanii','ipoteka','prodat','sdat','kontakty',
		'politika-konfidencialnosti','soglasie-na-obrabotku-personalnyh-dannyh',
		'dvukhkomnatnye','odnokomnatnye'
	]) THEN
		RAISE EXCEPTION 'District slug collides with reserved public subslug: %', NEW."slug";
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`;

export const districtRouteCategoriesDownSql = `
CREATE OR REPLACE FUNCTION "district_slug_guard"() RETURNS trigger AS $$
BEGIN
	IF NEW."slug" = ANY(ARRAY['rooms','district','price','area','developer','completion-year','dvukhkomnatnye','s-gazom','odnokomnatnye']) THEN
		RAISE EXCEPTION 'District slug collides with reserved facet namespace: %', NEW."slug";
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TABLE "districts_categories" CASCADE;
DROP TYPE "public"."enum_districts_categories";
`;

export async function up({ db }: MigrateUpArgs): Promise<void> {
	await db.execute(sql.raw(districtRouteCategoriesUpSql));
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
	await db.execute(sql.raw(districtRouteCategoriesDownSql));
}
