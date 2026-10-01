import assert from "node:assert/strict";

const runtimeAllowlist = new Set([
	"src/core/data-access/ingest/sql/index.ts",
	"src/core/data-access/system/sql/index.ts",
]);

const migrationPrefix = "migrations/";
const rawSqlPattern =
	/db\.execute\s*\(|drizzle\.execute\s*\(|\bsql`|from\s+["']pg["']/;

export function findSqlGovernanceViolations(entries) {
	const violations = [];
	for (const { name, content } of entries) {
		const normalized = name.replaceAll("\\", "/");
		if (!rawSqlPattern.test(content)) continue;
		if (
			!runtimeAllowlist.has(normalized) &&
			!normalized.startsWith(migrationPrefix)
		) {
			violations.push(`${normalized}: raw SQL path is not explicitly approved`);
		}
	}
	return violations;
}

export function assertSqlOperationManifest(name, content) {
	const manifestMatch = content.match(
		/export const approved(?:Ingest|System)SqlOperations = \{([\s\S]*?)\n\} as const;/,
	);
	assert.ok(
		manifestMatch,
		`${name}: approved SQL operation manifest is missing`,
	);
	const manifest = manifestMatch[1];
	const operations = [
		...content.matchAll(
			/executeApproved(?:Ingest|System)Sql\(\s*payload,\s*"([A-Za-z0-9]+)"/g,
		),
	].map((match) => match[1]);
	assert.ok(
		operations.length > 0,
		`${name}: approved SQL execution calls are missing`,
	);
	for (const operation of new Set(operations)) {
		const block = manifest.match(
			new RegExp(`${operation}: \\{([\\s\\S]*?)\\n\\t\\},`),
		)?.[1];
		assert.ok(block, `${name}: ${operation} is absent from the manifest`);
		assert.match(
			block,
			/invariant:\s*"[^"\n]+"/,
			`${name}: ${operation} invariant is missing`,
		);
		assert.match(
			block,
			/reason:\s*"[^"\n]+"/,
			`${name}: ${operation} reason is missing`,
		);
	}
}
