import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path) {
	return readFileSync(path, "utf8");
}

const project = read("docs/PROJECT.md");
const architecture = read("docs/03_ARCHITECTURE.md");
const operations = read("docs/OPERATIONS.md");
const releaseChecklist = read("docs/05_RELEASE_CHECKLIST.md");
const envExample = read(".env.example");
const payloadConfig = read("payload.config.ts");

for (const file of [
	["docs/PROJECT.md", project],
	["docs/03_ARCHITECTURE.md", architecture],
	["docs/OPERATIONS.md", operations],
	["docs/05_RELEASE_CHECKLIST.md", releaseChecklist],
]) {
	assert.ok(
		file[1].includes("start-baza.ams24.ru"),
		`${file[0]} must pin the internal production domain`,
	);
	assert.ok(
		file[1].includes("noindex"),
		`${file[0]} must keep the internal production instance noindex`,
	);
}

for (const required of [
	"local PostgreSQL",
	"MEDIA_DIR",
	"Secret Master",
	"JOBS_AUTORUN=true",
]) {
	assert.ok(
		`${project}\n${architecture}\n${operations}`.includes(required),
		`starter topology missing ${required}`,
	);
}

assert.ok(
	!payloadConfig.includes("storage-s3"),
	"payload.config.ts must not import storage-s3",
);
assert.ok(
	operations.includes("offsite"),
	"Operations must require offsite backup copy",
);
assert.ok(
	operations.includes("Independent alert channel"),
	"Operations must pin an independent alert channel",
);
assert.match(operations, /`\/robots\.txt`, `\/sitemap\.xml`/);
assert.match(operations, /expected sitemap shard/);
assert.match(operations, /previously observed public URLs/);
assert.ok(
	operations.includes("ALERT_WEBHOOK_URL"),
	"Operations must name the primary alert destination",
);

const compose = read("deploy/compose/start-baza.compose.yml");
assert.ok(
	compose.includes('JOBS_AUTORUN: "true"'),
	"compose must start exactly one jobs owner with JOBS_AUTORUN=true",
);
assert.ok(
	compose.includes("MEDIA_DIR: /var/lib/ams/realtbase/media"),
	"compose must pin persistent MEDIA_DIR",
);
assert.ok(
	compose.includes("/var/lib/ams/realtbase/media:/var/lib/ams/realtbase/media"),
	"compose must persist MEDIA_DIR across recreate",
);

const nginx = read("deploy/nginx/start-baza.ams24.ru.conf");
assert.ok(nginx.includes("location /media/"), "nginx must alias local media");
assert.ok(
	nginx.includes("limit_req zone=ams_login"),
	"nginx must rate-limit login",
);
assert.ok(
	nginx.includes("INDEXING_POLICY=noindex") &&
		nginx.includes('X-Robots-Tag "noindex, nofollow"'),
	"starter Nginx indexing header must match the semantic noindex policy",
);
assert.ok(
	read("deploy/clients/timeweb/nginx/site.conf.example").includes(
		"__INDEXING_X_ROBOTS_TAG__",
	),
	"client Nginx blueprint must require an explicit indexing-policy rendering",
);

for (const requiredEnv of [
	"DATABASE_URI=",
	"DATABASE_POOL_MAX=",
	"PAYLOAD_SECRET=",
	"REVALIDATE_SECRET=",
	"INTERNAL_HEALTH_SECRET=",
	"MEDIA_DIR=",
	"JOBS_AUTORUN=false",
	"CACHE_INVALIDATION_MODE=http",
]) {
	assert.ok(
		envExample.includes(requiredEnv),
		`.env.example missing ${requiredEnv}`,
	);
}

for (const forbiddenEnv of [
	"S3_ENDPOINT=",
	"S3_BUCKET=",
	"S3_ACCESS_KEY=",
	"S3_SECRET_KEY=",
]) {
	assert.equal(
		envExample.includes(forbiddenEnv),
		false,
		`.env.example must not require starter S3 env ${forbiddenEnv}`,
	);
}

const packageJson = JSON.parse(read("package.json"));
const dependencies = {
	...(packageJson.dependencies ?? {}),
	...(packageJson.devDependencies ?? {}),
};
assert.equal(
	Object.hasOwn(dependencies, "@payloadcms/storage-s3"),
	false,
	"starter must not declare @payloadcms/storage-s3 as a required dependency",
);

const adr = read("docs/adr/ADR-LOCAL-STARTER-STORAGE.md");
assert.ok(
	adr.includes("Accepted"),
	"ADR-LOCAL-STARTER-STORAGE must remain Accepted",
);
assert.ok(
	adr.includes("не копирует эту topology автоматически"),
	"ADR must state commercial clone does not copy starter topology automatically",
);

const agents = read("AGENTS.md");
assert.ok(
	agents.includes("local PostgreSQL"),
	"AGENTS.md must pin local PostgreSQL starter runtime",
);
assert.ok(
	agents.includes("MEDIA_DIR"),
	"AGENTS.md must pin MEDIA_DIR starter runtime",
);

const composeForbidden = [
	"storage-s3",
	"S3_BUCKET",
	"timeweb-cloud.com/dbaas",
	"Managed PostgreSQL",
];
for (const needle of composeForbidden) {
	assert.equal(
		compose.includes(needle),
		false,
		`compose must not require ${needle} as starter runtime`,
	);
}

for (const [name, body] of [
	["docs/PROJECT.md", project],
	["docs/03_ARCHITECTURE.md", architecture],
	["docs/OPERATIONS.md", operations],
]) {
	assert.equal(
		/S3 is required for starter/i.test(body) ||
			body.includes("starter requires S3"),
		false,
		`${name} must not require S3 as this starter runtime`,
	);
	assert.equal(
		body.includes("buy Timeweb Managed PostgreSQL"),
		false,
		`${name} must not require buying Managed PostgreSQL for this starter`,
	);
}

assert.ok(
	operations.includes("pg_dump -Fc"),
	"Operations backup canon must remain local PostgreSQL dump",
);
assert.ok(
	operations.includes("archive `MEDIA_DIR`") ||
		operations.includes("archive MEDIA_DIR"),
	"Operations backup canon must remain MEDIA_DIR snapshot",
);

assert.ok(
	project.includes("leadRetentionDays = NEEDS_OWNER"),
	"PROJECT.md must keep leadRetentionDays as NEEDS_OWNER until clone configuration",
);
assert.ok(
	project.includes("archiveRetentionDays = NEEDS_OWNER"),
	"PROJECT.md must keep archiveRetentionDays as NEEDS_OWNER until production",
);

console.log("verify-production-topology: ok");
