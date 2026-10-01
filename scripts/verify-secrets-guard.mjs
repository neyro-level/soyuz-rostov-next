import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const scannedExtensions = /\.(?:md|example|json|yml|yaml|ts|tsx|js|mjs|cjs|env)$/i;
const skipDirs = new Set([".git", ".next", "coverage", "node_modules", ".beads"]);
const credentialPatterns = [
	/sk_live_[A-Za-z0-9]{16,}/,
	/ghp_[A-Za-z0-9]{20,}/,
	/postgres(?:ql)?:\/\/[^:\s/]+:(?!replace-local-password|not-configured|fixture-)[^@\s/]+@/i,
	/AKIA[0-9A-Z]{16}/,
	/-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----/,
];

function filesUnder(relativePath = ".") {
	const directory = path.join(root, relativePath);
	if (!existsSync(directory)) return [];
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		if (entry.isDirectory()) {
			if (skipDirs.has(entry.name)) return [];
			return filesUnder(path.relative(root, path.join(directory, entry.name)));
		}
		if (!scannedExtensions.test(entry.name) && !entry.name.startsWith(".env")) {
			return [];
		}
		return [path.relative(root, path.join(directory, entry.name)).replaceAll("\\", "/")];
	});
}

const violations = [];
for (const file of filesUnder(".")) {
	if (file.startsWith("docs/proofs/epic-18/")) continue;
	if (file === "scripts/verify-secrets-guard.mjs") continue;
	if (file === ".env.local" || file === ".env" || file.endsWith("/.env.local")) continue;
	const content = readFileSync(path.join(root, file), "utf8");
	for (const pattern of credentialPatterns) {
		if (pattern.test(content)) {
			violations.push(`${file}: credential-like secret must not be committed`);
		}
	}
}

assert.equal(violations.length, 0, violations.join("\n"));
assert.ok(
	readFileSync(path.join(root, ".env.example"), "utf8").includes("S3_* is not required"),
	".env.example must document that S3 is not required for this starter",
);
console.log("verify-secrets-guard: ok");
