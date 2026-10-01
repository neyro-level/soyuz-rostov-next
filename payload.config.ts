import { postgresAdapter } from "@payloadcms/db-postgres";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildConfig } from "payload";
import sharp from "sharp";
import { Cities } from "./src/project/collections/Cities.ts";
import { Districts } from "./src/project/collections/Districts.ts";
import { Developers } from "./src/project/collections/Developers.ts";
import { Developments } from "./src/project/collections/Developments.ts";
import { FeedSources } from "./src/project/collections/FeedSources.ts";
import { ImportIssues } from "./src/project/collections/ImportIssues.ts";
import { ImportRuns } from "./src/project/collections/ImportRuns.ts";
import { LeadDeliveries } from "./src/project/collections/LeadDeliveries.ts";
import { Leads } from "./src/project/collections/Leads.ts";
import { LifecycleEvents } from "./src/project/collections/LifecycleEvents.ts";
import { Media } from "./src/project/collections/Media.ts";
import { Pages } from "./src/project/collections/Pages.ts";
import { Properties } from "./src/project/collections/Properties.ts";
import { Redirects } from "./src/project/collections/Redirects.ts";
import { Regions } from "./src/project/collections/Regions.ts";
import { Users } from "./src/project/collections/Users.ts";
import { runtimeEnv } from "./src/project/env.ts";
import { SiteSettings } from "./src/project/globals/SiteSettings.ts";
import { payloadJobsAutoRun } from "./src/project/jobs/queues.ts";
import { payloadJobTasks } from "./src/project/jobs/tasks.ts";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const databaseUri =
	runtimeEnv.DATABASE_URI ??
	"postgresql://127.0.0.1:5432/ams_realtbase_not_configured";
const payloadSecret =
	runtimeEnv.PAYLOAD_SECRET ??
	"build-only-payload-secret-replace-before-runtime";

export default buildConfig({
	admin: {
		user: Users.slug,
	},
	collections: [
		Users,
		Pages,
		Regions,
		Cities,
		Districts,
		Developers,
		Developments,
		Properties,
		FeedSources,
		ImportRuns,
		ImportIssues,
		Leads,
		LeadDeliveries,
		LifecycleEvents,
		Media,
		Redirects,
	],
	globals: [SiteSettings],
	cors: runtimeEnv.NEXT_PUBLIC_SERVER_URL
		? [runtimeEnv.NEXT_PUBLIC_SERVER_URL]
		: [],
	csrf: runtimeEnv.NEXT_PUBLIC_SERVER_URL
		? [runtimeEnv.NEXT_PUBLIC_SERVER_URL]
		: [],
	cookiePrefix: "payload",
	db: postgresAdapter({
		migrationDir: resolve(projectRoot, "migrations"),
		pool: {
			connectionString: databaseUri,
			max: runtimeEnv.DATABASE_POOL_MAX,
		},
		push:
			process.env.NODE_ENV === "production"
				? false
				: runtimeEnv.PAYLOAD_DB_PUSH,
	}),
	graphQL: {
		disable: true,
	},
	jobs: {
		enableConcurrencyControl: true,
		autoRun: payloadJobsAutoRun,
		tasks: payloadJobTasks,
		shouldAutoRun: async () => runtimeEnv.JOBS_AUTORUN,
	},
	secret: payloadSecret,
	serverURL: runtimeEnv.NEXT_PUBLIC_SERVER_URL,
	sharp,
	typescript: {
		outputFile: resolve(projectRoot, "src/project/payload-types.ts"),
	},
});
