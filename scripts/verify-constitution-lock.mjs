import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join, normalize } from "node:path";

const root = process.cwd();
const lockPath = join(root, "config", "ams-constitution.lock.json");

function readJson(path) {
	return JSON.parse(readFileSync(path, "utf8"));
}

function sha256(path) {
	const normalized = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
	return createHash("sha256").update(normalized).digest("hex");
}

function assertLockedAuthority(name, entry) {
	assert.equal(typeof entry?.version, "string", `${name}.version is required`);
	assert.equal(typeof entry?.path, "string", `${name}.path is required`);
	assert.match(entry.sha256 ?? "", /^[a-f0-9]{64}$/, `${name}.sha256 is invalid`);

	const relativePath = normalize(entry.path).replaceAll("\\", "/");
	assert.equal(
		relativePath.startsWith("../") || relativePath.startsWith("/"),
		false,
		`${name}.path must stay repository-relative`,
	);

	const absolutePath = join(root, relativePath);
	assert.equal(existsSync(absolutePath), true, `${name} authority is missing`);
	assert.equal(sha256(absolutePath), entry.sha256, `${name} authority hash drift`);

	const content = readFileSync(absolutePath, "utf8");
	if (name === "core") {
		assert.equal(entry.version, "5.5", "core version must be 5.5");
		assert.match(content, /AMS REALTY PLATFORM CORE STANDARD 5\.5/i);
		assert.doesNotMatch(content, /OD-FA-01/i);
		assert.doesNotMatch(content, /brand\.css/i);
		assert.doesNotMatch(content, /final-audit starter/i);
		assert.doesNotMatch(content, /starter-specific decisions/i);
		assert.doesNotMatch(content, /project exceptions/i);
	}
	if (name === "ui") {
		assert.equal(entry.version, "5.0", "ui version must be 5.0");
		assert.equal(relativePath, "AMS_UI_CORE_v5.0_FINAL.md");
		assert.match(content, /AMS UI CORE/i);
		assert.match(content, /единая UI-конституция v5\.0/i);
	}
}

assert.equal(existsSync(lockPath), true, "constitution lock manifest is missing");

const lock = readJson(lockPath);
assert.equal(lock.schema_version, 1, "schema_version must be 1");
assertLockedAuthority("core", lock.core);
assertLockedAuthority("ui", lock.ui);

console.log("Constitution lock: PASS");
