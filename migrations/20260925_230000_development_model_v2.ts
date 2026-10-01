import {
	type MigrateDownArgs,
	type MigrateUpArgs,
	sql,
} from "@payloadcms/db-postgres";

export const developmentModelV2UpSql = `
CREATE TYPE "public"."enum_developments_sales_availability" AS ENUM('in_inventory', 'confirmed', 'none');
ALTER TABLE "developments" ADD COLUMN "sales_availability" "enum_developments_sales_availability";
ALTER TABLE "developments" ADD COLUMN "district_raw" varchar;
ALTER TABLE "developments" ADD COLUMN "completeness_score" numeric DEFAULT 0 NOT NULL;

UPDATE "developments"
SET "sales_availability" = CASE "sales_status"::text
  WHEN 'available' THEN 'confirmed'::"enum_developments_sales_availability"
  WHEN 'limited' THEN 'in_inventory'::"enum_developments_sales_availability"
  WHEN 'sold_out' THEN 'none'::"enum_developments_sales_availability"
  WHEN 'paused' THEN 'none'::"enum_developments_sales_availability"
  ELSE 'none'::"enum_developments_sales_availability"
END;
ALTER TABLE "developments" ALTER COLUMN "sales_availability" SET NOT NULL;

ALTER TYPE "public"."enum_developments_sales_status" RENAME TO "enum_developments_sales_status_legacy_v1";
CREATE TYPE "public"."enum_developments_sales_status" AS ENUM('on_sale', 'sales_finished', 'completed');
ALTER TABLE "developments" ALTER COLUMN "sales_status" TYPE "enum_developments_sales_status"
USING CASE "sales_status"::text
  WHEN 'available' THEN 'on_sale'::"enum_developments_sales_status"
  WHEN 'limited' THEN 'on_sale'::"enum_developments_sales_status"
  WHEN 'sold_out' THEN 'sales_finished'::"enum_developments_sales_status"
  WHEN 'paused' THEN 'sales_finished'::"enum_developments_sales_status"
  ELSE 'sales_finished'::"enum_developments_sales_status"
END;
ALTER TABLE "developments" ALTER COLUMN "sales_status" SET NOT NULL;

CREATE TABLE "developments_price_by_rooms" (
  "_order" integer NOT NULL,
  "_parent_id" integer NOT NULL,
  "id" varchar PRIMARY KEY NOT NULL,
  "rooms_label" varchar NOT NULL,
  "price_from_minor" numeric NOT NULL,
  "price_to_minor" numeric,
  "lots_available" numeric,
  "price_checked_at" timestamp(3) with time zone NOT NULL,
  "source" varchar NOT NULL
);
ALTER TABLE "developments_price_by_rooms" ADD CONSTRAINT "developments_price_by_rooms_parent_id_fk"
  FOREIGN KEY ("_parent_id") REFERENCES "developments"("id") ON DELETE cascade;
CREATE INDEX "developments_price_by_rooms_order_idx" ON "developments_price_by_rooms" ("_order");
CREATE INDEX "developments_price_by_rooms_parent_id_idx" ON "developments_price_by_rooms" ("_parent_id");
INSERT INTO "developments_price_by_rooms" (
  "_order", "_parent_id", "id", "rooms_label", "price_from_minor", "price_to_minor",
  "lots_available", "price_checked_at", "source"
)
SELECT "_order", "_parent_id", "id", "label", "amount_minor", "amount_minor", NULL, "checked_at", "source"
FROM "developments_prices";

ALTER TYPE "public"."enum_developments_media_items_media_type" RENAME TO "enum_developments_media_items_media_type_legacy_v1";
CREATE TYPE "public"."enum_developments_media_items_media_type" AS ENUM(
  'hero', 'gallery', 'layout', 'construction_progress', 'document', 'video'
);
ALTER TABLE "developments_media_items" ALTER COLUMN "media_type" TYPE "enum_developments_media_items_media_type"
USING CASE "media_type"::text
  WHEN 'image' THEN 'gallery'::"enum_developments_media_items_media_type"
  WHEN 'plan' THEN 'layout'::"enum_developments_media_items_media_type"
  WHEN 'document' THEN 'document'::"enum_developments_media_items_media_type"
  ELSE 'gallery'::"enum_developments_media_items_media_type"
END;
ALTER TABLE "developments_media_items" ADD COLUMN "captured_at" timestamp(3) with time zone;

UPDATE "developments" d
SET "completeness_score" = (
  (CASE WHEN d."name" IS NOT NULL AND d."slug" IS NOT NULL AND d."kind" IS NOT NULL THEN 10 ELSE 0 END) +
  (CASE WHEN d."region_id" IS NOT NULL AND d."city_id" IS NOT NULL THEN 10 ELSE 0 END) +
  (CASE WHEN d."district_id" IS NOT NULL OR NULLIF(d."district_raw", '') IS NOT NULL THEN 10 ELSE 0 END) +
  (CASE WHEN d."developer_id" IS NOT NULL THEN 10 ELSE 0 END) +
  (CASE WHEN NULLIF(d."address", '') IS NOT NULL OR (d."coordinates_latitude" IS NOT NULL AND d."coordinates_longitude" IS NOT NULL) THEN 10 ELSE 0 END) +
  (CASE WHEN d."sales_status" IS NOT NULL AND d."sales_availability" IS NOT NULL THEN 10 ELSE 0 END) +
  (CASE WHEN EXISTS (SELECT 1 FROM "developments_price_by_rooms" p WHERE p."_parent_id" = d."id") THEN 10 ELSE 0 END) +
  (CASE WHEN EXISTS (SELECT 1 FROM "developments_media_items" m WHERE m."_parent_id" = d."id") THEN 10 ELSE 0 END) +
  (CASE WHEN EXISTS (SELECT 1 FROM "developments_descriptions" x WHERE x."_parent_id" = d."id") THEN 10 ELSE 0 END) +
  (CASE WHEN NULLIF(d."completion", '') IS NOT NULL OR d."deadline" IS NOT NULL THEN 10 ELSE 0 END)
);
`;

export const developmentModelV2DownSql = `
ALTER TABLE "developments_media_items" DROP COLUMN "captured_at";
ALTER TYPE "public"."enum_developments_media_items_media_type" RENAME TO "enum_developments_media_items_media_type_v2";
ALTER TYPE "public"."enum_developments_media_items_media_type_legacy_v1" RENAME TO "enum_developments_media_items_media_type";
ALTER TABLE "developments_media_items" ALTER COLUMN "media_type" TYPE "enum_developments_media_items_media_type"
USING CASE "media_type"::text
  WHEN 'layout' THEN 'plan'::"enum_developments_media_items_media_type"
  WHEN 'document' THEN 'document'::"enum_developments_media_items_media_type"
  ELSE 'image'::"enum_developments_media_items_media_type"
END;
DROP TYPE "public"."enum_developments_media_items_media_type_v2";

DROP TABLE "developments_price_by_rooms";

ALTER TYPE "public"."enum_developments_sales_status" RENAME TO "enum_developments_sales_status_v2";
ALTER TYPE "public"."enum_developments_sales_status_legacy_v1" RENAME TO "enum_developments_sales_status";
ALTER TABLE "developments" ALTER COLUMN "sales_status" DROP NOT NULL;
ALTER TABLE "developments" ALTER COLUMN "sales_status" TYPE "enum_developments_sales_status"
USING CASE "sales_status"::text
  WHEN 'on_sale' THEN 'available'::"enum_developments_sales_status"
  WHEN 'sales_finished' THEN 'sold_out'::"enum_developments_sales_status"
  WHEN 'completed' THEN 'sold_out'::"enum_developments_sales_status"
  ELSE 'paused'::"enum_developments_sales_status"
END;
DROP TYPE "public"."enum_developments_sales_status_v2";

ALTER TABLE "developments" DROP COLUMN "sales_availability";
ALTER TABLE "developments" DROP COLUMN "district_raw";
ALTER TABLE "developments" DROP COLUMN "completeness_score";
DROP TYPE "public"."enum_developments_sales_availability";
`;

export async function up({ db }: MigrateUpArgs): Promise<void> {
	await db.execute(sql.raw(developmentModelV2UpSql));
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
	await db.execute(sql.raw(developmentModelV2DownSql));
}
