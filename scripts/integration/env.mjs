import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export function loadLocalEnv(root = process.cwd()) {
	for (const name of [".env.local", ".env"]) {
		const file = path.join(root, name);
		if (!existsSync(file)) continue;
		for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
			if (!line || line.startsWith("#")) continue;
			const index = line.indexOf("=");
			if (index < 0) continue;
			const key = line.slice(0, index).trim();
			if (!key || process.env[key] != null) continue;
			let value = line.slice(index + 1).trim();
			if (
				(value.startsWith('"') && value.endsWith('"')) ||
				(value.startsWith("'") && value.endsWith("'"))
			) {
				value = value.slice(1, -1);
			}
			process.env[key] = value;
		}
	}
}

export function assertLocalTestDatabaseUri(uri) {
	let parsed;
	try {
		parsed = new URL(uri);
	} catch {
		throw new Error("Test DATABASE_URI is not a valid URL.");
	}
	const host = parsed.hostname.toLowerCase();
	if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
		throw new Error("Integration tests require a PostgreSQL URI.");
	}
	if (host !== "127.0.0.1" && host !== "localhost") {
		throw new Error("Integration tests only accept loopback PostgreSQL.");
	}
	const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
	if (!/^[a-z0-9_]+_test$/.test(database)) {
		throw new Error("Integration test database name must end with _test.");
	}
	if (/(?:^|_)(?:prod|production|live)(?:_|$)/.test(database)) {
		throw new Error(
			"Production-looking database names are forbidden for integration tests.",
		);
	}
	return { parsed, database };
}

export function deriveTestDatabaseUri(sourceUri) {
	const parsed = new URL(sourceUri);
	const current = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
	const database = current.endsWith("_test")
		? current
		: `${current.replace(/[^a-z0-9_]+/gi, "_")}_integration_test`.toLowerCase();
	parsed.pathname = `/${database}`;
	return parsed.toString();
}
