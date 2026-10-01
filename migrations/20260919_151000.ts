import {
	type MigrateDownArgs,
	type MigrateUpArgs,
	sql,
} from "@payloadcms/db-postgres";

export const leadDeliveryRelationalContractUpSql = `
	DO $$
	BEGIN
		IF EXISTS (SELECT 1 FROM "lead_deliveries" WHERE "lead_id" IS NULL) THEN
			RAISE EXCEPTION 'lead_deliveries contains rows without a lead; relational retention migration stopped';
		END IF;
	END $$;

	ALTER TABLE "lead_deliveries"
		DROP CONSTRAINT "lead_deliveries_lead_id_leads_id_fk";

	ALTER TABLE "lead_deliveries"
		ALTER COLUMN "lead_id" SET NOT NULL;

	ALTER TABLE "lead_deliveries"
		ADD CONSTRAINT "lead_deliveries_lead_id_leads_id_fk"
		FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id")
		ON DELETE cascade ON UPDATE no action;
`;

export const leadDeliveryRelationalContractDownSql = `
	ALTER TABLE "lead_deliveries"
		DROP CONSTRAINT "lead_deliveries_lead_id_leads_id_fk";

	ALTER TABLE "lead_deliveries"
		ALTER COLUMN "lead_id" DROP NOT NULL;

	ALTER TABLE "lead_deliveries"
		ADD CONSTRAINT "lead_deliveries_lead_id_leads_id_fk"
		FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id")
		ON DELETE set null ON UPDATE no action;
`;

export async function up({ db }: MigrateUpArgs): Promise<void> {
	await db.execute(sql.raw(leadDeliveryRelationalContractUpSql));
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
	await db.execute(sql.raw(leadDeliveryRelationalContractDownSql));
}
