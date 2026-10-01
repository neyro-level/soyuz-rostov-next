import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { siteProfile } from "../src/project/site-profile.ts";
import {
	loadProjectDistrictRegistry,
	parseRegistryCsv,
} from "./seo-registry.ts";
import {
	approveRegistryFiles,
	parseApprovalJournal,
	renderApprovalJournal,
	verifyRegistryApprovals,
} from "./seo-registry-approvals.ts";
import { applyDemandSnapshot } from "./seo-registry-import-demand.ts";
import {
	renderSeoRegistryCsv,
	seoRegistryColumns,
} from "./seo-registry-output.mjs";

const registry = readFileSync("docs/seo/SEO_REGISTRY_SEED.csv", "utf8");
const emptyJournal = renderApprovalJournal([]);
const districts = loadProjectDistrictRegistry(siteProfile);
verifyRegistryApprovals(registry, emptyJournal, siteProfile, districts);
const [first] = parseRegistryCsv(registry, siteProfile);
assert.ok(first);
const measured = applyDemandSnapshot(
	registry,
	`url,phrase,value,snapshotDate\n${first.url},измеренный спрос,600,2026-09-25\n`,
	siteProfile,
	districts,
);

const fixture = mkdtempSync(join(tmpdir(), "ams-registry-approval-"));
try {
	const registryPath = join(fixture, "registry.csv");
	const journalPath = join(fixture, "approvals.csv");
	writeFileSync(registryPath, measured, "utf8");
	writeFileSync(journalPath, emptyJournal, "utf8");
	const approved = approveRegistryFiles({
		registryPath,
		journalPath,
		scope: `url=${first.url}`,
		actor: "owner-test",
		reason: "measured demand accepted",
		now: new Date("2026-09-27T12:00:00.000Z"),
		profile: siteProfile,
		districtRegistry: districts,
	});
	assert.deepEqual(approved, { approved: 1, recovered: 0 });
	const approvedRegistry = readFileSync(registryPath, "utf8");
	const approvedJournal = readFileSync(journalPath, "utf8");
	assert.equal(
		parseRegistryCsv(approvedRegistry, siteProfile)[0]?.status,
		"approved",
	);
	assert.equal(parseApprovalJournal(approvedJournal).length, 1);
	verifyRegistryApprovals(
		approvedRegistry,
		approvedJournal,
		siteProfile,
		districts,
	);

	const duplicateRegistry = readFileSync(registryPath, "utf8");
	const duplicateJournal = readFileSync(journalPath, "utf8");
	assert.throws(
		() =>
			approveRegistryFiles({
				registryPath,
				journalPath,
				scope: `url=${first.url}`,
				actor: "owner-test",
				reason: "duplicate",
				profile: siteProfile,
				districtRegistry: districts,
			}),
		/Duplicate or conflicting approval/,
	);
	assert.equal(readFileSync(registryPath, "utf8"), duplicateRegistry);
	assert.equal(readFileSync(journalPath, "utf8"), duplicateJournal);

	const manualRows = parseRegistryCsv(measured, siteProfile).map(
		(row, index) => ({
			...row,
			status: index === 0 ? "approved" : row.status,
		}),
	);
	const manuallyEdited = renderSeoRegistryCsv(seoRegistryColumns, manualRows);
	assert.throws(
		() =>
			verifyRegistryApprovals(
				manuallyEdited,
				emptyJournal,
				siteProfile,
				districts,
			),
		/edited outside approval journal/,
	);

	writeFileSync(registryPath, measured, "utf8");
	writeFileSync(journalPath, emptyJournal, "utf8");
	assert.throws(
		() =>
			approveRegistryFiles({
				registryPath,
				journalPath,
				scope: `url=${first.url}`,
				actor: "owner-test",
				reason: "race proof",
				profile: siteProfile,
				districtRegistry: districts,
				beforeCommit: () => {
					const rows = parseRegistryCsv(measured, siteProfile);
					rows[0] = { ...rows[0], title: `${rows[0]?.title} changed` };
					writeFileSync(
						registryPath,
						renderSeoRegistryCsv(seoRegistryColumns, rows),
						"utf8",
					);
				},
			}),
		/row hash changed after selection/,
	);
	assert.equal(readFileSync(journalPath, "utf8"), emptyJournal);

	assert.throws(
		() =>
			approveRegistryFiles({
				registryPath,
				journalPath,
				scope: "all-measured",
				actor: "",
				reason: "missing actor",
				profile: siteProfile,
				districtRegistry: districts,
			}),
		/requires non-empty actor and reason/,
	);
} finally {
	rmSync(fixture, { recursive: true, force: true });
}

assert.throws(
	() =>
		parseApprovalJournal(
			`${emptyJournal}${"a".repeat(64)},2026-09-27T12:00:00.000Z,APPROVE,all-measured,/,owner,one,${"b".repeat(64)}\n${"c".repeat(64)},2026-09-27T12:01:00.000Z,APPROVE,all-measured,/,owner,two,${"d".repeat(64)}\n`,
		),
	/Duplicate or conflicting approval/,
);

console.log(
	"SEO registry approvals passed: journal, manual-edit and hash-race guards",
);
