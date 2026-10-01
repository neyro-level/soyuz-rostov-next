import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = join(root, "docs");
const planName = readdirSync(docsDir).find(
	(name) => name.includes("MASTER_PLAN") && name.includes("4") && name.endsWith(".md"),
);
if (!planName) throw new Error("master plan №4 markdown not found");
const sourcePath = `docs/${planName}`;
const sourceText = readFileSync(join(root, sourcePath));
const sha256 = createHash("sha256").update(sourceText).digest("hex");

const stop = ["scope expansion", "destructive migration", "new secret", "paid external action", "github"];
const implActions = ["read", "edit", "test", "commit", "push"];
const deliveryActions = ["read", "commit", "push", "create_pr", "merge"];
const ctx = ["docs/legacy/plans/AMS_MASTER_PLAN №4.md", "docs/03_ARCHITECTURE.md", "docs/PROJECT.md"];

function epic(key, title, goal, scope, acceptance, dependsOn, wave, extraStop = ["production", "github"]) {
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
		priority: 1,
		labels: [wave, "approval:owner-approved", "delivery:merge-after-gate"],
	};
}

function task(key, title, parent, goal, scope, acceptance, checks, dependsOn, wave, kind = "implementation") {
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
		stop_conditions: kind === "delivery" ? ["production", "github"] : stop,
		priority: 1,
		labels: [wave, kind === "delivery" ? "work:delivery" : "work:implementation"],
	};
}

function delivery(parent, dependsOn, wave, gate) {
	return task(
		`${parent.replace("EPIC-", "TASK-")}-DELIVERY`,
		`Deliver ${parent} to SourceCraft main`,
		parent,
		"PR merged to SourceCraft main after exact-head gate; epic branch deleted. No GitHub.",
		["PR", "gate", "merge", "branch cleanup"],
		["merged into main", "GitHub not updated by this task"],
		["PR source/target/head SHA", gate],
		dependsOn,
		wave,
		"delivery",
	);
}

const nodes = [];

nodes.push(epic("EPIC-01", "Demo topology canon", "Docs state this repo is a demo on local PostgreSQL + MEDIA_DIR; no purchase.", ["01"], ["docs do not require managed DB or S3"], [], "wave:docs"));
nodes.push(task("TASK-01-01", "Align PROJECT/OPERATIONS/ADR to demo local PostgreSQL", "EPIC-01", "Remove purchase-oriented wording; keep local PG + MEDIA_DIR as this project canon.", ["01"], ["no purchase language as a TODO", "verify:clone-readiness still local topology"], ["pnpm verify:clone-readiness", "pnpm verify:production-topology"], [], "wave:docs"));
nodes.push(delivery("EPIC-01", ["TASK-01-01"], "wave:docs", "SourceCraft STANDARD gate"));

nodes.push(epic("EPIC-02", "Proxy REST proof", "Prove Next 16 proxy.ts denies anonymous Payload REST.", ["02"], ["deny proof in verify:security-boundaries", "proxy.ts not renamed to middleware"], ["EPIC-01"], "wave:security"));
nodes.push(task("TASK-02-01", "Anonymous REST deny proof without renaming proxy", "EPIC-02", "Keep src/proxy.ts; extend verify/integration deny tests; Leads.ts comment on public intake path.", ["02"], ["proxy export remains", "anonymous business REST deny covered by verify"], ["pnpm verify:security-boundaries"], [], "wave:security"));
nodes.push(delivery("EPIC-02", ["TASK-02-01"], "wave:security", "SourceCraft RISKY gate"));

nodes.push(epic("EPIC-03", "Gateway layout", "Public and System gateways live under src/core/data-access.", ["03"], ["no src/core/data-access/public", "overrideAccess only in system gateway"], ["EPIC-02"], "wave:layout"));
nodes.push(task("TASK-03-01", "Move public/system/security/seo/http gateways", "EPIC-03", "Relocate existing modules; update guards and imports; do not create empty core folders.", ["03"], ["architecture-guard whitelist updated", "public-gateway and security-boundaries pass"], ["pnpm quality:architecture", "pnpm verify:public-gateway", "pnpm verify:security-boundaries", "pnpm typecheck"], [], "wave:layout"));
nodes.push(delivery("EPIC-03", ["TASK-03-01"], "wave:layout", "SourceCraft RISKY gate"));

nodes.push(epic("EPIC-04", "Env schema", "Runtime fail-fast without breaking Next build phase.", ["04"], ["empty NEXT_PUBLIC_SERVER_URL fails runtime", "build phase still compiles"], ["EPIC-03"], "wave:runtime"));
nodes.push(task("TASK-04-01", "Tighten env fail-fast and PROJECT mapping table", "EPIC-04", "Align Zod + evaluateRuntimeEnv; unknown LEAD_CHANNELS fail; no CRM/telegram keys.", ["04"], ["runtime missing MAX creds fails when channel enabled", "build phase does not require DATABASE_URI"], ["pnpm verify:health-alerts", "pnpm verify:owner-operations"], [], "wave:runtime"));
nodes.push(delivery("EPIC-04", ["TASK-04-01"], "wave:runtime", "SourceCraft RISKY gate"));

nodes.push(epic("EPIC-05", "Cache split and 18A", "Split invalidators; extend existing verify scripts for 18A.", ["05"], ["no top-level next/cache in http adapter", "18A matrix updated"], ["EPIC-04"], "wave:proof"));
nodes.push(task("TASK-05-01", "Split cache adapters and extend verify proofs", "EPIC-05", "http vs in-process files; extend existing verify:* ; live B2 may stay NOT PROVEN.", ["05"], ["architecture/security guards pass", "18A matrix cites this SHA"], ["pnpm verify:jobs-config", "pnpm verify:security-boundaries", "pnpm verify:feed-lifecycle", "pnpm verify:lead-outbox"], [], "wave:proof"));
nodes.push(delivery("EPIC-05", ["TASK-05-01"], "wave:proof", "SourceCraft RISKY gate"));

nodes.push(epic("EPIC-06", "UI composition", "Home/layout composition without visual redesign.", ["06"], ["page.tsx is section composition", "no live atlas rewrite"], ["EPIC-05"], "wave:ui"));
nodes.push(task("TASK-06-01", "Compose home/shell sections and retire dead home-page CSS path", "EPIC-06", "Split HomePageView usage; DESIGN.md dark DISABLED; dead CSS not treated as live DS.", ["06"], ["home page composition", "design-tokens and a11y-starter pass"], ["pnpm quality:design-tokens", "pnpm verify:a11y-starter"], [], "wave:ui"));
nodes.push(delivery("EPIC-06", ["TASK-06-01"], "wave:ui", "SourceCraft STANDARD gate"));

nodes.push(epic("EPIC-07", "Drift guards", "Static drift audit on imported CSS only.", ["07"], ["verify:drift exists", "imported CSS size guard"], ["EPIC-06"], "wave:ui"));
nodes.push(task("TASK-07-01", "Add verify:drift and imported CSS size guard", "EPIC-07", "Executable checks; no 10KB fail on unused atlas dump.", ["07"], ["pnpm verify:drift PASS", "verify:daily includes it"], ["pnpm verify:drift", "pnpm quality:guards"], [], "wave:ui"));
nodes.push(delivery("EPIC-07", ["TASK-07-01"], "wave:ui", "SourceCraft STANDARD gate"));

nodes.push(epic("EPIC-08", "ISR and leftovers", "Marketing pages not force-dynamic; leftover dirs; ADRs for embla/yarl/lucide.", ["08"], ["force-dynamic reduced on marketing routes", "align audit note written"], ["EPIC-07"], "wave:cleanup"));
nodes.push(task("TASK-08-01", "ISR marketing pages, move leftovers, write ADRs", "EPIC-08", "No p95 live gate; no GitHub; no production.", ["08"], ["seo-contracts pass", "CORE_ALIGN_AUDIT.md exists"], ["pnpm verify:seo-contracts", "pnpm verify:daily"], [], "wave:cleanup"));
nodes.push(delivery("EPIC-08", ["TASK-08-01"], "wave:cleanup", "SourceCraft STANDARD gate"));

const inventory = {
	schema_version: 2,
	beads_prefix: "ral",
	source: {
		plan_id: "AMS-REALTBASE-CORE-ALIGN",
		path: sourcePath,
		version: "v1",
		status: "APPROVED",
		approved_by: "owner",
		approved_at: "2026-09-18T22:47:00+03:00",
		sha256,
		epic_anchors: ["EPIC-01", "EPIC-02", "EPIC-03", "EPIC-04", "EPIC-05", "EPIC-06", "EPIC-07", "EPIC-08"],
	},
	nodes,
};

const out = join(root, "docs", "legacy", "orchestration", "master-plan-4.inventory.json");
writeFileSync(out, `${JSON.stringify(inventory, null, "\t")}\n`);
console.log(`wrote ${out} sha256=${sha256} nodes=${nodes.length}`);
