import {
	type MigrateDownArgs,
	type MigrateUpArgs,
	sql,
} from "@payloadcms/db-postgres";

export const siteSettingsUpSql = `
CREATE TABLE "site_settings_social_links" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"id" varchar PRIMARY KEY NOT NULL,
	"label" varchar NOT NULL,
	"url" varchar NOT NULL
);

CREATE TABLE "site_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_name" varchar NOT NULL,
	"legal_name" varchar,
	"logo_id" integer,
	"phone" varchar NOT NULL,
	"email" varchar,
	"address" varchar,
	"working_hours" varchar,
	"telegram" varchar,
	"whatsapp" varchar,
	"requisites_inn" varchar,
	"requisites_kpp" varchar,
	"requisites_ogrn" varchar,
	"requisites_legal_address" varchar,
	"coordinates_latitude" numeric,
	"coordinates_longitude" numeric,
	"updated_at" timestamp(3) with time zone,
	"created_at" timestamp(3) with time zone
);

ALTER TABLE "site_settings_social_links" ADD CONSTRAINT "site_settings_social_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
CREATE INDEX "site_settings_social_links_order_idx" ON "site_settings_social_links" USING btree ("_order");
CREATE INDEX "site_settings_social_links_parent_id_idx" ON "site_settings_social_links" USING btree ("_parent_id");
CREATE INDEX "site_settings_logo_idx" ON "site_settings" USING btree ("logo_id");
`;

export const siteSettingsDownSql = `
DROP TABLE "site_settings_social_links" CASCADE;
DROP TABLE "site_settings" CASCADE;
`;

export async function up({ db }: MigrateUpArgs): Promise<void> {
	await db.execute(sql.raw(siteSettingsUpSql));
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
	await db.execute(sql.raw(siteSettingsDownSql));
}
