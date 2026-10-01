import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = "docs/legacy/plans/AMS_MASTER_PLAN №5.md";
const sourceText = readFileSync(join(root, sourcePath));
const sha256 = createHash("sha256").update(sourceText).digest("hex");

const context = [
	"docs/legacy/plans/AMS_MASTER_PLAN №5.md",
	"docs/03_ARCHITECTURE.md",
	"docs/PROJECT.md",
];
const implementationActions = ["read", "edit", "test", "commit", "push"];
const deliveryActions = ["read", "commit", "push", "create_pr", "merge"];
const implementationStops = [
	"scope expansion",
	"production or production database",
	"destructive data action",
	"new secret",
	"paid or irreversible external action",
	"github",
];

const definitions = [
	{
		id: "01",
		title: "Mandatory verification contract",
		wave: "wave:foundation",
		risk: "STANDARD",
		dependsOn: [],
		goal: "STANDARD and RISKY merge surfaces differ, and RISKY cannot pass without isolated PostgreSQL/Payload proof.",
		scope: ["package scripts", "SourceCraft manual workflows", "isolated test DB guard"],
		acceptance: [
			"verify:merge-standard and verify:merge-risky are materially different",
			"verify:integration:required fails without a safe isolated test database",
			"exact-head mismatch fails and no production database is accepted",
		],
		checks: ["pnpm verify:daily", "pnpm verify:integration:required negative proof", "pnpm verify:merge-standard"],
	},
	{
		id: "02",
		title: "Public/System Gateway and explicit Local API modes",
		wave: "wave:backend",
		risk: "RISKY",
		dependsOn: ["01"],
		goal: "Public and user operations respect access while privileged operations are enumerated System/Ingest operations.",
		scope: ["public gateway", "system gateway", "Payload Local API calls", "private fields"],
		acceptance: [
			"public reads use overrideAccess:false with bounded DTO output",
			"anonymous REST and private fields remain denied",
			"owner/admin/system/editor/public matrix is covered by real DB tests",
		],
		checks: ["pnpm verify:public-gateway", "pnpm verify:security-boundaries", "pnpm quality:architecture", "pnpm verify:integration:required", "pnpm verify:merge-risky"],
	},
	{
		id: "03",
		title: "HTTP cache contract and runtime env fail-fast",
		wave: "wave:backend",
		risk: "RISKY",
		dependsOn: ["01"],
		goal: "HTTP invalidation is unambiguous and runtime fails closed when self-call or lead allowlist configuration is incomplete.",
		scope: ["cache adapters", "runtime env", "HTTP self-call proof"],
		acceptance: [
			"HTTP mode requires secret and internal base URL only at runtime",
			"active lead channels require LEAD_OUTBOUND_HOSTS",
			"one batched authenticated self-call invalidates without recursion or top-level next/cache",
		],
		checks: ["pnpm verify:jobs-config", "pnpm verify:feed-ingest", "pnpm verify:health-alerts", "pnpm verify:security-boundaries", "pnpm verify:integration:required", "pnpm verify:merge-risky"],
	},
	{
		id: "04",
		title: "Property numeric DB invariants",
		wave: "wave:backend",
		risk: "RISKY",
		dependsOn: ["01"],
		goal: "Money is integer minor units and areas satisfy decimal(10,2) semantics at every write boundary.",
		scope: ["Payload property schema", "migration", "normalization", "schema verifier"],
		acceptance: [
			"clean and previous-data migrations preserve valid values",
			"fractional money and invalid area precision fail deterministically",
			"manual, Admin, and feed writes share the same invariant",
		],
		checks: ["pnpm verify:schema", "pnpm verify:feed-ingest", "pnpm verify:integration:required", "pnpm verify:merge-risky"],
	},
	{
		id: "05",
		title: "Dispatcher lifecycle and narrow SQL governance",
		wave: "wave:backend",
		risk: "RISKY",
		dependsOn: ["01"],
		goal: "Feed lifecycle transitions are atomic and remaining SQL is minimal, justified, and guarded.",
		scope: ["dispatcher claim", "heartbeat", "terminal transitions", "SQL allowlist and ADR"],
		acceptance: [
			"two contenders produce one claim winner and terminal runs cannot restart",
			"heartbeat is visible to an independent reader during a long import",
			"unsupported application primitive falls back only to a narrow ADR-governed SQL operation",
		],
		checks: ["pnpm verify:jobs-config", "pnpm verify:feed-lifecycle", "pnpm verify:operational-recovery", "pnpm verify:security-boundaries", "pnpm verify:integration:required", "pnpm verify:merge-risky"],
	},
	{
		id: "06",
		title: "Bounded ingest and deactivation approval correctness",
		wave: "wave:backend",
		risk: "RISKY",
		dependsOn: ["01"],
		goal: "Large feeds use bounded backpressure and destructive deactivation requires complete safe input and valid one-time approval.",
		scope: ["parser runtime", "bounded batches", "deactivation decision and approval"],
		acceptance: [
			"10k+ synthetic feed never buffers beyond the internal batch bound",
			"truncated or anomalous input performs zero mass deactivation",
			"approval requires matching run, approvedAt, future expiry, and unconsumed state",
		],
		checks: ["pnpm verify:feed-parser", "pnpm verify:feed-ingest", "pnpm verify:feed-lifecycle", "pnpm verify:manual-ownership", "pnpm verify:integration:required", "pnpm verify:merge-risky"],
	},
	{
		id: "07",
		title: "Lead access and retention relational contract",
		wave: "wave:backend",
		risk: "RISKY",
		dependsOn: ["01", "02"],
		goal: "Lead PII follows the approved role matrix and delete/anonymize retention has a consistent relational result.",
		scope: ["lead access", "lead-delivery FK migration", "retention", "alerts"],
		acceptance: [
			"delete removes a lead and all linked deliveries",
			"anonymize removes PII and linked diagnostics while preserving the allowed business shell",
			"null policy makes no destructive mutation and emits a safe operational alert",
		],
		checks: ["pnpm verify:lead-intake", "pnpm verify:lead-outbox", "pnpm verify:health-alerts", "pnpm verify:security-boundaries", "pnpm verify:schema", "pnpm verify:integration:required", "pnpm verify:merge-risky"],
	},
	{
		id: "08",
		title: "Lead retry scheduling and terminal states",
		wave: "wave:backend",
		risk: "RISKY",
		dependsOn: ["01", "07"],
		goal: "Retryable delivery explicitly queues one future Payload job and permanent or exhausted outcomes become abandoned.",
		scope: ["deliverLead task", "queue scheduling", "recovery sweeper", "terminal states"],
		acceptance: [
			"Payload jobs table contains one future retry with the correct waitUntil and stable ID input",
			"enqueue crash leaves a recoverable pending row without duplicate live jobs",
			"permanent and exhausted outcomes are abandoned and task output matches installed Payload types",
		],
		checks: ["pnpm verify:lead-delivery-state", "pnpm verify:lead-outbox", "pnpm verify:max-adapter", "pnpm verify:custom-webhook-adapter", "pnpm verify:operational-recovery", "pnpm verify:integration:required", "pnpm verify:merge-risky"],
	},
	{
		id: "09",
		title: "Aggregate architecture guards",
		wave: "wave:consolidation",
		risk: "STANDARD",
		dependsOn: ["02", "03", "04", "05", "06", "07", "08"],
		goal: "Corrected architecture boundaries are regression-tested by one coherent guard surface with positive and negative fixtures.",
		scope: ["dependency cruiser", "architecture guard", "guard self-tests"],
		acceptance: [
			"Local API access, raw SQL, cache graph, UI persistence, and contracts boundaries are guarded",
			"each critical rule has a positive and intentionally broken fixture",
			"legitimate DTO and pure-type imports remain allowed",
		],
		checks: ["pnpm quality:architecture", "pnpm quality:guards", "pnpm verify:daily", "pnpm verify:merge-standard"],
	},
	{
		id: "10",
		title: "UI Core verification gate",
		wave: "wave:ui",
		risk: "STANDARD",
		dependsOn: [],
		goal: "One deterministic UI Core matrix catches project-authored design and ownership drift without false structural geometry failures.",
		scope: ["UI Core scanner", "a11y and SEO aggregation", "client and primitive ownership reports"],
		acceptance: [
			"known arbitrary radius fixtures and broken font or primitive ownership fixtures fail",
			"CSS variables and structural geometry are allowed",
			"every UI rule is classified mechanical, targeted, visual, manual, or N/A",
		],
		checks: ["pnpm quality:design-tokens", "pnpm verify:drift", "pnpm verify:a11y-starter", "pnpm verify:seo-contracts", "pnpm verify:ui-core", "pnpm verify:merge-standard"],
	},
	{
		id: "11",
		title: "UI drift cleanup and ownership",
		wave: "wave:ui",
		risk: "STANDARD",
		dependsOn: ["10"],
		goal: "Verified UI drift is removed without redesign and package, view, client, and peer ownership are explicit.",
		scope: ["design literals", "dead donor CSS", "StarterPages ownership", "react-dom peer"],
		acceptance: [
			"UI Core passes with no unjustified design literals",
			"dead donor CSS has no live package path and public UI exports remain stable",
			"representative responsive visual matrix shows no redesign",
		],
		checks: ["pnpm verify:ui-core", "pnpm verify:a11y-starter", "pnpm verify:seo-contracts", "pnpm typecheck", "pnpm lint", "pnpm build", "pnpm verify:merge-standard"],
	},
	{
		id: "12",
		title: "Source-of-truth sync",
		wave: "wave:final",
		risk: "STANDARD",
		dependsOn: ["02", "03", "04", "05", "06", "07", "08", "09", "11"],
		goal: "Project docs describe the merged implementation and commands exactly without rewriting history or moving normative documents.",
		scope: ["architecture", "project docs", "font contract", "reading order and commands"],
		acceptance: [
			"all links and commands resolve to current code",
			"docs make no unsupported infrastructure, mode, or PASS claim",
			"historical proofs and root normative documents remain intact",
		],
		checks: ["pnpm verify:clone-readiness", "pnpm quality:architecture", "pnpm verify:daily", "pnpm verify:merge-standard"],
	},
	{
		id: "13",
		title: "Final Core 5.5 and UI Core 5.0 proof",
		wave: "wave:final",
		risk: "RISKY",
		dependsOn: ["02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"],
		goal: "One exact-SHA evidence package proves the completed pre-production contract and identifies every unproven production-only claim.",
		scope: ["exact-SHA final proof", "clean and upgrade DB", "18A", "access and UI matrices"],
		acceptance: [
			"all mandatory suites run on the exact head SHA with zero skipped required suites",
			"clean DB, previous-data migration, 18A, access, and UI evidence is reproducible",
			"blocker or major findings and production claims are absent from the final report",
		],
		checks: ["pnpm verify:merge-risky", "pnpm verify:schema", "pnpm verify:ui-core", "pnpm build", "pnpm verify:daily"],
	},
];

const byId = new Map(definitions.map((item) => [item.id, item]));
const epicKey = (id) => `EPIC-${id}`;
const taskKey = (id) => `TASK-${id}-01`;
const deliveryKey = (id) => `TASK-${id}-DELIVERY`;
const nodes = [];

for (const definition of definitions) {
	const key = epicKey(definition.id);
	const wave = definition.wave;
	const dependencyEpics = definition.dependsOn.map(epicKey);
	const dependencyDeliveries = definition.dependsOn.map(deliveryKey);
	nodes.push({
		key,
		title: definition.title,
		type: "epic",
		source_anchor: key,
		goal: definition.goal,
		scope: definition.scope,
		acceptance_criteria: definition.acceptance,
		depends_on: dependencyEpics,
		delivery_mode: "MERGE_AFTER_GATE",
		required_context: context,
		allowed_actions: ["read", "plan"],
		stop_conditions: ["production", "github", "approved source drift"],
		priority: definition.risk === "RISKY" ? 1 : 2,
		labels: [wave, "approval:owner-approved", "delivery:merge-after-gate"],
	});
	nodes.push({
		key: taskKey(definition.id),
		title: `Implement ${key}: ${definition.title}`,
		type: "task",
		role: "implementation",
		work_kind: "implementation",
		parent_key: key,
		source_anchor: key,
		goal: definition.goal,
		scope: definition.scope,
		acceptance_criteria: definition.acceptance,
		required_checks: definition.checks,
		depends_on: dependencyDeliveries,
		required_context: context,
		allowed_actions: implementationActions,
		stop_conditions: implementationStops,
		priority: definition.risk === "RISKY" ? 1 : 2,
		labels: [wave, "work:implementation", `risk:${definition.risk.toLowerCase()}`],
	});
	nodes.push({
		key: deliveryKey(definition.id),
		title: `Deliver ${key} to SourceCraft main`,
		type: "task",
		role: "implementation",
		work_kind: "delivery",
		parent_key: key,
		source_anchor: key,
		goal: `Merge ${key} through one exact-head ${definition.risk} gate, delete the epic branch, and do not touch GitHub or production.`,
		scope: ["SourceCraft PR", "diff review", `${definition.risk} exact-head gate`, "merge and safe cleanup"],
		acceptance_criteria: [
			"PR source, target, and exact head SHA are verified",
			`SourceCraft ${definition.risk} gate passes on that exact head SHA`,
			"merge to canonical main succeeds and branch cleanup is safe",
			"GitHub and production are not changed",
		],
		required_checks: ["PR source/target/head SHA", `SourceCraft ${definition.risk} gate`, "post-merge main ancestry"],
		depends_on: [taskKey(definition.id)],
		required_context: context,
		allowed_actions: deliveryActions,
		stop_conditions: ["production", "github", "gate not proven", "PR head changed"],
		priority: definition.risk === "RISKY" ? 1 : 2,
		labels: [wave, "work:delivery", `risk:${definition.risk.toLowerCase()}`],
	});
}

for (const definition of definitions) {
	for (const dependency of definition.dependsOn) {
		if (!byId.has(dependency)) throw new Error(`Unknown dependency EPIC-${dependency}`);
	}
}

const inventory = {
	schema_version: 2,
	beads_prefix: "ral5",
	source: {
		plan_id: "AMS-REALTBASE-RESIDUAL-ALIGN",
		path: sourcePath,
		version: "v1",
		status: "APPROVED",
		approved_by: "owner",
		approved_at: "2026-09-19T13:38:27+03:00",
		sha256,
		epic_anchors: definitions.map(({ id }) => epicKey(id)),
	},
	nodes,
};

const outputPath = join(root, "docs", "legacy", "orchestration", "master-plan-5.inventory.json");
writeFileSync(outputPath, `${JSON.stringify(inventory, null, "\t")}\n`);
console.log(`wrote ${outputPath} sha256=${sha256} epics=${definitions.length} nodes=${nodes.length}`);
