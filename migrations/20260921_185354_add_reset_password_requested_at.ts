import {
	type MigrateDownArgs,
	type MigrateUpArgs,
	sql,
} from "@payloadcms/db-postgres";

export const payloadAuthSecurityUpSql = `
	ALTER TABLE "properties_images"
		DROP CONSTRAINT "properties_images_media_id_media_id_fk";

	ALTER TABLE "users"
		ADD COLUMN "reset_password_requested_at" timestamp(3) with time zone;

	ALTER TABLE "properties_images"
		ADD CONSTRAINT "properties_images_media_id_media_id_fk"
		FOREIGN KEY ("media_id") REFERENCES "public"."media"("id")
		ON DELETE set null ON UPDATE no action;
`;

export const payloadAuthSecurityDownSql = `
	ALTER TABLE "properties_images"
		DROP CONSTRAINT "properties_images_media_id_media_id_fk";

	ALTER TABLE "properties_images"
		ADD CONSTRAINT "properties_images_media_id_media_id_fk"
		FOREIGN KEY ("media_id") REFERENCES "public"."media"("id")
		ON DELETE cascade ON UPDATE no action;

	ALTER TABLE "users" DROP COLUMN "reset_password_requested_at";
`;

export async function up({ db }: MigrateUpArgs): Promise<void> {
	await db.execute(sql.raw(payloadAuthSecurityUpSql));
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
	await db.execute(sql.raw(payloadAuthSecurityDownSql));
}
