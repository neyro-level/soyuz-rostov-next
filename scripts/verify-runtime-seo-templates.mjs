import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const runtime = readFileSync("src/project/routing/runtime-route.ts", "utf8");
const metadata = readFileSync("src/app/(site)/[...segments]/page.tsx", "utf8");
const gate = readFileSync("src/project/routing/content-gate.ts", "utf8");
const nap = readFileSync("src/project/data-access/public/nap.ts", "utf8");

assert.match(nap, /export async function findPublicNap/);
assert.match(nap, /slug:\s*["']site-settings["']/);
assert.match(runtime, /const nap = await findPublicNap\(publicPayload\)/);
assert.match(runtime, /const brandName = nap\.brandName/);
assert.match(runtime, /getGeoHub\(payload, pageKey\.geo, brandName, grammar\)/);
assert.match(runtime, /getDevelopment\(payload, pageKey\.slug, brandName\)/);
assert.match(metadata, /projectSeoMeta/);
assert.doesNotMatch(metadata, /title:\s*["']Застройщики["']/);
assert.match(metadata, /return data\.seo/);
assert.match(runtime, /publishedDeveloperGeoSlugs\(siteProfile\)/);
assert.match(runtime, /collectPassingDeveloperIds\(decisions\)/);
assert.match(runtime, /templateKey, context, key/);
assert.match(metadata, /result\.nap\.brandName/);
assert.match(metadata, /indexing:\s*result\.decision\.robots\.indexing/);
assert.match(metadata, /following:\s*result\.decision\.robots\.following/);
assert.match(gate, /runtime_morphology_unapproved/);
assert.match(gate, /inSitemap:\s*false/);

console.log(
	"runtime SEO proof passed: Site Settings brand, project templates, Gate robots and morphology fail-closed",
);
