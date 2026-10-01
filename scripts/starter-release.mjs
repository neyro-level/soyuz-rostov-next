import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateStarterVersion } from "./starter-ownership.mjs";

export const starterTagPattern = /^starter-v2\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/;

export function validateStarterTag(tag) {
	if (typeof tag !== "string" || !starterTagPattern.test(tag)) {
		throw new Error("Starter tag must match starter-v2.MINOR.PATCH with canonical integers.");
	}
	return tag;
}

export function validateStarterReleaseManifest(value, { expectedTag, expectedSha, expectedHashes } = {}) {
	if (!value || typeof value !== "object" || Array.isArray(value) || value.schemaVersion !== 1) {
		throw new Error("Starter release manifest schemaVersion must equal 1.");
	}
	validateStarterTag(value.tag);
	if (value.status !== "released") throw new Error("Starter release manifest status must be released.");
	validateStarterVersion({
		schemaVersion: 1,
		tag: value.tag,
		sha: value.sha,
		manifestVersion: value.starterOwnedManifestVersion,
		hashes: value.hashes,
	}, { expectedTag, expectedSha });
	if (expectedHashes) {
		const actualEntries = Object.entries(value.hashes).sort(([left], [right]) => left.localeCompare(right, "en"));
		const expectedEntries = Object.entries(expectedHashes).sort(([left], [right]) => left.localeCompare(right, "en"));
		if (JSON.stringify(actualEntries) !== JSON.stringify(expectedEntries)) {
			throw new Error("Starter release manifest hashes do not match the exact source tree.");
		}
	}
	return value;
}

export function readStarterReleaseManifest(path, expectations = {}) {
	if (typeof path !== "string" || !path) throw new Error("A starter release manifest path is required.");
	return validateStarterReleaseManifest(JSON.parse(readFileSync(resolve(path), "utf8")), expectations);
}
