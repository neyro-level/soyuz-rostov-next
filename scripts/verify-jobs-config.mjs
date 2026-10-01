import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const queueModule = await import(
	pathToFileURL(join(root, "src/project/jobs/queues.ts")).href
);
const registryModule = await import(
	pathToFileURL(join(root, "src/project/jobs/registry.ts")).href
);
const packageJson = JSON.parse(
	readFileSync(join(root, "package.json"), "utf8"),
);
const tasksSource = readFileSync(
	join(root, "src/project/jobs/tasks.ts"),
	"utf8",
);
const lifecycleEventsSource = readFileSync(
	join(root, "src/project/collections/LifecycleEvents.ts"),
	"utf8",
);
const pagesSource = readFileSync(
	join(root, "src/project/collections/Pages.ts"),
	"utf8",
);
const indexNowEnqueueSource = readFileSync(
	join(root, "src/project/jobs/indexnow-enqueue.ts"),
	"utf8",
);

const expectedQueues = new Map([
	[
		"system",
		{ limit: 5, disableScheduling: false, staticTasks: ["dispatchDueFeeds"] },
	],
	[
		"imports",
		{ limit: 1, disableScheduling: true, programmaticTasks: ["importFeed"] },
	],
	[
		"maintenance",
		{
			limit: 5,
			disableScheduling: false,
			staticTasks: [
				"jobsJanitor",
				"leadRetentionCleanup",
				"catalogLifecycle",
				"recoverLeadDeliveries",
			],
		},
	],
	[
		"lead-deliveries",
		{ limit: 10, disableScheduling: true, programmaticTasks: ["deliverLead"] },
	],
	[
		"index-now",
		{
			limit: 2,
			disableScheduling: true,
			programmaticTasks: ["submitIndexNow"],
		},
	],
]);
const expectedTaskSlugs = new Set(
	[...expectedQueues.values()].flatMap((queue) => [
		...(queue.staticTasks ?? []),
		...(queue.programmaticTasks ?? []),
	]),
);
const expectedAutoRunTicker = "* * * * *";

const autoRun = queueModule.payloadJobsAutoRun;
const registry = registryModule.payloadJobRegistry;

if (!Array.isArray(autoRun)) {
	throw new Error("payloadJobsAutoRun must be an array.");
}

for (const [queue, expected] of expectedQueues) {
	const entry = autoRun.find((item) => item.queue === queue);
	const registryEntries = registry.filter((item) => item.queue === queue);

	if (!entry) {
		throw new Error(`Missing autoRun entry for queue "${queue}".`);
	}

	if (registryEntries.length === 0) {
		throw new Error(`Missing registry entries for queue "${queue}".`);
	}

	if (entry.allQueues === true) {
		throw new Error(`Queue "${queue}" must not use allQueues.`);
	}

	if (entry.cron !== expectedAutoRunTicker) {
		throw new Error(`Queue "${queue}" must run every minute.`);
	}

	if (entry.limit !== expected.limit) {
		throw new Error(
			`Queue "${queue}" limit must be ${expected.limit}, got ${entry.limit}.`,
		);
	}

	if (entry.disableScheduling !== expected.disableScheduling) {
		throw new Error(
			`Queue "${queue}" disableScheduling must be ${expected.disableScheduling}.`,
		);
	}

	const triggers = new Set(registryEntries.map((item) => item.trigger));
	if (triggers.size !== 1) {
		throw new Error(
			`Queue "${queue}" must not mix static and programmatic tasks.`,
		);
	}
	const expectedDisableScheduling = triggers.has("programmatic");
	if (entry.disableScheduling !== expectedDisableScheduling) {
		throw new Error(
			`Queue "${queue}" scheduling mode contradicts its ${[...triggers][0]} registry tasks.`,
		);
	}

	const staticTasks = registryEntries
		.filter((item) => item.trigger === "static")
		.map((item) => item.slug)
		.sort();
	const programmaticTasks = registryEntries
		.filter((item) => item.trigger === "programmatic")
		.map((item) => item.slug)
		.sort();

	if (
		JSON.stringify(staticTasks) !==
		JSON.stringify([...(expected.staticTasks ?? [])].sort())
	) {
		throw new Error(`Queue "${queue}" static task registry mismatch.`);
	}

	if (
		JSON.stringify(programmaticTasks) !==
		JSON.stringify([...(expected.programmaticTasks ?? [])].sort())
	) {
		throw new Error(`Queue "${queue}" programmatic task registry mismatch.`);
	}
}

for (const entry of autoRun) {
	if (!expectedQueues.has(entry.queue)) {
		throw new Error(`Unexpected autoRun queue "${entry.queue}".`);
	}
}

for (const entry of registry) {
	if (!expectedTaskSlugs.has(entry.slug)) {
		throw new Error(`Unexpected task slug "${entry.slug}".`);
	}

	if (entry.trigger === "programmatic" && entry.cron) {
		throw new Error(`Programmatic task "${entry.slug}" must not declare cron.`);
	}

	if (entry.trigger === "static" && !entry.cron) {
		throw new Error(`Static task "${entry.slug}" must declare cron.`);
	}
}

for (const slug of expectedTaskSlugs) {
	if (!tasksSource.includes(`payloadJobTaskSlugs.${slug}`)) {
		throw new Error(`Missing Payload task handler for "${slug}".`);
	}
}

for (const entry of registry) {
	const slugReference = `payloadJobTaskSlugs.${entry.slug}`;
	const slugIndex = tasksSource.indexOf(slugReference);

	if (slugIndex === -1) {
		throw new Error(`Missing Payload task handler for "${entry.slug}".`);
	}

	const taskSlice = tasksSource.slice(
		slugIndex,
		tasksSource.indexOf("\n\t},", slugIndex),
	);

	if (entry.trigger === "programmatic" && taskSlice.includes("schedule:")) {
		throw new Error(
			`Programmatic task "${entry.slug}" must not declare schedule.`,
		);
	}

	if (entry.trigger === "static" && !taskSlice.includes("schedule:")) {
		throw new Error(`Static task "${entry.slug}" must declare schedule.`);
	}
}

const scripts = Object.entries(packageJson.scripts ?? {});
const cliScheduleScripts = scripts.filter(([, command]) =>
	/ jobs:(handle-schedules|run)\b/.test(command),
);

if (cliScheduleScripts.length > 0) {
	throw new Error(
		`CLI jobs scheduling scripts are not allowed for REALTY_BASE autoRun queues: ${cliScheduleScripts
			.map(([name]) => name)
			.join(", ")}.`,
	);
}

const { projectConfig } = await import(
	pathToFileURL(join(root, "src/project/project.config.ts")).href
);
const expectedMaintenanceCron = `*/${projectConfig.maintenanceIntervalMinutes} * * * *`;
const expectedDispatcherCron = `*/${projectConfig.dispatcherIntervalMinutes} * * * *`;
const dispatcher = registry.find((item) => item.slug === "dispatchDueFeeds");
if (dispatcher?.cron !== expectedDispatcherCron) {
	throw new Error(
		`dispatchDueFeeds cron must be ${expectedDispatcherCron}, got ${dispatcher?.cron ?? "missing"}.`,
	);
}
for (const slug of [
	"jobsJanitor",
	"leadRetentionCleanup",
	"catalogLifecycle",
	"recoverLeadDeliveries",
]) {
	const entry = registry.find((item) => item.slug === slug);
	if (entry?.cron !== expectedMaintenanceCron) {
		throw new Error(
			`Maintenance task "${slug}" cron must be ${expectedMaintenanceCron}.`,
		);
	}
}

if (registry.some((item) => item.queue === "default")) {
	throw new Error("Implicit default queue must not be used.");
}

const payloadConfig = readFileSync(join(root, "payload.config.ts"), "utf8");

if (!payloadConfig.includes("enableConcurrencyControl: true")) {
	throw new Error("Payload jobs must enable concurrency control.");
}

const architecture = readFileSync(
	join(root, "docs/03_ARCHITECTURE.md"),
	"utf8",
);
for (const marker of [
	"queue polling/execution",
	`autoRun\` cron \`${expectedAutoRunTicker}`,
	`dispatchDueFeeds\` = \`${expectedDispatcherCron}`,
	"Static queues keep `disableScheduling=false`",
	"queues keep `disableScheduling=true`",
	"`enableConcurrencyControl=true` remains",
]) {
	if (!architecture.includes(marker)) {
		throw new Error(`Architecture jobs contract marker is missing: ${marker}`);
	}
}
if (
	!new RegExp(
		"recoverLeadDeliveries`\\s*=\\s*`" +
			expectedMaintenanceCron.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
			"`",
	).test(architecture)
) {
	throw new Error(
		"Architecture maintenance schedule contract marker is missing.",
	);
}

if (
	!payloadConfig.includes("shouldAutoRun: async () => runtimeEnv.JOBS_AUTORUN")
) {
	throw new Error("Payload jobs autoRun must be gated by JOBS_AUTORUN.");
}

if (tasksSource.includes("nextDueAt: { less_than_equal")) {
	throw new Error("dispatchDueFeeds must not find-then-update feed-sources.");
}

if (!tasksSource.includes("claimDueFeedSources")) {
	throw new Error("dispatchDueFeeds must use atomic claimDueFeedSources.");
}

const ingestSql = readFileSync(
	join(root, "src/core/data-access/ingest/sql/index.ts"),
	"utf8",
);
if (!ingestSql.includes("source.next_due_at IS NULL")) {
	throw new Error(
		"claimDueFeedSources must include enabled sources with null nextDueAt.",
	);
}

if (!tasksSource.includes("claimQueuedImportRun")) {
	throw new Error("importFeed must claim queued runs atomically.");
}

if (!tasksSource.includes("touchImportRunHeartbeat")) {
	throw new Error("importFeed must heartbeat outside the ingest transaction.");
}

if (tasksSource.includes('implementedBy: "lead-delivery-adapter"')) {
	throw new Error("deliverLead stub must be replaced by the runtime pipeline.");
}

if (!tasksSource.includes("runDeliverLeadTask")) {
	throw new Error("deliverLead must call runDeliverLeadTask.");
}

if (!tasksSource.includes("runIndexNowTask")) {
	throw new Error("submitIndexNow must call the isolated IndexNow worker.");
}
if (!lifecycleEventsSource.includes("queueLifecycleIndexNowEvent")) {
	throw new Error("Lifecycle events must enqueue Gate-driven IndexNow work.");
}
if (!pagesSource.includes("queuePageIndexNowTransition")) {
	throw new Error("CMS page indexability changes must enqueue IndexNow work.");
}
if (!indexNowEnqueueSource.includes("findPayloadJobByConcurrencyKey")) {
	throw new Error("IndexNow enqueue must use durable event deduplication.");
}
if (
	/fetch\s*\(/.test(lifecycleEventsSource + pagesSource + indexNowEnqueueSource)
) {
	throw new Error(
		"IndexNow producers must not make external requests in hooks.",
	);
}

if (!tasksSource.includes("retries: 0")) {
	throw new Error("deliverLead platform retries must be 0.");
}

if (!tasksSource.includes("invalidatePublicCache")) {
	throw new Error("import-feed must use the canonical public cache facade.");
}
if (tasksSource.includes("postBatchedHttpRevalidate")) {
	throw new Error(
		"import-feed must not bypass the canonical public cache facade.",
	);
}

const revalidateRoute = readFileSync(
	join(root, "src", "app", "api", "internal", "revalidate", "route.ts"),
	"utf8",
);
if (!revalidateRoute.includes("invalidateInProcessCacheTargets")) {
	throw new Error(
		"HTTP revalidate route must call the explicitly named in-process executor.",
	);
}
if (revalidateRoute.includes("invalidatePublicCache")) {
	throw new Error(
		"HTTP revalidate route must not recursively call the public HTTP facade.",
	);
}
if (!revalidateRoute.includes("executeInternalRevalidation")) {
	throw new Error(
		"HTTP revalidate route must delegate auth and validation to its canonical executor.",
	);
}
if (
	!revalidateRoute.includes(
		'request.headers.get("x-ams-revalidate-secret") ===',
	)
) {
	throw new Error(
		"authenticated internal self-calls must bypass the application bucket before Route Handler validation.",
	);
}
if (/from\s+["']next\/cache["']/.test(revalidateRoute)) {
	throw new Error(
		"HTTP revalidate route must not top-level import next/cache.",
	);
}

const httpAdapter = readFileSync(
	join(root, "src", "core", "cache", "http-revalidate.ts"),
	"utf8",
);
if (httpAdapter.includes("next/cache")) {
	throw new Error("HTTP cache adapter must not import next/cache.");
}

const publicInvalidator = readFileSync(
	join(root, "src", "core", "cache", "invalidator.ts"),
	"utf8",
);
if (!publicInvalidator.includes("invalidatePublicCache")) {
	throw new Error("cache invalidator must expose the canonical public facade.");
}
if (!publicInvalidator.includes("postBatchedHttpRevalidate")) {
	throw new Error("canonical public cache facade must use the HTTP adapter.");
}
if (publicInvalidator.includes("invalidateInProcessCacheTargets")) {
	throw new Error(
		"canonical public cache facade must not silently fall back in-process.",
	);
}

const routeExecutor = readFileSync(
	join(root, "src", "core", "cache", "internal-route-executor.ts"),
	"utf8",
);
if (routeExecutor.includes("next/cache")) {
	throw new Error(
		"Internal Route Handler executor must not import next/cache.",
	);
}

console.log("Jobs config verified.");
