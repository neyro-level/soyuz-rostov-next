import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import {
	closeSync,
	existsSync,
	fsyncSync,
	openSync,
	readFileSync,
	renameSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { SiteProfile } from "../src/core/profile/index.ts";
import type { SeoRegistryRow } from "../src/core/seo/registry.ts";
import { siteProfile } from "../src/project/site-profile.ts";
import type { ProjectDistrictRouteRegistry } from "../src/project/url-grammar.ts";
import {
	loadProjectDistrictRegistry,
	parseCsv,
	validateRegistryCsv,
} from "./seo-registry.ts";
import {
	renderSeoRegistryCsv,
	seoRegistryColumns,
} from "./seo-registry-output.mjs";

const approvalColumns = [
	"eventId",
	"timestamp",
	"action",
	"scope",
	"url",
	"actor",
	"reason",
	"rowHash",
] as const;

export type ApprovalEvent = {
	eventId: string;
	timestamp: string;
	action: "APPROVE";
	scope: string;
	url: string;
	actor: string;
	reason: string;
	rowHash: string;
};

function csvCell(value: string): string {
	return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function renderApprovalJournal(
	events: readonly ApprovalEvent[],
): string {
	return `${[
		approvalColumns.join(","),
		...events.map((event) =>
			approvalColumns.map((column) => csvCell(event[column])).join(","),
		),
	].join("\n")}\n`;
}

export function parseApprovalJournal(input: string): ApprovalEvent[] {
	const [header, ...body] = parseCsv(input);
	assert.deepEqual(
		header,
		approvalColumns,
		"Approval journal columns or order differ from contract",
	);
	const ids = new Set<string>();
	const urls = new Set<string>();
	return body.map((values, index) => {
		if (values.length !== approvalColumns.length) {
			throw new Error(`Approval journal row ${index + 2} must have 8 columns.`);
		}
		const raw = Object.fromEntries(
			approvalColumns.map((column, offset) => [column, values[offset]?.trim()]),
		) as Record<(typeof approvalColumns)[number], string>;
		if (!/^[a-f0-9]{64}$/.test(raw.eventId) || ids.has(raw.eventId)) {
			throw new Error(
				`Approval journal row ${index + 2} has invalid or duplicate eventId.`,
			);
		}
		ids.add(raw.eventId);
		if (raw.action !== "APPROVE") {
			throw new Error(
				`Approval journal row ${index + 2} has unsupported action.`,
			);
		}
		if (!raw.scope || !raw.actor || !raw.reason) {
			throw new Error(
				`Approval journal row ${index + 2} requires scope, actor and reason.`,
			);
		}
		if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(raw.timestamp)) {
			throw new Error(
				`Approval journal row ${index + 2} has invalid timestamp.`,
			);
		}
		if (!/^[a-f0-9]{64}$/.test(raw.rowHash)) {
			throw new Error(`Approval journal row ${index + 2} has invalid rowHash.`);
		}
		if (urls.has(raw.url)) {
			throw new Error(`Duplicate or conflicting approval for URL: ${raw.url}`);
		}
		urls.add(raw.url);
		return raw as ApprovalEvent;
	});
}

export function approvalRowHash(row: SeoRegistryRow): string {
	const { status: _status, ...approvedInput } = row;
	return createHash("sha256")
		.update(JSON.stringify(approvedInput))
		.digest("hex");
}

export function verifyRegistryApprovals(
	registrySource: string,
	journalSource: string,
	profile: SiteProfile = siteProfile,
	districtRegistry: ProjectDistrictRouteRegistry = loadProjectDistrictRegistry(
		profile,
	),
): void {
	const rows = validateRegistryCsv(registrySource, profile, districtRegistry);
	const events = parseApprovalJournal(journalSource);
	const byUrl = new Map(events.map((event) => [event.url, event]));
	for (const event of events) {
		const row = rows.find((candidate) => candidate.url === event.url);
		if (!row)
			throw new Error(
				`Approval journal has unknown registry URL: ${event.url}`,
			);
		if (approvalRowHash(row) !== event.rowHash) {
			throw new Error(
				`Approval row hash changed after selection: ${event.url}`,
			);
		}
	}
	for (const row of rows) {
		const expected = byUrl.has(row.url) ? "approved" : "draft";
		if (row.status !== expected) {
			throw new Error(
				`Registry status was edited outside approval journal: ${row.url} expected ${expected}.`,
			);
		}
	}
}

function assertEligible(row: SeoRegistryRow): void {
	if (
		row.synthetic ||
		row.value === null ||
		row.source === "fallback_no_data"
	) {
		throw new Error(
			`Approval requires measured synthetic=false row: ${row.url}`,
		);
	}
	if (!row.morphologyApproved) {
		throw new Error(`Approval requires approved morphology: ${row.url}`);
	}
	if (row.tier === "NONE")
		throw new Error(`Approval rejects NONE tier: ${row.url}`);
}

function atomicWrite(path: string, content: string): void {
	const temporary = resolve(dirname(path), `.${randomUUID()}.approval.tmp`);
	let handle: number | undefined;
	try {
		handle = openSync(temporary, "wx");
		writeFileSync(handle, content, "utf8");
		fsyncSync(handle);
		closeSync(handle);
		handle = undefined;
		renameSync(temporary, path);
	} finally {
		if (handle !== undefined) closeSync(handle);
		if (existsSync(temporary)) rmSync(temporary, { force: true });
	}
}

export function approveRegistryFiles(input: {
	registryPath: string;
	journalPath: string;
	scope: "all-measured" | `url=${string}`;
	actor: string;
	reason: string;
	now?: Date;
	profile?: SiteProfile;
	districtRegistry?: ProjectDistrictRouteRegistry;
	beforeCommit?: () => void;
}): { approved: number; recovered: number } {
	const actor = input.actor.trim();
	const reason = input.reason.trim();
	if (!actor || !reason)
		throw new Error("Approval requires non-empty actor and reason.");
	const profile = input.profile ?? siteProfile;
	const districtRegistry =
		input.districtRegistry ?? loadProjectDistrictRegistry(profile);
	const journalBefore = readFileSync(input.journalPath, "utf8");
	const events = parseApprovalJournal(journalBefore);
	const registryBefore = readFileSync(input.registryPath, "utf8");
	const rows = validateRegistryCsv(registryBefore, profile, districtRegistry);
	const existingByUrl = new Map(events.map((event) => [event.url, event]));
	const requested =
		input.scope === "all-measured"
			? rows.filter(
					(row) =>
						!row.synthetic &&
						row.value !== null &&
						row.source !== "fallback_no_data" &&
						row.morphologyApproved &&
						row.tier !== "NONE",
				)
			: rows.filter((row) => row.url === input.scope.slice("url=".length));
	if (requested.length === 0)
		throw new Error(`Approval scope selected no rows: ${input.scope}`);

	let recovered = 0;
	const selected = requested.filter((row) => {
		const existing = existingByUrl.get(row.url);
		if (!existing) return true;
		if (approvalRowHash(row) !== existing.rowHash) {
			throw new Error(
				`Duplicate or conflicting approval for changed row: ${row.url}`,
			);
		}
		if (row.status === "draft") {
			recovered += 1;
			return false;
		}
		throw new Error(`Duplicate or conflicting approval for URL: ${row.url}`);
	});
	for (const row of selected) assertEligible(row);
	const selectedHashes = new Map(
		selected.map((row) => [row.url, approvalRowHash(row)]),
	);
	input.beforeCommit?.();
	const currentSource = readFileSync(input.registryPath, "utf8");
	const currentRows = validateRegistryCsv(
		currentSource,
		profile,
		districtRegistry,
	);
	for (const [url, expectedHash] of selectedHashes) {
		const current = currentRows.find((row) => row.url === url);
		if (!current || approvalRowHash(current) !== expectedHash) {
			throw new Error(`Approval row hash changed after selection: ${url}`);
		}
	}

	const timestamp = (input.now ?? new Date()).toISOString();
	const newEvents = selected.map((row) => {
		const rowHash = selectedHashes.get(row.url) as string;
		const eventId = createHash("sha256")
			.update(
				[timestamp, input.scope, row.url, actor, reason, rowHash].join("\0"),
			)
			.digest("hex");
		return {
			eventId,
			timestamp,
			action: "APPROVE" as const,
			scope: input.scope,
			url: row.url,
			actor,
			reason,
			rowHash,
		};
	});
	const approvedUrls = new Set([
		...events.map((event) => event.url),
		...newEvents.map((event) => event.url),
	]);
	const registryOutput = renderSeoRegistryCsv(
		seoRegistryColumns,
		currentRows.map((row) => ({
			...row,
			status: approvedUrls.has(row.url) ? "approved" : "draft",
		})),
	);
	const journalOutput = renderApprovalJournal([...events, ...newEvents]);
	verifyRegistryApprovals(
		registryOutput,
		journalOutput,
		profile,
		districtRegistry,
	);
	if (newEvents.length > 0) atomicWrite(input.journalPath, journalOutput);
	atomicWrite(input.registryPath, registryOutput);
	return { approved: newEvents.length, recovered };
}

if (
	process.argv[1] &&
	resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	if (process.argv.includes("--check")) {
		verifyRegistryApprovals(
			readFileSync(resolve("docs/seo/SEO_REGISTRY_SEED.csv"), "utf8"),
			readFileSync(resolve("docs/seo/REGISTRY_APPROVALS.csv"), "utf8"),
		);
		console.log("seo:registry:approvals:check PASS");
		process.exit(0);
	}
	const value = (name: string): string | undefined =>
		process.argv
			.find((arg) => arg.startsWith(`--${name}=`))
			?.slice(name.length + 3);
	const scope = value("scope");
	const actor = value("actor");
	const reason = value("reason");
	if (
		!scope ||
		!actor ||
		!reason ||
		(scope !== "all-measured" && !scope.startsWith("url="))
	) {
		throw new Error(
			"Usage: seo:registry:approve --scope=all-measured|url=/path/ --actor=<actor> --reason=<reason>",
		);
	}
	const result = approveRegistryFiles({
		registryPath: resolve("docs/seo/SEO_REGISTRY_SEED.csv"),
		journalPath: resolve("docs/seo/REGISTRY_APPROVALS.csv"),
		scope: scope as "all-measured" | `url=${string}`,
		actor,
		reason,
	});
	console.log(
		`seo:registry:approve appended ${result.approved} approvals; recovered ${result.recovered} statuses`,
	);
}
