import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export const developmentExcelUpSql = `
CREATE TYPE "public"."enum_import_runs_source_kind" AS ENUM('yrl-feed', 'excel-developments');
ALTER TABLE "import_runs" ADD COLUMN "source_kind" "enum_import_runs_source_kind" DEFAULT 'yrl-feed' NOT NULL;
ALTER TABLE "import_runs" ALTER COLUMN "feed_source_id" DROP NOT NULL;
ALTER TABLE "import_runs" ADD COLUMN "excel_source_key" varchar;
ALTER TABLE "import_runs" ADD COLUMN "source_file_name" varchar;
ALTER TABLE "import_runs" ADD COLUMN "evidence" jsonb;
ALTER TABLE "import_runs" ADD CONSTRAINT "import_runs_source_identity_guard" CHECK (
  (source_kind = 'yrl-feed' AND feed_source_id IS NOT NULL AND excel_source_key IS NULL)
  OR (source_kind = 'excel-developments' AND feed_source_id IS NULL AND excel_source_key IS NOT NULL)
);
CREATE INDEX "import_runs_source_kind_idx" ON "import_runs" ("source_kind");
CREATE INDEX "import_runs_excel_source_key_idx" ON "import_runs" ("excel_source_key");

ALTER TABLE "developers" ADD COLUMN "last_import_run_id" integer;
ALTER TABLE "developments" ADD COLUMN "last_import_run_id" integer;
ALTER TABLE "developers" ADD CONSTRAINT "developers_last_import_run_id_import_runs_id_fk" FOREIGN KEY ("last_import_run_id") REFERENCES "import_runs"("id") ON DELETE set null;
ALTER TABLE "developments" ADD CONSTRAINT "developments_last_import_run_id_import_runs_id_fk" FOREIGN KEY ("last_import_run_id") REFERENCES "import_runs"("id") ON DELETE set null;
CREATE INDEX "developers_last_import_run_idx" ON "developers" ("last_import_run_id");
CREATE INDEX "developments_last_import_run_idx" ON "developments" ("last_import_run_id");

ALTER TABLE "import_issues" ADD COLUMN "developer_id" integer;
ALTER TABLE "import_issues" ADD COLUMN "development_id" integer;
ALTER TABLE "import_issues" ADD COLUMN "source_sheet" varchar;
ALTER TABLE "import_issues" ADD COLUMN "source_row" numeric;
ALTER TABLE "import_issues" ADD CONSTRAINT "import_issues_developer_id_developers_id_fk" FOREIGN KEY ("developer_id") REFERENCES "developers"("id") ON DELETE set null;
ALTER TABLE "import_issues" ADD CONSTRAINT "import_issues_development_id_developments_id_fk" FOREIGN KEY ("development_id") REFERENCES "developments"("id") ON DELETE set null;
CREATE INDEX "import_issues_developer_idx" ON "import_issues" ("developer_id");
CREATE INDEX "import_issues_development_idx" ON "import_issues" ("development_id");
`;

export const developmentExcelDownSql = `
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "import_runs" WHERE "source_kind" = 'excel-developments') THEN
    RAISE EXCEPTION 'development Excel provenance exists; disable importer and recover/forward-fix instead of migrating down';
  END IF;
END $$;
DROP INDEX "import_issues_development_idx";
DROP INDEX "import_issues_developer_idx";
ALTER TABLE "import_issues" DROP CONSTRAINT "import_issues_development_id_developments_id_fk";
ALTER TABLE "import_issues" DROP CONSTRAINT "import_issues_developer_id_developers_id_fk";
ALTER TABLE "import_issues" DROP COLUMN "source_row";
ALTER TABLE "import_issues" DROP COLUMN "source_sheet";
ALTER TABLE "import_issues" DROP COLUMN "development_id";
ALTER TABLE "import_issues" DROP COLUMN "developer_id";
DROP INDEX "developments_last_import_run_idx";
DROP INDEX "developers_last_import_run_idx";
ALTER TABLE "developments" DROP CONSTRAINT "developments_last_import_run_id_import_runs_id_fk";
ALTER TABLE "developers" DROP CONSTRAINT "developers_last_import_run_id_import_runs_id_fk";
ALTER TABLE "developments" DROP COLUMN "last_import_run_id";
ALTER TABLE "developers" DROP COLUMN "last_import_run_id";
DROP INDEX "import_runs_excel_source_key_idx";
DROP INDEX "import_runs_source_kind_idx";
ALTER TABLE "import_runs" DROP CONSTRAINT "import_runs_source_identity_guard";
ALTER TABLE "import_runs" DROP COLUMN "evidence";
ALTER TABLE "import_runs" DROP COLUMN "source_file_name";
ALTER TABLE "import_runs" DROP COLUMN "excel_source_key";
ALTER TABLE "import_runs" ALTER COLUMN "feed_source_id" SET NOT NULL;
ALTER TABLE "import_runs" DROP COLUMN "source_kind";
DROP TYPE "enum_import_runs_source_kind";
`;

export async function up({ db }: MigrateUpArgs): Promise<void> {
	await db.execute(sql.raw(developmentExcelUpSql));
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
	await db.execute(sql.raw(developmentExcelDownSql));
}
