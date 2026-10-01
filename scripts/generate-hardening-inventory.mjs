import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = join(root, "docs");
const planName = readdirSync(docsDir).find((name) =>
	name.startsWith("AMS_MASTER_PLAN") && name.endsWith(".md"),
);
if (!planName) throw new Error("master plan markdown not found");
const sourcePath = `docs/${planName}`;
const sourceText = readFileSync(join(root, sourcePath));
const sha256 = createHash("sha256").update(sourceText).digest("hex");

const stop = [
	"scope expansion",
	"production",
	"destructive migration",
	"new secret",
	"paid external action",
];
const implActions = ["read", "edit", "test", "commit", "push"];
const deliveryActions = ["read", "commit", "push", "create_pr", "merge"];
const ctx = [
	"docs/legacy/plans/AMS_MASTER_PLAN №2.md",
	"docs/03_ARCHITECTURE.md",
	"docs/PROJECT.md",
];

function epic(key, title, anchor, goal, scope, acceptance, dependsOn, wave, priority) {
	return {
		key,
		title,
		type: "epic",
		source_anchor: anchor,
		goal,
		scope,
		acceptance_criteria: acceptance,
		depends_on: dependsOn,
		delivery_mode: "MERGE_AFTER_GATE",
		required_context: ctx,
		allowed_actions: ["read", "plan"],
		stop_conditions: ["production"],
		priority,
		labels: [wave, "approval:owner-approved"],
	};
}

function task(key, title, parent, anchor, goal, scope, acceptance, checks, dependsOn, wave, kind = "implementation") {
	return {
		key,
		title,
		type: "task",
		role: "implementation",
		work_kind: kind,
		parent_key: parent,
		source_anchor: anchor,
		goal,
		scope,
		acceptance_criteria: acceptance,
		required_checks: checks,
		depends_on: dependsOn,
		required_context: ctx,
		allowed_actions: kind === "delivery" ? deliveryActions : implActions,
		stop_conditions: kind === "delivery" ? ["production"] : stop,
		priority: 1,
		labels: [wave, kind === "delivery" ? "work:delivery" : "work:implementation"],
	};
}

const nodes = [];

nodes.push(epic(
	"EPIC-00",
	"Source of Truth, local topology, jobs ownership",
	"EPIC 0",
	"Документы и runtime topology starter совпадают: local PostgreSQL, local media, one jobs runner, verify commands, 18A matrix.",
	["EPIC 0 sections 0.1–0.13"],
	["docs/runtime не противоречат", "S3 runtime отсутствует", "verify:* существуют", "18A matrix created"],
	[],
	"wave:foundation",
	0,
));
nodes.push(task("TASK-00-01", "Sync starter canon, project.config, verify commands, 18A matrix", "EPIC-00", "EPIC 0",
	"PROJECT/OPERATIONS/architecture/ADR/env example/verify scripts/18A matrix описывают local topology и knobs.",
	["0.1", "0.2", "0.10", "0.11", "0.12", "0.13", "0.5–0.7", "0.9"],
	["ADR-LOCAL-STARTER-STORAGE существует", "project.config.ts содержит knobs включая dispatchBatchSize и staleDataSlaMinutes", "pnpm verify:daily/verify/verify:schema существуют", "docs/proofs/18A-matrix.md содержит A–G, B1=NOT-CLAIMED"],
	["file exists checks", "pnpm verify:daily --help or script exists"],
	[], "wave:foundation"));
nodes.push(task("TASK-00-02", "Remove S3 runtime and add local media adapter", "EPIC-00", "EPIC 0",
	"Starter не использует S3; Payload Media пишет в persistent MEDIA_DIR через storage boundary.",
	["0.3", "0.4", "media access rules"],
	["нет s3Storage runtime", "MEDIA_DIR config", "media.read public / writes owner-only documented in code"],
	["rg storage-s3 payload.config.ts", "typecheck if env/config changed"],
	["TASK-00-01"], "wave:foundation"));
nodes.push(task("TASK-00-03", "Record version-sensitive Payload/Next proof", "EPIC-00", "EPIC 0",
	"Pinned-version assumptions for Local API, jobs, Next 16 recorded in docs/proofs/epic-0/version-sensitive.md.",
	["0.8"],
	["proof file exists with official-doc citations and dates"],
	["file exists"],
	["TASK-00-02"], "wave:foundation"));
nodes.push(task("TASK-00-DELIVERY", "Deliver EPIC 0 to hardening", "EPIC-00", "EPIC 0",
	"PR merged into hardening/realtbase-starter at exact head after review/gate.",
	["create/merge PR"],
	["PR URL", "merged into hardening/realtbase-starter"],
	["PR source/target/head SHA"],
	["TASK-00-01", "TASK-00-02", "TASK-00-03"], "wave:foundation", "delivery"));

nodes.push(epic("EPIC-01", "Canonical structure, contracts, guards", "EPIC 1",
	"Guards, contracts, approved SQL, bootstrap, media access and schema completeness in place.",
	["EPIC 1"],
	["guards fail-closed", "one contracts source", "owner bootstrap", "media access"],
	["EPIC-00"], "wave:foundation", 1));
nodes.push(task("TASK-01-01", "Canonical structure and single contracts source", "EPIC-01", "EPIC 1",
	"packages/contracts is the only DTO source; UI does not duplicate contracts; dependency direction guarded.",
	["1.1", "1.2", "1.3"],
	["no duplicate DTO in packages/ui/src/contracts", "dependency guard configured"],
	["pnpm quality:architecture"],
	[], "wave:foundation"));
nodes.push(task("TASK-01-02", "Mechanical guards, SQL paths, REST, bootstrap, media access", "EPIC-01", "EPIC 1",
	"Core 18.4/23 guards, approved SQL, jobs module, owner bootstrap, media access, reserved namespaces.",
	["1.4", "1.5", "1.6", "1.7", "1.8", "1.9", "1.10", "1.11", "1.16", "1.17", "1.18", "1.15"],
	["guard-baseline.json frozen", "system/jobs module exists", "self-registration off", "media.read public"],
	["pnpm quality:guards"],
	["TASK-01-01"], "wave:foundation"));
nodes.push(task("TASK-01-03", "Field access and schema completeness", "EPIC-01", "EPIC 1",
	"Private fields field-access protected; collections complete via migrations.",
	["1.13", "1.14"],
	["private field access tests or documented access", "migration for missing fields if needed"],
	["pnpm verify:schema if migration"],
	["TASK-01-02"], "wave:foundation"));
nodes.push(task("TASK-01-DELIVERY", "Deliver EPIC 1 to hardening", "EPIC-01", "EPIC 1",
	"EPIC 1 merged to hardening.",
	["PR/merge"],
	["merged"],
	["PR SHA"],
	["TASK-01-01", "TASK-01-02", "TASK-01-03"], "wave:foundation", "delivery"));

nodes.push(epic("EPIC-02", "Safe feed fetch and SAX parser", "EPIC 2",
	"Safe outbound fetch, conditional GET, streaming SAX parser, mapping, derived calculator.",
	["EPIC 2", "MAIN CHECKPOINT 1 as first task"],
	["parser not regex", "304 supported", "derived fields shared"],
	["EPIC-01"], "wave:runtime", 1));
nodes.push(task("TASK-02-01", "Main checkpoint 1", "EPIC-02", "EPIC 2",
	"hardening merged to main with verify:daily + EPIC 0–1 proofs + verify:schema.",
	["MAIN CHECKPOINT 1"],
	["verify:daily ran", "verify:schema ran", "PR merged to main"],
	["pnpm verify:daily", "pnpm verify:schema"],
	[], "wave:runtime"));
nodes.push(task("TASK-02-02", "Safe fetch, 304, streaming hash", "EPIC-02", "EPIC 2",
	"Production feed fetch uses Safe Outbound Client with 304 and streaming SHA-256.",
	["2.1", "2.2", "2.3"],
	["no direct fetch in feed path", "304 → unchanged"],
	["verify:feed-parser or targeted script"],
	["TASK-02-01"], "wave:runtime"));
nodes.push(task("TASK-02-03", "SAX parser, mapping, derived calculator", "EPIC-02", "EPIC 2",
	"Streaming SAX parser with safety limits; market from feedSource; shared derived fields.",
	["2.4", "2.5", "2.6", "2.7", "2.8"],
	["regex parser not production", "critical anomaly → suspicious", "one derived calculator"],
	["verify:feed-parser"],
	["TASK-02-02"], "wave:runtime"));
nodes.push(task("TASK-02-DELIVERY", "Deliver EPIC 2 to hardening", "EPIC-02", "EPIC 2",
	"EPIC 2 merged to hardening.",
	["PR/merge"],
	["merged"],
	["PR SHA"],
	["TASK-02-01", "TASK-02-02", "TASK-02-03"], "wave:runtime", "delivery"));

nodes.push(epic("EPIC-03", "Real import runtime", "EPIC 3",
	"Atomic claims, real importFeed, safe deactivation, jobs config, HTTP cache proof.",
	["EPIC 3"],
	["importFeed not stub", "atomic claim", "18A A/B2/C/D updated"],
	["EPIC-02"], "wave:runtime", 1));
nodes.push(task("TASK-03-01", "Atomic claims, dispatcher, importFeed, heartbeat", "EPIC-03", "EPIC 3",
	"SQL claims and real importFeed pipeline with heartbeat.",
	["3.1", "3.3", "3.4", "3.5", "3.6"],
	["no find-then-update claim", "heartbeat outside ingest tx"],
	["verify:feed-ingest"],
	[], "wave:runtime"));
nodes.push(task("TASK-03-02", "Ingest repo, idempotency, deactivation, market, baseline", "EPIC-03", "EPIC 3",
	"Persistence ingest with isolation, bulk lastSeenAt, safe deactivation, exact baseline rules.",
	["3.7", "3.8", "3.9", "3.10", "3.11", "3.12", "3.13", "3.14", "3.17"],
	["interrupted ≠ deactivation", "source isolation"],
	["verify:feed-lifecycle"],
	["TASK-03-01"], "wave:runtime"));
nodes.push(task("TASK-03-03", "Jobs config, schedules, HTTP cache, owner ops", "EPIC-03", "EPIC 3",
	"Canonical jobs queues, maintenance schedules, HTTP cache self-call, owner operations via system/jobs.",
	["3.18", "3.19", "3.20", "3.21", "3.15", "3.16"],
	["disableScheduling map", "18A B2 artifact", "no generic payload-jobs CRUD"],
	["verify:jobs-config", "verify:owner-operations"],
	["TASK-03-02"], "wave:runtime"));
nodes.push(task("TASK-03-DELIVERY", "Deliver EPIC 3 to hardening", "EPIC-03", "EPIC 3",
	"EPIC 3 merged to hardening.",
	["PR/merge"],
	["merged"],
	["PR SHA"],
	["TASK-03-01", "TASK-03-02", "TASK-03-03"], "wave:runtime", "delivery"));

nodes.push(epic("EPIC-04", "Manual ownership, lifecycle, SEO data", "EPIC 4",
	"Actor-aware ownership, 410/redirects, sitemap sharding, facets SQL, SEO contract.",
	["EPIC 4"],
	["import does not create manualOverrides", "real 410 or redirect", "facets full dataset"],
	["EPIC-03"], "wave:runtime", 1));
nodes.push(task("TASK-04-01", "Manual ownership and derived fields", "EPIC-04", "EPIC 4",
	"Ownership writer actor-aware; return-to-feed; shared derived calculator on manual edit.",
	["4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "4.13"],
	["import #1/#2 no manualOverrides", "return-to-feed works"],
	["targeted ownership tests"],
	[], "wave:runtime"));
nodes.push(task("TASK-04-02", "Lifecycle, sitemap, facets, SEO", "EPIC-04", "EPIC 4",
	"Lifecycle 410/redirects, sitemap sharding, SQL facets, empty states, SEO whitelist.",
	["4.7", "4.8", "4.9", "4.10", "4.11", "4.12", "4.14", "4.15", "4.16"],
	["no homepage redirect", "no hard 1000 sitemap limit", "facets SQL aggregation"],
	["verify:seo-contracts"],
	["TASK-04-01"], "wave:runtime"));
nodes.push(task("TASK-04-DELIVERY", "Deliver EPIC 4 to hardening", "EPIC-04", "EPIC 4",
	"EPIC 4 merged to hardening.",
	["PR/merge"],
	["merged"],
	["PR SHA"],
	["TASK-04-01", "TASK-04-02"], "wave:runtime", "delivery"));

nodes.push(epic("EPIC-05", "Public lead intake and outbox", "EPIC 5",
	"POST /api/public/leads with transactional outbox; sweeper is primary scheduler.",
	["EPIC 5", "MAIN CHECKPOINT 2 first"],
	["one lead + deliveries in one tx", "duplicate submit stable"],
	["EPIC-04"], "wave:leads", 1));
nodes.push(task("TASK-05-01", "Main checkpoint 2", "EPIC-05", "EPIC 5",
	"Wave EPIC 2–4 checkpointed to main.",
	["MAIN CHECKPOINT 2"],
	["verify:daily", "verify:schema", "merged to main"],
	["pnpm verify:daily", "pnpm verify:schema"],
	[], "wave:leads"));
nodes.push(task("TASK-05-02", "Public intake, outbox, sweeper", "EPIC-05", "EPIC 5",
	"Canonical public lead endpoint and transactional outbox; sweeper primary.",
	["5.1", "5.2", "5.3", "5.4", "5.5", "5.6", "5.7", "5.8", "5.9"],
	["generic Payload leads create not public", "idempotent submit"],
	["verify:lead-intake", "verify:lead-outbox"],
	["TASK-05-01"], "wave:leads"));
nodes.push(task("TASK-05-DELIVERY", "Deliver EPIC 5 to hardening", "EPIC-05", "EPIC 5",
	"EPIC 5 merged to hardening.",
	["PR/merge"],
	["merged"],
	["PR SHA"],
	["TASK-05-01", "TASK-05-02"], "wave:leads", "delivery"));

nodes.push(epic("EPIC-06", "Real lead delivery", "EPIC 6",
	"deliverLead with atomic claim, adapters, recovery, waitUntil backoff.",
	["EPIC 6"],
	["deliverLead not stub", "waitUntil backoff", "HMAC webhook"],
	["EPIC-05"], "wave:leads", 1));
nodes.push(task("TASK-06-01", "deliverLead claim, state machine, adapters", "EPIC-06", "EPIC 6",
	"Atomic delivery claim and working MAX/webhook adapters with idempotency keys.",
	["6.1", "6.2", "6.3", "6.3A", "6.4", "6.5", "6.6", "6.7", "6.8", "6.9", "6.9A", "6.10"],
	["empty RETURNING → no HTTP", "retries=0 platform"],
	["verify:lead-delivery-state", "verify:max-adapter", "verify:custom-webhook-adapter"],
	[], "wave:leads"));
nodes.push(task("TASK-06-02", "Recovery, orphan, manual retry", "EPIC-06", "EPIC 6",
	"Stale/orphan recovery via system/jobs; controlled manual retry.",
	["6.11", "6.12", "6.13"],
	["future waitUntil not orphan", "no generic jobs CRUD"],
	["verify:operational-recovery"],
	["TASK-06-01"], "wave:leads"));
nodes.push(task("TASK-06-DELIVERY", "Deliver EPIC 6 to hardening", "EPIC-06", "EPIC 6",
	"EPIC 6 merged to hardening.",
	["PR/merge"],
	["merged"],
	["PR SHA"],
	["TASK-06-01", "TASK-06-02"], "wave:leads", "delivery"));

nodes.push(epic("EPIC-07", "Retention, media, runtime, observability", "EPIC 7",
	"Retention modes, PII-free jobs, fail-fast runtime, alerts, one jobs runner proof.",
	["EPIC 7"],
	["delete and anonymize", "build without secrets", "independent alert channel"],
	["EPIC-06"], "wave:leads", 1));
nodes.push(task("TASK-07-01", "Retention and PII-free jobs", "EPIC-07", "EPIC 7",
	"Lead retention delete|anonymize without silent defaults; jobs/logs without PII.",
	["7.1", "7.2", "7.3", "7.4"],
	["missing policy → no destructive cleanup + alert"],
	["verify:security-boundaries"],
	[], "wave:leads"));
nodes.push(task("TASK-07-02", "Media finalize, env, headers, alerts, jobs proof", "EPIC-07", "EPIC 7",
	"Local media finalized; env fail-fast; security headers; alerts including cache SLA and backup; one jobs runner.",
	["7.5", "7.6", "7.7", "7.7A", "7.8", "7.9", "7.10", "7.11", "7.12"],
	["staleDataSlaMinutes alert", "backup failure alerts", "JOBS_AUTORUN exactly once documented/proof"],
	["verify:health-alerts"],
	["TASK-07-01"], "wave:leads"));
nodes.push(task("TASK-07-DELIVERY", "Deliver EPIC 7 to hardening", "EPIC-07", "EPIC 7",
	"EPIC 7 merged to hardening.",
	["PR/merge"],
	["merged"],
	["PR SHA"],
	["TASK-07-01", "TASK-07-02"], "wave:leads", "delivery"));

nodes.push(epic("EPIC-08", "One canonical UI path", "EPIC 8",
	"Production routes use packages/ui; real images; one LeadForm; no fixture presentation.",
	["EPIC 8", "MAIN CHECKPOINT 3 first"],
	["no fixture production imports", "LeadForm states"],
	["EPIC-07"], "wave:ui", 2));
nodes.push(task("TASK-08-01", "Main checkpoint 3", "EPIC-08", "EPIC 8",
	"Wave EPIC 5–7 checkpointed to main.",
	["MAIN CHECKPOINT 3"],
	["verify:daily", "merged to main"],
	["pnpm verify:daily"],
	[], "wave:ui"));
nodes.push(task("TASK-08-02", "Canonical UI composition and LeadForm", "EPIC-08", "EPIC 8",
	"Move production UI out of fixture; semantic sections; production copy; canonical LeadForm.",
	["8.1", "8.2", "8.3", "8.4", "8.5", "8.11"],
	["no src/components/fixture production imports", "REPORT ONLY drift after 8.3"],
	["lint of app routes"],
	["TASK-08-01"], "wave:ui"));
nodes.push(task("TASK-08-03", "Images, gallery, primitives", "EPIC-08", "EPIC 8",
	"Shared image host source; real cards; gallery used or removed; CVA primitives.",
	["8.6", "8.7", "8.8", "8.9", "8.10"],
	["no wildcard remotePatterns", "no text image placeholder"],
	["quality:design-tokens"],
	["TASK-08-02"], "wave:ui"));
nodes.push(task("TASK-08-DELIVERY", "Deliver EPIC 8 to hardening", "EPIC-08", "EPIC 8",
	"EPIC 8 merged to hardening.",
	["PR/merge"],
	["merged"],
	["PR SHA"],
	["TASK-08-01", "TASK-08-02", "TASK-08-03"], "wave:ui", "delivery"));

nodes.push(epic("EPIC-09", "Design system cleanup and visual proof", "EPIC 9",
	"Token taxonomy, dead tokens 0, DESIGN.md complete, visual proof.",
	["EPIC 9"],
	["dead tokens 0", "DESIGN.md completeness"],
	["EPIC-08"], "wave:ui", 2));
nodes.push(task("TASK-09-01", "Tokens, design guard, visual proof, DESIGN.md", "EPIC-09", "EPIC 9",
	"Classify tokens, add dead-token guard, visual proof, complete DESIGN.md.",
	["9.1", "9.2", "9.3", "9.4", "9.5", "9.6", "9.7", "9.8"],
	["design guard green", "visual proof artifacts"],
	["pnpm quality:design-tokens"],
	[], "wave:ui"));
nodes.push(task("TASK-09-DELIVERY", "Deliver EPIC 9 to hardening", "EPIC-09", "EPIC 9",
	"EPIC 9 merged to hardening.",
	["PR/merge"],
	["merged"],
	["PR SHA"],
	["TASK-09-01"], "wave:ui", "delivery"));

nodes.push(epic("EPIC-10", "System verification and starter freeze", "EPIC 10",
	"Integration suites, clone readiness, empty guard baseline, freeze SHA. No production.",
	["EPIC 10", "MAIN CHECKPOINT 4 first", "FINAL MAIN CHECKPOINT"],
	["pnpm verify PASS", "clone diff core/packages = 0", "18A matrix complete"],
	["EPIC-09"], "wave:freeze", 1));
nodes.push(task("TASK-10-01", "Main checkpoint 4", "EPIC-10", "EPIC 10",
	"Wave EPIC 8–9 checkpointed to main.",
	["MAIN CHECKPOINT 4"],
	["verify:daily", "merged to main"],
	["pnpm verify:daily"],
	[], "wave:freeze"));
nodes.push(task("TASK-10-02", "Test infra and import/lead/security/migration suites", "EPIC-10", "EPIC 10",
	"Real integration infrastructure and mandatory suites including 18.5 tests.",
	["10.1", "10.2", "10.3", "10.4", "10.5", "10.6"],
	["interrupted ≠ deactivation tested", "leads publicly inaccessible", "waitUntil backoff"],
	["pnpm verify"],
	["TASK-10-01"], "wave:freeze"));
nodes.push(task("TASK-10-03", "Media, perf, a11y, clone, E2E, cache, docs", "EPIC-10", "EPIC 10",
	"Remaining freeze proofs including Core perf PASS/FAIL and clone readiness.",
	["10.7", "10.8", "10.9", "10.10", "10.11", "10.12", "10.13", "10.14", "10.15", "10.16", "10.17"],
	["Core LCP/CLS/p95 PASS or documented FAIL with blocker", "git diff src/core = 0 in clone test"],
	["pnpm verify", "pnpm verify:schema"],
	["TASK-10-02"], "wave:freeze"));
nodes.push(task("TASK-10-04", "Drift audit REPORT ONLY and 18A matrix close", "EPIC-10", "EPIC 10",
	"Full drift audit report-only; 18A matrix A/B2/C/D/E/F/G PASS, B1 NOT-CLAIMED.",
	["10.18", "0.13"],
	["report exists", "matrix closed"],
	["file exists"],
	["TASK-10-03"], "wave:freeze"));
nodes.push(task("TASK-10-DELIVERY", "Final freeze PR to main", "EPIC-10", "EPIC 10",
	"Final hardening → main merge after verify + verify:schema. Production not executed.",
	["FINAL MAIN CHECKPOINT"],
	["merged to main", "production not run"],
	["pnpm verify", "pnpm verify:schema"],
	["TASK-10-01", "TASK-10-02", "TASK-10-03", "TASK-10-04"], "wave:freeze", "delivery"));

const inventory = {
	schema_version: 2,
	beads_prefix: "rbs",
	source: {
		plan_id: "AMS-REALTBASE-HARDENING",
		path: sourcePath.replaceAll("\\", "/"),
		version: "v2",
		status: "APPROVED",
		approved_by: "owner",
		approved_at: "2026-09-18T00:03:00+03:00",
		sha256,
		epic_anchors: [
			"EPIC 0",
			"EPIC 1",
			"EPIC 2",
			"EPIC 3",
			"EPIC 4",
			"EPIC 5",
			"EPIC 6",
			"EPIC 7",
			"EPIC 8",
			"EPIC 9",
			"EPIC 10",
		],
	},
	nodes,
};

const out = join(root, "docs/legacy/orchestration/master-plan-2.inventory.json");
writeFileSync(out, `${JSON.stringify(inventory, null, "\t")}\n`);
console.log(`wrote ${out} sha256=${sha256} nodes=${nodes.length}`);
