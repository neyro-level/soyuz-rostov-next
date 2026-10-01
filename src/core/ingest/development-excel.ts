import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import type { Workbook } from "@excel.js/exceljs";

const MAX_WORKBOOK_BYTES = 10 * 1024 * 1024;
const MAX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024;
const MAX_ROWS_PER_SHEET = 5_000;
const sourcePrefix = "excel-developments";

export const developmentExcelSheets = [
	"Застройщики",
	"ЖК",
	"Цены",
	"Медиа",
	"Тексты",
] as const;

type SheetName = (typeof developmentExcelSheets)[number];
type Row = Record<string, string> & { __row: string };

const sheetHeaders: Record<SheetName, readonly string[]> = {
	Застройщики: [
		"slug",
		"name",
		"aliases",
		"legalName",
		"siteUrl",
		"description",
		"status",
		"checkedAt",
	],
	ЖК: [
		"externalId",
		"developerSlug",
		"name",
		"slug",
		"kind",
		"regionSlug",
		"citySlug",
		"districtSlug",
		"districtRaw",
		"address",
		"latitude",
		"longitude",
		"class",
		"completion",
		"deadline",
		"salesStatus",
		"salesAvailability",
		"dataTier",
		"status",
		"checkedAt",
	],
	Цены: [
		"developmentExternalId",
		"roomsLabel",
		"priceFromMinor",
		"priceToMinor",
		"lotsAvailable",
		"priceCheckedAt",
	],
	Медиа: [
		"developmentExternalId",
		"mediaId",
		"mediaType",
		"rights",
		"capturedAt",
		"checkedAt",
	],
	Тексты: ["developmentExternalId", "kind", "text", "checkedAt"],
};

export type DevelopmentExcelIssue = {
	severity: "warning" | "error";
	code: string;
	message: string;
	sheet: SheetName;
	row: number;
	field?: string;
};

export type DevelopmentExcelReport = {
	mode: "dry-run" | "apply";
	workbookSha256: string;
	created: number;
	changed: number;
	unchanged: number;
	errors: number;
	warnings: number;
	collisions: number;
	issues: DevelopmentExcelIssue[];
};

type DeveloperInput = {
	slug: string;
	name: string;
	aliases?: Array<{ value: string }>;
	legalName?: string;
	siteUrl?: string;
	description?: string;
	status: "draft" | "published" | "archived";
	source: string;
	checkedAt: string;
	lastImportRun?: number;
};

type DevelopmentInput = Record<string, unknown> & {
	externalIdentities: Array<{ source: string; externalId: string }>;
	lastImportRun?: number;
};

type Inspection = {
	id?: string | number;
	state: "new" | "changed" | "unchanged";
	collision?: boolean;
	publishedSlugMutation?: boolean;
};

export type DevelopmentExcelRepository = {
	inspectDeveloper(input: DeveloperInput): Promise<Inspection>;
	inspectDevelopment(input: {
		sourceKey: string;
		externalId: string;
		data: DevelopmentInput;
	}): Promise<Inspection>;
	resolveGeo(input: {
		regionSlug: string;
		citySlug: string;
		districtSlug?: string;
	}): Promise<
		| {
				region: string | number;
				city: string | number;
				district?: string | number;
		  }
		| undefined
	>;
	mediaExists(id: string): Promise<boolean>;
	createImportRun(input: {
		sourceKey: string;
		fileName: string;
		workbookSha256: string;
		now: string;
	}): Promise<number>;
	upsertDeveloper(
		id: string | number | undefined,
		input: DeveloperInput,
	): Promise<string | number>;
	upsertDevelopment(
		id: string | number | undefined,
		input: DevelopmentInput,
	): Promise<string | number>;
	recordIssue(importRunId: number, issue: DevelopmentExcelIssue): Promise<void>;
	finishImportRun(input: {
		id: number;
		status: "success" | "unchanged" | "failed";
		report: DevelopmentExcelReport;
		now: string;
	}): Promise<void>;
};

function valueAsString(value: unknown): string {
	if (value == null) return "";
	if (value instanceof Date) return value.toISOString();
	if (typeof value === "object") {
		if ("formula" in value) throw new Error("Formula cells are not allowed.");
		if ("richText" in value && Array.isArray(value.richText)) {
			return value.richText
				.map((part) => String(part.text ?? ""))
				.join("")
				.trim();
		}
		if ("text" in value) return String(value.text).trim();
	}
	return String(value).trim();
}

function assertSafeXlsxArchive(buffer: Buffer): void {
	let eocd = -1;
	for (
		let offset = buffer.length - 22;
		offset >= Math.max(0, buffer.length - 65_557);
		offset -= 1
	) {
		if (buffer.readUInt32LE(offset) === 0x06054b50) {
			eocd = offset;
			break;
		}
	}
	if (eocd < 0)
		throw new Error("Workbook is not a valid bounded XLSX archive.");
	if (
		buffer.readUInt16LE(eocd + 4) !== 0 ||
		buffer.readUInt16LE(eocd + 6) !== 0
	) {
		throw new Error("Multi-disk workbook archives are not accepted.");
	}
	const entries = buffer.readUInt16LE(eocd + 10);
	const centralSize = buffer.readUInt32LE(eocd + 12);
	let offset = buffer.readUInt32LE(eocd + 16);
	const centralEnd = offset + centralSize;
	if (entries > 1_000 || offset + centralSize > buffer.length) {
		throw new Error("Workbook ZIP directory exceeds safety bounds.");
	}
	let totalUncompressed = 0;
	for (let index = 0; index < entries; index += 1) {
		if (
			offset + 46 > buffer.length ||
			buffer.readUInt32LE(offset) !== 0x02014b50
		) {
			throw new Error("Workbook ZIP directory is malformed.");
		}
		const flags = buffer.readUInt16LE(offset + 8);
		const compressed = buffer.readUInt32LE(offset + 20);
		const uncompressed = buffer.readUInt32LE(offset + 24);
		if (
			(flags & 1) !== 0 ||
			compressed === 0xffffffff ||
			uncompressed === 0xffffffff
		) {
			throw new Error("Encrypted and ZIP64 workbook entries are not accepted.");
		}
		totalUncompressed += uncompressed;
		if (
			uncompressed > 20 * 1024 * 1024 ||
			totalUncompressed > MAX_UNCOMPRESSED_BYTES ||
			(uncompressed > 1024 * 1024 &&
				uncompressed / Math.max(1, compressed) > 200)
		) {
			throw new Error("Workbook decompression exceeds safety bounds.");
		}
		const fileNameLength = buffer.readUInt16LE(offset + 28);
		const extraLength = buffer.readUInt16LE(offset + 30);
		const commentLength = buffer.readUInt16LE(offset + 32);
		offset += 46 + fileNameLength + extraLength + commentLength;
	}
	if (offset !== centralEnd)
		throw new Error("Workbook ZIP directory size is inconsistent.");
}

export async function createDevelopmentWorkbook(): Promise<Workbook> {
	const require = createRequire(import.meta.url);
	const module = require("@excel.js/exceljs") as {
		default?: { Workbook?: new () => Workbook };
	};
	const Constructor = module.default?.Workbook;
	if (!Constructor)
		throw new Error("Excel workbook constructor is unavailable.");
	return new Constructor();
}

function parseRows(workbook: Workbook, sheet: SheetName): Row[] {
	const worksheet = workbook.getWorksheet(sheet);
	if (!worksheet) throw new Error(`Required sheet is missing: ${sheet}`);
	if (worksheet.rowCount > MAX_ROWS_PER_SHEET + 1) {
		throw new Error(`${sheet} exceeds ${MAX_ROWS_PER_SHEET} data rows.`);
	}
	const expected = sheetHeaders[sheet];
	const actual = expected.map((_, index) =>
		valueAsString(worksheet.getRow(1).getCell(index + 1).value),
	);
	if (actual.join("|") !== expected.join("|")) {
		throw new Error(
			`${sheet} header mismatch. Expected: ${expected.join(", ")}`,
		);
	}
	const rows: Row[] = [];
	for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
		const values = Object.fromEntries(
			expected.map((header, index) => [
				header,
				valueAsString(worksheet.getRow(rowNumber).getCell(index + 1).value),
			]),
		) as Record<string, string>;
		if (Object.values(values).every((value) => value === "")) continue;
		rows.push({ ...values, __row: String(rowNumber) });
	}
	return rows;
}

function isSlug(value: string): boolean {
	return (
		/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) &&
		!value.startsWith("zhk-") &&
		!value.startsWith("kp-")
	);
}

function isDate(value: string): boolean {
	return value !== "" && !Number.isNaN(Date.parse(value));
}

function numberOrUndefined(value: string): number | undefined {
	if (!value) return undefined;
	const result = Number(value);
	return Number.isFinite(result) ? result : undefined;
}

function splitList(value: string): Array<{ value: string }> | undefined {
	const values = value
		.split("|")
		.map((item) => item.trim())
		.filter(Boolean);
	return values.length ? values.map((item) => ({ value: item })) : undefined;
}

function addIssue(
	report: DevelopmentExcelReport,
	issue: DevelopmentExcelIssue,
): void {
	report.issues.push(issue);
	if (issue.severity === "error") report.errors += 1;
	else report.warnings += 1;
	if (issue.code === "slug_collision") report.collisions += 1;
}

function required(
	report: DevelopmentExcelReport,
	row: Row,
	sheet: SheetName,
	fields: string[],
): boolean {
	let valid = true;
	for (const field of fields) {
		if (!row[field]) {
			valid = false;
			addIssue(report, {
				severity: "error",
				code: "required",
				message: `${field} is required.`,
				sheet,
				row: Number(row.__row),
				field,
			});
		}
	}
	return valid;
}

export async function readDevelopmentWorkbook(
	buffer: Buffer,
): Promise<Record<SheetName, Row[]>> {
	if (buffer.byteLength > MAX_WORKBOOK_BYTES) {
		throw new Error(`Workbook exceeds ${MAX_WORKBOOK_BYTES} bytes.`);
	}
	assertSafeXlsxArchive(buffer);
	const workbook = await createDevelopmentWorkbook();
	await workbook.xlsx.load(buffer as never);
	return Object.fromEntries(
		developmentExcelSheets.map((sheet) => [sheet, parseRows(workbook, sheet)]),
	) as Record<SheetName, Row[]>;
}

export async function generateDevelopmentExcelTemplate(): Promise<Buffer> {
	const workbook = await createDevelopmentWorkbook();
	workbook.creator = "AMS Realty Baza";
	for (const sheet of developmentExcelSheets) {
		const worksheet = workbook.addWorksheet(sheet, {
			views: [{ state: "frozen", ySplit: 1 }],
		});
		worksheet.addRow([...sheetHeaders[sheet]]);
		worksheet.getRow(1).font = { bold: true };
		worksheet.getRow(1).alignment = { vertical: "middle", wrapText: true };
		worksheet.columns = sheetHeaders[sheet].map((header) => ({
			key: header,
			width: Math.max(16, header.length + 3),
		}));
		const enumByHeader: Record<string, string[]> = {
			status: ["draft", "published", "archived"],
			kind: ["residential_complex", "cottage_village"],
			salesStatus: ["on_sale", "sales_finished", "completed"],
			salesAvailability: ["in_inventory", "confirmed", "none"],
			dataTier: ["A", "B", "C"],
			currency: ["RUB"],
			mediaType: [
				"hero",
				"gallery",
				"layout",
				"construction_progress",
				"document",
				"video",
			],
		};
		for (const [index, header] of sheetHeaders[sheet].entries()) {
			worksheet
				.getRow(1)
				.getCell(
					index + 1,
				).note = `Column ${header}. Dates use ISO 8601. aliases use | as separator.`;
			const values =
				enumByHeader[header] ??
				(sheet === "Тексты" && header === "kind"
					? ["short", "full", "location", "infrastructure"]
					: undefined);
			if (values) {
				for (let row = 2; row <= 500; row += 1) {
					worksheet.getRow(row).getCell(index + 1).dataValidation = {
						type: "list",
						allowBlank: true,
						formulae: [`"${values.join(",")}"`],
						showErrorMessage: true,
						error: `Allowed values: ${values.join(", ")}`,
					};
				}
			}
		}
	}
	return Buffer.from(await workbook.xlsx.writeBuffer());
}

function rowsByExternalId(rows: Row[], key: string): Map<string, Row[]> {
	const grouped = new Map<string, Row[]>();
	for (const row of rows) {
		const id = row[key] ?? "";
		const bucket = grouped.get(id) ?? [];
		bucket.push(row);
		grouped.set(id, bucket);
	}
	return grouped;
}

export async function importDevelopmentExcel(input: {
	buffer: Buffer;
	fileName: string;
	sourceKey: string;
	mode: "dry-run" | "apply";
	now: Date;
	repository: DevelopmentExcelRepository;
	invalidateCache?: (targets: readonly { type: "tag"; tag: string }[]) => Promise<void>;
}): Promise<DevelopmentExcelReport> {
	if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.sourceKey)) {
		throw new Error("sourceKey must be a canonical lowercase ASCII slug.");
	}
	const workbookSha256 = createHash("sha256")
		.update(input.buffer)
		.digest("hex");
	const rows = await readDevelopmentWorkbook(input.buffer);
	const report: DevelopmentExcelReport = {
		mode: input.mode,
		workbookSha256,
		created: 0,
		changed: 0,
		unchanged: 0,
		errors: 0,
		warnings: 0,
		collisions: 0,
		issues: [],
	};
	const developerInputs = new Map<
		string,
		{ row: Row; data: DeveloperInput; inspection?: Inspection }
	>();
	for (const row of rows.Застройщики) {
		if (
			!required(report, row, "Застройщики", [
				"slug",
				"name",
				"status",
				"checkedAt",
			])
		)
			continue;
		if (!isSlug(row.slug)) {
			addIssue(report, {
				severity: "error",
				code: "invalid_slug",
				message: "Developer slug is not canonical.",
				sheet: "Застройщики",
				row: Number(row.__row),
				field: "slug",
			});
			continue;
		}
		if (developerInputs.has(row.slug)) {
			addIssue(report, {
				severity: "error",
				code: "duplicate_identity",
				message: `Duplicate developer slug ${row.slug}.`,
				sheet: "Застройщики",
				row: Number(row.__row),
				field: "slug",
			});
			continue;
		}
		if (
			!(["draft", "published", "archived"] as const).includes(
				row.status as "draft",
			)
		) {
			addIssue(report, {
				severity: "error",
				code: "invalid_enum",
				message: "Invalid developer status.",
				sheet: "Застройщики",
				row: Number(row.__row),
				field: "status",
			});
			continue;
		}
		if (!isDate(row.checkedAt)) {
			addIssue(report, {
				severity: "error",
				code: "invalid_date",
				message: "checkedAt must be ISO 8601.",
				sheet: "Застройщики",
				row: Number(row.__row),
				field: "checkedAt",
			});
			continue;
		}
		developerInputs.set(row.slug, {
			row,
			data: {
				slug: row.slug,
				name: row.name,
				aliases: splitList(row.aliases),
				legalName: row.legalName || undefined,
				siteUrl: row.siteUrl || undefined,
				description: row.description || undefined,
				status: row.status as DeveloperInput["status"],
				source: `${sourcePrefix}:${input.sourceKey}`,
				checkedAt: new Date(row.checkedAt).toISOString(),
			},
		});
	}

	const validPrices = rows.Цены.filter((row) => {
		if (
			!required(report, row, "Цены", [
				"developmentExternalId",
				"roomsLabel",
				"priceFromMinor",
				"priceCheckedAt",
			])
		)
			return false;
		const from = Number(row.priceFromMinor);
		const to = row.priceToMinor ? Number(row.priceToMinor) : undefined;
		const lots = row.lotsAvailable ? Number(row.lotsAvailable) : undefined;
		if (
			!Number.isSafeInteger(from) ||
			from < 0 ||
			(to !== undefined && (!Number.isSafeInteger(to) || to < from)) ||
			(lots !== undefined && (!Number.isSafeInteger(lots) || lots < 0)) ||
			!isDate(row.priceCheckedAt)
		) {
			addIssue(report, {
				severity: "error",
				code: "invalid_price",
				message:
					"Price requires integer bounds, optional non-negative lotsAvailable and ISO priceCheckedAt.",
				sheet: "Цены",
				row: Number(row.__row),
			});
			return false;
		}
		return true;
	});
	const validMedia = rows.Медиа.filter((row) => {
		if (
			!required(report, row, "Медиа", [
				"developmentExternalId",
				"mediaId",
				"mediaType",
				"rights",
				"checkedAt",
			])
		)
			return false;
		if (
			!(
				[
					"hero",
					"gallery",
					"layout",
					"construction_progress",
					"document",
					"video",
				] as const
			).includes(row.mediaType as "hero") ||
			!/^\d+$/.test(row.mediaId) ||
			!isDate(row.checkedAt) ||
			(row.capturedAt !== "" && !isDate(row.capturedAt)) ||
			(row.mediaType === "construction_progress" && !isDate(row.capturedAt))
		) {
			addIssue(report, {
				severity: "error",
				code: "invalid_media",
				message:
					"Media requires numeric mediaId, known mediaType and ISO checkedAt.",
				sheet: "Медиа",
				row: Number(row.__row),
			});
			return false;
		}
		return true;
	});
	const validTexts = rows.Тексты.filter((row) => {
		if (
			!required(report, row, "Тексты", [
				"developmentExternalId",
				"kind",
				"text",
				"checkedAt",
			])
		)
			return false;
		if (
			!(["short", "full", "location", "infrastructure"] as const).includes(
				row.kind as "short",
			) ||
			!isDate(row.checkedAt)
		) {
			addIssue(report, {
				severity: "error",
				code: "invalid_text",
				message: "Text requires known kind and ISO checkedAt.",
				sheet: "Тексты",
				row: Number(row.__row),
			});
			return false;
		}
		return true;
	});
	const prices = rowsByExternalId(validPrices, "developmentExternalId");
	const media = rowsByExternalId(validMedia, "developmentExternalId");
	const texts = rowsByExternalId(validTexts, "developmentExternalId");
	const developmentInputs: Array<{
		row: Row;
		externalId: string;
		data: DevelopmentInput;
		inspection?: Inspection;
	}> = [];
	const seenDevelopmentIds = new Set<string>();
	for (const row of rows.ЖК) {
		if (
			!required(report, row, "ЖК", [
				"externalId",
				"developerSlug",
				"name",
				"slug",
				"kind",
				"regionSlug",
				"citySlug",
				"salesStatus",
				"salesAvailability",
				"dataTier",
				"status",
				"checkedAt",
			])
		)
			continue;
		if (seenDevelopmentIds.has(row.externalId)) {
			addIssue(report, {
				severity: "error",
				code: "duplicate_identity",
				message: `Duplicate development externalId ${row.externalId}.`,
				sheet: "ЖК",
				row: Number(row.__row),
				field: "externalId",
			});
			continue;
		}
		seenDevelopmentIds.add(row.externalId);
		if (!isSlug(row.slug)) {
			addIssue(report, {
				severity: "error",
				code: "invalid_slug",
				message: "Development slug is not canonical.",
				sheet: "ЖК",
				row: Number(row.__row),
				field: "slug",
			});
			continue;
		}
		if (!developerInputs.has(row.developerSlug)) {
			addIssue(report, {
				severity: "error",
				code: "unknown_developer",
				message: `Developer ${row.developerSlug} is absent from Застройщики.`,
				sheet: "ЖК",
				row: Number(row.__row),
				field: "developerSlug",
			});
			continue;
		}
		if (
			!(["residential_complex", "cottage_village"] as const).includes(
				row.kind as "residential_complex",
			)
		) {
			addIssue(report, {
				severity: "error",
				code: "invalid_enum",
				message: "Invalid development kind.",
				sheet: "ЖК",
				row: Number(row.__row),
				field: "kind",
			});
			continue;
		}
		if (!(["A", "B", "C"] as const).includes(row.dataTier as "A")) {
			addIssue(report, {
				severity: "error",
				code: "invalid_enum",
				message: "Invalid dataTier.",
				sheet: "ЖК",
				row: Number(row.__row),
				field: "dataTier",
			});
			continue;
		}
		if (
			!(["draft", "published", "archived"] as const).includes(
				row.status as "draft",
			)
		) {
			addIssue(report, {
				severity: "error",
				code: "invalid_enum",
				message: "Invalid development status.",
				sheet: "ЖК",
				row: Number(row.__row),
				field: "status",
			});
			continue;
		}
		if (
			!(["on_sale", "sales_finished", "completed"] as const).includes(
				row.salesStatus as "on_sale",
			)
		) {
			addIssue(report, {
				severity: "error",
				code: "invalid_enum",
				message: "Invalid salesStatus.",
				sheet: "ЖК",
				row: Number(row.__row),
				field: "salesStatus",
			});
			continue;
		}
		if (
			!(["in_inventory", "confirmed", "none"] as const).includes(
				row.salesAvailability as "in_inventory",
			)
		) {
			addIssue(report, {
				severity: "error",
				code: "invalid_enum",
				message: "Invalid salesAvailability.",
				sheet: "ЖК",
				row: Number(row.__row),
				field: "salesAvailability",
			});
			continue;
		}
		const latitude = numberOrUndefined(row.latitude);
		const longitude = numberOrUndefined(row.longitude);
		if (
			(row.deadline && !isDate(row.deadline)) ||
			(row.latitude &&
				(latitude === undefined || latitude < -90 || latitude > 90)) ||
			(row.longitude &&
				(longitude === undefined || longitude < -180 || longitude > 180))
		) {
			addIssue(report, {
				severity: "error",
				code: "invalid_value",
				message: "deadline and coordinates have invalid format.",
				sheet: "ЖК",
				row: Number(row.__row),
			});
			continue;
		}
		if (!isDate(row.checkedAt)) {
			addIssue(report, {
				severity: "error",
				code: "invalid_date",
				message: "checkedAt must be ISO 8601.",
				sheet: "ЖК",
				row: Number(row.__row),
				field: "checkedAt",
			});
			continue;
		}
		const geo = await input.repository.resolveGeo({
			regionSlug: row.regionSlug,
			citySlug: row.citySlug,
			districtSlug: row.districtSlug || undefined,
		});
		if (!geo) {
			addIssue(report, {
				severity: "error",
				code: "unknown_geo",
				message: "Region/city/district identity is unknown or cross-city.",
				sheet: "ЖК",
				row: Number(row.__row),
				field: row.districtSlug ? "districtSlug" : "citySlug",
			});
			continue;
		}
		const source = `${sourcePrefix}:${input.sourceKey}`;
		const childPrices = (prices.get(row.externalId) ?? []).map((priceRow) => ({
			roomsLabel: priceRow.roomsLabel,
			priceFromMinor: Number(priceRow.priceFromMinor),
			priceToMinor: priceRow.priceToMinor
				? Number(priceRow.priceToMinor)
				: undefined,
			lotsAvailable: priceRow.lotsAvailable
				? Number(priceRow.lotsAvailable)
				: undefined,
			priceCheckedAt: new Date(priceRow.priceCheckedAt).toISOString(),
			source,
		}));
		const childMedia: Array<Record<string, unknown>> = [];
		for (const mediaRow of media.get(row.externalId) ?? []) {
			if (!(await input.repository.mediaExists(mediaRow.mediaId))) {
				addIssue(report, {
					severity: "error",
					code: "unknown_media",
					message: `Media ${mediaRow.mediaId} does not exist.`,
					sheet: "Медиа",
					row: Number(mediaRow.__row),
					field: "mediaId",
				});
				continue;
			}
			childMedia.push({
				media: mediaRow.mediaId,
				mediaType: mediaRow.mediaType,
				rights: mediaRow.rights,
				capturedAt: mediaRow.capturedAt
					? new Date(mediaRow.capturedAt).toISOString()
					: undefined,
				source,
				checkedAt: new Date(mediaRow.checkedAt).toISOString(),
			});
		}
		const descriptions = (texts.get(row.externalId) ?? []).map((textRow) => ({
			kind: textRow.kind,
			text: textRow.text,
			source,
			checkedAt: new Date(textRow.checkedAt).toISOString(),
		}));
		const data: DevelopmentInput = {
			name: row.name,
			slug: row.slug,
			kind: row.kind,
			region: geo.region,
			city: geo.city,
			district: geo.district,
			districtRaw: row.districtRaw || row.districtSlug || undefined,
			developerSlug: row.developerSlug,
			address: row.address || undefined,
			coordinates:
				row.latitude || row.longitude ? { latitude, longitude } : undefined,
			class: row.class || undefined,
			completion: row.completion || undefined,
			deadline: row.deadline ? new Date(row.deadline).toISOString() : undefined,
			salesStatus: row.salesStatus,
			salesAvailability: row.salesAvailability,
			dataTier: row.dataTier,
			source,
			checkedAt: new Date(row.checkedAt).toISOString(),
			priceByRooms: childPrices,
			mediaItems: childMedia,
			descriptions,
			externalIdentities: [{ source, externalId: row.externalId }],
			status: row.status,
		};
		developmentInputs.push({ row, externalId: row.externalId, data });
	}
	const acceptedDevelopmentIds = new Set(
		developmentInputs.map((item) => item.externalId),
	);
	for (const [sheet, childRows] of [
		["Цены", validPrices],
		["Медиа", validMedia],
		["Тексты", validTexts],
	] as const) {
		for (const childRow of childRows) {
			if (!acceptedDevelopmentIds.has(childRow.developmentExternalId)) {
				addIssue(report, {
					severity: "error",
					code: "unknown_development",
					message: `Development ${childRow.developmentExternalId} is absent from ЖК.`,
					sheet,
					row: Number(childRow.__row),
					field: "developmentExternalId",
				});
			}
		}
	}

	for (const item of developerInputs.values()) {
		item.inspection = await input.repository.inspectDeveloper(item.data);
	}
	for (const item of developmentInputs) {
		item.inspection = await input.repository.inspectDevelopment({
			sourceKey: input.sourceKey,
			externalId: item.externalId,
			data: item.data,
		});
		if (item.inspection.collision)
			addIssue(report, {
				severity: "error",
				code: "slug_collision",
				message: `Slug ${String(item.data.slug)} belongs to another development.`,
				sheet: "ЖК",
				row: Number(item.row.__row),
				field: "slug",
			});
		if (item.inspection.publishedSlugMutation)
			addIssue(report, {
				severity: "error",
				code: "published_slug_mutation",
				message: "Published development slug mutation is forbidden.",
				sheet: "ЖК",
				row: Number(item.row.__row),
				field: "slug",
			});
	}

	for (const inspection of [...developerInputs.values(), ...developmentInputs]
		.map((item) => item.inspection)
		.filter(Boolean)) {
		if (inspection?.state === "new") report.created += 1;
		else if (inspection?.state === "changed") report.changed += 1;
		else report.unchanged += 1;
	}
	if (input.mode === "dry-run") return report;

	const runId = await input.repository.createImportRun({
		sourceKey: input.sourceKey,
		fileName: input.fileName,
		workbookSha256,
		now: input.now.toISOString(),
	});
	if (report.errors > 0) {
		for (const issue of report.issues)
			await input.repository.recordIssue(runId, issue);
		await input.repository.finishImportRun({
			id: runId,
			status: "failed",
			report,
			now: input.now.toISOString(),
		});
		return report;
	}
	const developerIds = new Map<string, string | number>();
	for (const [slug, item] of developerInputs) {
		const id =
			item.inspection?.state === "unchanged" && item.inspection.id
				? item.inspection.id
				: await input.repository.upsertDeveloper(item.inspection?.id, {
						...item.data,
						lastImportRun: runId,
					});
		developerIds.set(slug, id);
	}
	for (const item of developmentInputs) {
		const developerId = developerIds.get(String(item.data.developerSlug));
		const data: DevelopmentInput & { developerSlug?: unknown } = {
			...item.data,
			developer: developerId,
			lastImportRun: runId,
		};
		delete data.developerSlug;
		if (item.inspection?.state !== "unchanged")
			await input.repository.upsertDevelopment(item.inspection?.id, data);
	}
	for (const issue of report.issues)
		await input.repository.recordIssue(runId, issue);
	await input.repository.finishImportRun({
		id: runId,
		status: report.changed + report.created === 0 ? "unchanged" : "success",
		report,
		now: input.now.toISOString(),
	});
	if (report.changed + report.created > 0) {
		await input.invalidateCache?.([
			{ type: "tag", tag: "developments" },
			{ type: "tag", tag: "developers" },
			{ type: "tag", tag: "properties" },
		]);
	}
	return report;
}
