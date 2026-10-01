export const payloadJobQueues = {
	system: "system",
	imports: "imports",
	maintenance: "maintenance",
	leadDeliveries: "lead-deliveries",
	indexNow: "index-now",
} as const;

export const payloadJobTaskSlugs = {
	dispatchDueFeeds: "dispatchDueFeeds",
	importFeed: "importFeed",
	jobsJanitor: "jobsJanitor",
	leadRetentionCleanup: "leadRetentionCleanup",
	catalogLifecycle: "catalogLifecycle",
	recoverLeadDeliveries: "recoverLeadDeliveries",
	deliverLead: "deliverLead",
	submitIndexNow: "submitIndexNow",
} as const;

export type PayloadJobQueue = (typeof payloadJobQueues)[keyof typeof payloadJobQueues];
export type PayloadJobTaskSlug =
	(typeof payloadJobTaskSlugs)[keyof typeof payloadJobTaskSlugs];
export type PayloadJobTrigger = "static" | "programmatic";

export type PayloadJobRegistryEntry = {
	readonly slug: PayloadJobTaskSlug;
	readonly queue: PayloadJobQueue;
	readonly trigger: PayloadJobTrigger;
	readonly cron?: string;
	readonly responsibility: string;
};

export const payloadJobRegistry = [
	{
		slug: payloadJobTaskSlugs.dispatchDueFeeds,
		queue: payloadJobQueues.system,
		trigger: "static",
		cron: "*/5 * * * *",
		responsibility: "Find due feeds, claim one run, and enqueue importFeed.",
	},
	{
		slug: payloadJobTaskSlugs.importFeed,
		queue: payloadJobQueues.imports,
		trigger: "programmatic",
		responsibility: "Download, parse, ingest, report, and invalidate feed cache.",
	},
		{
			slug: payloadJobTaskSlugs.jobsJanitor,
			queue: payloadJobQueues.maintenance,
			trigger: "static",
			cron: "*/15 * * * *",
			responsibility: "Inspect stale or orphan import runs and perform trusted recovery.",
		},
		{
			slug: payloadJobTaskSlugs.leadRetentionCleanup,
			queue: payloadJobQueues.maintenance,
			trigger: "static",
			cron: "*/15 * * * *",
			responsibility: "Delete or anonymize expired leads and linked deliveries.",
		},
		{
			slug: payloadJobTaskSlugs.catalogLifecycle,
			queue: payloadJobQueues.maintenance,
			trigger: "static",
			cron: "*/15 * * * *",
			responsibility: "Apply archive retention, content purge, redirects, and 410 lifecycle.",
		},
		{
			slug: payloadJobTaskSlugs.recoverLeadDeliveries,
			queue: payloadJobQueues.maintenance,
			trigger: "static",
			cron: "*/15 * * * *",
			responsibility: "Recover stale sending deliveries and orphan due pending deliveries.",
		},
	{
		slug: payloadJobTaskSlugs.deliverLead,
		queue: payloadJobQueues.leadDeliveries,
		trigger: "programmatic",
		responsibility: "Claim one delivery, call adapter, record result, backoff, or requeue.",
	},
	{
		slug: payloadJobTaskSlugs.submitIndexNow,
		queue: payloadJobQueues.indexNow,
		trigger: "programmatic",
		responsibility: "Submit only change-driven canonical URLs to IndexNow.",
	},
] as const satisfies readonly PayloadJobRegistryEntry[];

export const staticPayloadJobTasks = payloadJobRegistry.filter(
	(task) => task.trigger === "static",
);

export const programmaticPayloadJobTasks = payloadJobRegistry.filter(
	(task) => task.trigger === "programmatic",
);

export function getPayloadJobTask(slug: PayloadJobTaskSlug) {
	return payloadJobRegistry.find((task) => task.slug === slug);
}

