import {
	type MigrateDownArgs,
	type MigrateUpArgs,
	sql,
} from "@payloadcms/db-postgres";
import {
	propertyNumericInvariantsDownSql,
	propertyNumericInvariantsUpSql,
} from "../src/core/data-access/system/sql/property-numeric-invariants.ts";

export async function up({ db }: MigrateUpArgs): Promise<void> {
	await db.execute(sql.raw(propertyNumericInvariantsUpSql));
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
	await db.execute(sql.raw(propertyNumericInvariantsDownSql));
}
