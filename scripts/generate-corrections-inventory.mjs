import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = join(root, "docs");
const planName = readdirSync(docsDir).find(
	(name) => name.includes("MASTER_PLAN") && name.includes("3") && name.endsWith(".md"),
);
if (!planName) throw new Error("master plan №3 markdown not found");
const sourcePath = `docs/${planName}`;
const sourceText = readFileSync(join(root, sourcePath));
const sha256 = createHash("sha256").update(sourceText).digest("hex");

const stop = ["scope expansion", "destructive migration", "new secret", "paid external action"];
const implActions = ["read", "edit", "test", "commit", "push"];
const deliveryActions = ["read", "commit", "push", "create_pr", "merge"];
const ctx = ["docs/legacy/plans/AMS_MASTER_PLAN №3.md", "docs/03_ARCHITECTURE.md", "docs/PROJECT.md"];

function epic(key, title, goal, scope, acceptance, dependsOn, wave, priority, extraStop = ["production"]) {
	return {
		key,
		title,
		type: "epic",
		source_anchor: key,
		goal,
		scope,
		acceptance_criteria: acceptance,
		depends_on: dependsOn,
		delivery_mode: "MERGE_AFTER_GATE",
		required_context: ctx,
		allowed_actions: ["read", "plan"],
		stop_conditions: extraStop,
		priority,
		labels: [wave, "approval:owner-approved", "delivery:merge-after-gate"],
	};
}

function task(key, title, parent, goal, scope, acceptance, checks, dependsOn, wave, kind = "implementation", extraStop) {
	return {
		key,
		title,
		type: "task",
		role: "implementation",
		work_kind: kind,
		parent_key: parent,
		source_anchor: parent,
		goal,
		scope,
		acceptance_criteria: acceptance,
		required_checks: checks,
		depends_on: dependsOn,
		required_context: ctx,
		allowed_actions: kind === "delivery" ? deliveryActions : implActions,
		stop_conditions: extraStop ?? (kind === "delivery" ? ["production"] : stop),
		priority: 1,
		labels: [wave, kind === "delivery" ? "work:delivery" : "work:implementation"],
	};
}

const nodes = [];

nodes.push(
	epic(
		"EPIC-11",
		"Public data boundary",
		"Anonymous raw Payload business REST deny; public site only via Public Gateway.",
		["11.1-11.7"],
		["anonymous GET properties/pages/leads/lead-deliveries denied", "public gateway catalog/property/page works", "mechanical allowlist guard"],
		[],
		"wave:security",
		1,
	),
);
nodes.push(
	task(
		"TASK-11-01",
		"Collection access inventory and deny anonymous business REST",
		"EPIC-11",
		"Access matrix recorded; properties/pages anonymous read deny; media REST not public CRUD; redirects stay application-resolved.",
		["11.1", "11.2", "11.3", "11.4", "11.5"],
		["properties and pages anonymous collection read deny", "public file delivery still possible for media assets"],
		["pnpm verify:security-boundaries", "pnpm verify:public-gateway"],
		[],
		"wave:security",
	),
);
nodes.push(
	task(
		"TASK-11-02",
		"Anonymous REST guard and integration tests",
		"EPIC-11",
		"Declarative allowlist guard fails on unexpected anonymous business read; integration tests cover deny + gateway happy path.",
		["11.6", "11.7"],
		["guard not properties-only", "tests listed in EPIC-11 exist and pass"],
		["pnpm verify:security-boundaries", "pnpm verify:public-gateway", "pnpm quality:guards"],
		["TASK-11-01"],
		"wave:security",
	),
);
nodes.push(
	task(
		"TASK-11-DELIVERY",
		"Deliver EPIC-11 to main",
		"EPIC-11",
		"PR merged to main after RISKY exact-head gate; epic branch deleted.",
		["PR", "gate", "merge", "branch cleanup"],
		["merged into main", "exact head gate green"],
		["PR source/target/head SHA", "SourceCraft RISKY gate"],
		["TASK-11-01", "TASK-11-02"],
		"wave:security",
		"delivery",
	),
);

nodes.push(
	epic(
		"EPIC-12",
		"Remove unproven public raw SQL",
		"Public reads Payload-first; public sql layer gone unless later owner Optimized Read.",
		["12.1-12.7"],
		["public raw SQL = 0", "facets/sitemap/lifecycle/redirect preserved", "p95 evidence recorded without stopping"],
		["EPIC-11"],
		"wave:data",
		2,
	),
);
nodes.push(
	task(
		"TASK-12-01",
		"Move public catalog/sitemap/lifecycle/redirect to Payload reads",
		"EPIC-12",
		"Replace drizzle.execute public path with Payload read/count; delete src/core/data-access/public/sql when unused.",
		["12.1", "12.2", "12.3", "12.4", "12.5"],
		["no public/sql consumers", "directory removed if unused"],
		["pnpm verify:public-gateway", "pnpm verify:seo-contracts"],
		[],
		"wave:data",
	),
);
nodes.push(
	task(
		"TASK-12-02",
		"Low-level DB guard and catalog budget evidence",
		"EPIC-12",
		"Guard blocks public raw SQL; representative p95 evidence stored; do not restore SQL if budget misses.",
		["12.6", "12.7"],
		["architecture/guards fail on public drizzle", "docs/proofs/epic-12 exists"],
		["pnpm quality:architecture", "pnpm quality:guards", "pnpm verify:product-regression"],
		["TASK-12-01"],
		"wave:data",
	),
);
nodes.push(
	task(
		"TASK-12-DELIVERY",
		"Deliver EPIC-12 to main",
		"EPIC-12",
		"PR merged to main after RISKY gate.",
		["PR/merge"],
		["merged into main"],
		["PR SHA", "SourceCraft RISKY gate"],
		["TASK-12-01", "TASK-12-02"],
		"wave:data",
		"delivery",
	),
);

nodes.push(
	epic(
		"EPIC-13",
		"Starter topology contract",
		"Docs/guards keep AMS Server local PostgreSQL + MEDIA_DIR; no S3/managed purchase.",
		["13.1-13.7"],
		["no required S3 adapter", "verify:production-topology asserts local starter topology"],
		["EPIC-12"],
		"wave:runtime",
		3,
	),
);
nodes.push(
	task(
		"TASK-13-01",
		"Align docs, ADR, deploy, clone-readiness with local topology",
		"EPIC-13",
		"PROJECT/OPERATIONS/architecture/ADR/env/deploy describe local PG + MEDIA_DIR; clone docs split starter vs commercial clone.",
		["13.1", "13.2", "13.4", "13.5", "13.6"],
		["ADR remains starter local storage", "no S3 required runtime"],
		["pnpm verify:production-topology", "pnpm verify:clone-readiness"],
		[],
		"wave:runtime",
	),
);
nodes.push(
	task(
		"TASK-13-02",
		"Topology guard must not require S3",
		"EPIC-13",
		"verify:production-topology fails if starter contract requires S3 or Managed PostgreSQL as this runtime.",
		["13.3", "13.7"],
		["guard matches local topology"],
		["pnpm verify:production-topology", "pnpm verify:security-boundaries"],
		["TASK-13-01"],
		"wave:runtime",
	),
);
nodes.push(
	task(
		"TASK-13-DELIVERY",
		"Deliver EPIC-13 to main",
		"EPIC-13",
		"PR merged to main after RISKY gate.",
		["PR/merge"],
		["merged into main"],
		["PR SHA", "SourceCraft RISKY gate"],
		["TASK-13-01", "TASK-13-02"],
		"wave:runtime",
		"delivery",
	),
);

nodes.push(
	epic(
		"EPIC-14",
		"Retention contract",
		"Lead/archive retention fail-closed without invented days.",
		["14.1-14.6"],
		["missing policy fails production readiness", "expired lead processed when policy set", "PROJECT.md NEEDS_OWNER"],
		["EPIC-13"],
		"wave:runtime",
		4,
	),
);
nodes.push(
	task(
		"TASK-14-01",
		"Fail-closed retention runtime and tests",
		"EPIC-14",
		"Production readiness fails without leadRetentionDays when intake/channel active; maintenance processes expired rows only with policy.",
		["14.1", "14.2", "14.3", "14.4", "14.6"],
		["tests for absent policy / expired / linked delivery / non-expired"],
		["pnpm verify:operational-recovery", "pnpm verify:lead-outbox"],
		[],
		"wave:runtime",
	),
);
nodes.push(
	task(
		"TASK-14-02",
		"Document NEEDS_OWNER retention knobs",
		"EPIC-14",
		"PROJECT.md records leadRetentionDays and archiveRetentionDays as NEEDS_OWNER.",
		["14.5"],
		["PROJECT.md explicit NEEDS_OWNER"],
		["file check"],
		["TASK-14-01"],
		"wave:runtime",
	),
);
nodes.push(
	task(
		"TASK-14-DELIVERY",
		"Deliver EPIC-14 to main",
		"EPIC-14",
		"PR merged to main after RISKY gate.",
		["PR/merge"],
		["merged into main"],
		["PR SHA", "SourceCraft RISKY gate"],
		["TASK-14-01", "TASK-14-02"],
		"wave:runtime",
		"delivery",
	),
);

nodes.push(
	epic(
		"EPIC-15",
		"Local API override access boundaries",
		"systemOverrideAccess only from System Gateway whitelist; owner paths use request access.",
		["15.1-15.7"],
		["return-to-feed without system override", "guard on helper imports", "owner/admin/anonymous/system tests"],
		["EPIC-14"],
		"wave:security",
		2,
	),
);
nodes.push(
	task(
		"TASK-15-01",
		"Inventory Local API calls and remove unnecessary overrides",
		"EPIC-15",
		"Classify user/public/system/ingest; owner/admin endpoints use request access; FeedSources hooks explicit.",
		["15.1", "15.2", "15.3", "15.4", "15.5"],
		["Properties return-to-feed no systemOverrideAccess"],
		["pnpm verify:owner-operations", "pnpm verify:security-boundaries"],
		[],
		"wave:security",
	),
);
nodes.push(
	task(
		"TASK-15-02",
		"Override helper import guard and tests",
		"EPIC-15",
		"Business code cannot import systemOverrideAccess; whitelist path only.",
		["15.6", "15.7"],
		["quality:architecture or guards fail on illegal import"],
		["pnpm quality:architecture", "pnpm quality:guards"],
		["TASK-15-01"],
		"wave:security",
	),
);
nodes.push(
	task(
		"TASK-15-DELIVERY",
		"Deliver EPIC-15 to main",
		"EPIC-15",
		"PR merged to main after RISKY gate.",
		["PR/merge"],
		["merged into main"],
		["PR SHA", "SourceCraft RISKY gate"],
		["TASK-15-01", "TASK-15-02"],
		"wave:security",
		"delivery",
	),
);

nodes.push(
	epic(
		"EPIC-16",
		"Feed source invariants",
		"Enabled feed sources always have nextDueAt; dispatcher no catch-up.",
		["16.1-16.6"],
		["enabled nextDueAt required", "create/enable sets now", "safety knobs not bypassed"],
		["EPIC-15"],
		"wave:runtime",
		2,
	),
);
nodes.push(
	task(
		"TASK-16-01",
		"Enforce nextDueAt and dispatcher tests",
		"EPIC-16",
		"Schema/hooks/migration if needed; dispatcher tests; safety knobs on manual import.",
		["16.1", "16.2", "16.3", "16.4", "16.5", "16.6"],
		["enabled source never missing nextDueAt", "one claim one run"],
		["pnpm verify:jobs-config", "pnpm verify:feed-lifecycle", "pnpm verify:schema"],
		[],
		"wave:runtime",
	),
);
nodes.push(
	task(
		"TASK-16-DELIVERY",
		"Deliver EPIC-16 to main",
		"EPIC-16",
		"PR merged to main after RISKY gate.",
		["PR/merge"],
		["merged into main"],
		["PR SHA", "SourceCraft RISKY gate"],
		["TASK-16-01"],
		"wave:runtime",
		"delivery",
	),
);

nodes.push(
	epic(
		"EPIC-17",
		"Derived property fields",
		"pricePerMeterMinor owned by ingest/manual write boundary; null semantics correct.",
		["17.1-17.6"],
		["no hidden global recalc owner", "null when price/area invalid", "banker rounding tests"],
		["EPIC-16"],
		"wave:data",
		3,
	),
);
nodes.push(
	task(
		"TASK-17-01",
		"Move derived field calculation to ingest/manual boundary",
		"EPIC-17",
		"Remove misleading collection hook ownership; shared calculator; stale null overwrite.",
		["17.1", "17.2", "17.3", "17.4", "17.5", "17.6"],
		["feed and manual tests", "zero area null"],
		["pnpm verify:feed-ingest", "pnpm verify:manual-ownership"],
		[],
		"wave:data",
	),
);
nodes.push(
	task(
		"TASK-17-DELIVERY",
		"Deliver EPIC-17 to main",
		"EPIC-17",
		"PR merged to main after RISKY gate.",
		["PR/merge"],
		["merged into main"],
		["PR SHA", "SourceCraft RISKY gate"],
		["TASK-17-01"],
		"wave:data",
		"delivery",
	),
);

nodes.push(
	epic(
		"EPIC-18",
		"Security config fail-closed",
		"No production schema push; CSP exact image hosts; conditional env; outbound tests.",
		["18.1-18.6"],
		["production+PAYLOAD_DB_PUSH fails", "CSP no global https:", "build fallback cannot start production"],
		["EPIC-17"],
		"wave:security",
		3,
	),
);
nodes.push(
	task(
		"TASK-18-01",
		"Fail-closed push, CSP, env, outbound, secrets guard",
		"EPIC-18",
		"Implement 18.1-18.6 without requiring S3 settings for this starter.",
		["18.1", "18.2", "18.3", "18.4", "18.5", "18.6"],
		["targeted outbound tests", "no real tokens in docs/fixtures"],
		["pnpm verify:security-boundaries", "pnpm quality:guards"],
		[],
		"wave:security",
	),
);
nodes.push(
	task(
		"TASK-18-DELIVERY",
		"Deliver EPIC-18 to main",
		"EPIC-18",
		"PR merged to main after RISKY gate.",
		["PR/merge"],
		["merged into main"],
		["PR SHA", "SourceCraft RISKY gate"],
		["TASK-18-01"],
		"wave:security",
		"delivery",
	),
);

nodes.push(
	epic(
		"EPIC-19",
		"UI Core 5.0 drift pass",
		"No redesign; remove UI Core drift; a11y/SEO/responsive/performance on representative pages.",
		["19.1-19.12"],
		["PR finding table", "LeadForm states", "token taxonomy without Atlas breakage"],
		["EPIC-18"],
		"wave:ui",
		3,
	),
);
nodes.push(
	task(
		"TASK-19-01",
		"UI drift remediation and representative proof",
		"EPIC-19",
		"Inventory, client boundaries, tokens, CSS, aliases, pages, LeadForm, a11y, responsive, LCP/CLS local, SEO contracts.",
		["19.1", "19.2", "19.3", "19.4", "19.5", "19.6", "19.7", "19.8", "19.9", "19.10", "19.11", "19.12"],
		["no second primitive foundation", "quality:design-tokens pass"],
		["pnpm quality:design-tokens", "pnpm verify:a11y-starter", "pnpm verify:seo-contracts"],
		[],
		"wave:ui",
	),
);
nodes.push(
	task(
		"TASK-19-DELIVERY",
		"Deliver EPIC-19 to main",
		"EPIC-19",
		"PR merged to main after STANDARD gate.",
		["PR/merge"],
		["merged into main"],
		["PR SHA", "SourceCraft STANDARD gate"],
		["TASK-19-01"],
		"wave:ui",
		"delivery",
	),
);

nodes.push(
	epic(
		"EPIC-20",
		"Final constitution proof",
		"Hard Contract matrix with evidence on exact SHA; no new features.",
		["20.1-20.8"],
		["FINAL_CORE_5_5_AUDIT.md", "verify + verify:schema on exact SHA", "no PASS without evidence"],
		["EPIC-19"],
		"wave:proof",
		4,
	),
);
nodes.push(
	task(
		"TASK-20-01",
		"Run proofs and write final audit",
		"EPIC-20",
		"18A proofs, integration suites as required, docs/FINAL_CORE_5_5_AUDIT.md.",
		["20.1", "20.2", "20.3", "20.4", "20.5", "20.6", "20.7"],
		["audit file exists", "NOT PROVEN honest"],
		["pnpm verify:daily", "pnpm verify", "pnpm verify:schema"],
		[],
		"wave:proof",
	),
);
nodes.push(
	task(
		"TASK-20-DELIVERY",
		"Deliver EPIC-20 to main",
		"EPIC-20",
		"PR merged to main after RISKY gate; do not deploy.",
		["PR/merge"],
		["merged into main", "production not deployed from this epic"],
		["PR SHA", "SourceCraft RISKY gate"],
		["TASK-20-01"],
		"wave:proof",
		"delivery",
	),
);

nodes.push(
	epic(
		"EPIC-21",
		"AMS Server demo release",
		"One production rollout to start-baza.ams24.ru on AMS Server from exact main.",
		["21.1-21.5"],
		["live smoke", "noindex", "one jobs owner", "rollback image kept"],
		["EPIC-20"],
		"wave:release",
		4,
		["new secret", "wrong server", "managed purchase"],
	),
);
nodes.push(
	task(
		"TASK-21-01",
		"Align OPERATIONS runbook with live AMS contour",
		"EPIC-21",
		"OPERATIONS.md matches existing AMS Server demo contour without secrets.",
		["21.1"],
		["runbook not skeleton-contradicting live contour"],
		["docs review"],
		[],
		"wave:release",
	),
);
nodes.push(
	task(
		"TASK-21-DELIVERY",
		"Roll out exact main to AMS Server",
		"EPIC-21",
		"Immutable image built off-host; migrate; one runtime; live smoke start-baza.ams24.ru; cleanup branches.",
		["21.2", "21.3", "21.4", "21.5"],
		["live HTTPS responds", "healthz ok", "exact SHA"],
		["live smoke", "ams-production-deploy"],
		["TASK-21-01"],
		"wave:release",
		"delivery",
		["wrong server", "new secret"],
	),
);

const inventory = {
	schema_version: 2,
	beads_prefix: "rbc",
	source: {
		plan_id: "AMS-REALTBASE-CORRECTIONS",
		path: sourcePath.replaceAll("\\", "/"),
		version: "v3",
		status: "APPROVED",
		approved_by: "owner",
		approved_at: "2026-09-18T18:06:00+03:00",
		sha256,
		epic_anchors: [
			"EPIC-11",
			"EPIC-12",
			"EPIC-13",
			"EPIC-14",
			"EPIC-15",
			"EPIC-16",
			"EPIC-17",
			"EPIC-18",
			"EPIC-19",
			"EPIC-20",
			"EPIC-21",
		],
	},
	nodes,
};

const out = join(root, "docs/legacy/orchestration/master-plan-3.inventory.json");
writeFileSync(out, `${JSON.stringify(inventory, null, "\t")}\n`);
console.log(`${out} sha256=${sha256} nodes=${nodes.length}`);
