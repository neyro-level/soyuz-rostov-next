import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { searchConsoleVerificationMetadata } from "../src/project/seo/search-console.ts";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
	dependencies: { next: string };
};
const installedNext = JSON.parse(
	readFileSync("node_modules/next/package.json", "utf8"),
) as { version: string };

assert.equal(packageJson.dependencies.next, "16.3.8");
assert.equal(installedNext.version, "16.3.8");
assert.equal(
	searchConsoleVerificationMetadata({ yandex: null, google: null }),
	undefined,
);
assert.deepEqual(
	searchConsoleVerificationMetadata({
		yandex: "yandex-verification-token",
		google: "google-site-verification-token",
	}),
	{ yandex: "yandex-verification-token", google: "google-site-verification-token" },
);
console.log("Search Console metadata contract passed for Next 16.3.8.");
