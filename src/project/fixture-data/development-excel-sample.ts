import {
	createDevelopmentWorkbook,
	generateDevelopmentExcelTemplate,
} from "../../core/ingest/development-excel.ts";
import { starterFixtureDataset } from "./starter-dataset.ts";

export async function generateStarterDevelopmentExcelSample(): Promise<Buffer> {
	const workbook = await createDevelopmentWorkbook();
	await workbook.xlsx.load((await generateDevelopmentExcelTemplate()) as never);
	const checkedAt = starterFixtureDataset.identity.snapshotAt;
	for (const developer of starterFixtureDataset.developers) {
		workbook
			.getWorksheet("Застройщики")
			?.addRow([
				developer.slug,
				developer.name,
				"",
				developer.legalName,
				"",
				`Синтетический застройщик ${developer.name}.`,
				"draft",
				checkedAt,
			]);
	}
	for (const development of starterFixtureDataset.developments) {
		workbook
			.getWorksheet("ЖК")
			?.addRow([
				development.externalId,
				development.developerSlug,
				development.name,
				development.slug,
				development.kind,
				starterFixtureDataset.region.slug,
				development.citySlug,
				development.districtSlug,
				development.districtSlug,
				development.address,
				"",
				"",
				"fixture",
				"fixture",
				"2027-12-31T00:00:00.000Z",
				"on_sale",
				"confirmed",
				development.dataTier,
				"draft",
				checkedAt,
			]);
		workbook
			.getWorksheet("Цены")
			?.addRow([
				development.externalId,
				"1-комнатные",
				String(development.priceMinor),
				String(development.priceMinor),
				"1",
				checkedAt,
			]);
		workbook
			.getWorksheet("Тексты")
			?.addRow([
				development.externalId,
				"short",
				`Синтетическое описание ${development.name}.`,
				checkedAt,
			]);
	}
	return Buffer.from(await workbook.xlsx.writeBuffer());
}
