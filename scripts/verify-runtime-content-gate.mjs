import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const runtime = readFileSync("src/project/routing/runtime-route.ts", "utf8");
const orchestration = readFileSync(
	"src/project/routing/content-gate.ts",
	"utf8",
);
const developmentGateway = readFileSync(
	"src/project/data-access/public/geo-catalog.ts",
	"utf8",
);
const metadata = readFileSync("src/app/(site)/[...segments]/page.tsx", "utf8");
const discovery = readFileSync("src/project/seo/discovery-runtime.ts", "utf8");
const resolver = readFileSync("src/core/routing/resolver.ts", "utf8");

assert.match(runtime, /decision:\s*decidePage\(decision, data\)/);
assert.match(runtime, /decision:\s*decidePage\(decision, routeData\)/);
assert.match(runtime, /getDevelopmentRouteFacts/);
assert.match(runtime, /getDeveloperRouteFacts/);
assert.match(orchestration, /export function decidePage/);
assert.match(orchestration, /ownedPhotoCount/);
assert.match(orchestration, /gateFacts/);
assert.match(orchestration, /descriptionSource/);
for (const fact of [
	"developerPresent",
	"cityPresent",
	"addressPresent",
	"coordinatesPresent",
	"classPresent",
	"completionOrDeadlinePresent",
	"salesStatusPresent",
	"descriptionSource",
	"descriptionCheckedAt",
	"validPriceRows",
	"validMediaCount",
	"validLayoutCount",
]) {
	assert.match(developmentGateway, new RegExp(fact));
}
assert.match(metadata, /indexing:\s*result\.decision\.robots\.indexing/);
assert.match(metadata, /following:\s*result\.decision\.robots\.following/);
assert.doesNotMatch(metadata, /indexing:\s*["']index["']/);
assert.match(discovery, /entry\.gate/);
assert.doesNotMatch(discovery, /resolveRuntimeRoute/);
assert.doesNotMatch(discovery, /indexing:\s*["']index["']/);
assert.doesNotMatch(resolver, /robots:\s*\{/);
assert.doesNotMatch(resolver, /inSitemap:\s*!/);

console.log(
	"runtime Content Gate wiring verified: route, metadata, discovery and factual inputs",
);
