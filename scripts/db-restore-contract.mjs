import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

const temporaryDatabasePattern = /^restore_drill_[a-z0-9_]+$/;
const protectedDatabasePattern = /(?:^|_)(?:prod|production|main|live)(?:_|$)/i;

export function sha256File(file) {
	return createHash("sha256").update(readFileSync(file)).digest("hex");
}

export function validateRestoreTarget({
	targetUri,
	expectedHost,
	expectedDatabase,
	caFile,
	strictTls = true,
}) {
	const uri = new URL(targetUri);
	const database = decodeURIComponent(uri.pathname.replace(/^\//, ""));
	if (uri.protocol !== "postgresql:" && uri.protocol !== "postgres:") {
		throw new Error("Restore target must use a PostgreSQL URI.");
	}
	if (!expectedHost || uri.hostname !== expectedHost) {
		throw new Error("Restore target host does not match the approved host.");
	}
	if (!expectedDatabase || database !== expectedDatabase) {
		throw new Error("Restore target database does not match the approved identity.");
	}
	if (
		!temporaryDatabasePattern.test(database) ||
		protectedDatabasePattern.test(database) ||
		["postgres", "template0", "template1"].includes(database)
	) {
		throw new Error("Restore target is not an approved temporary database.");
	}
	const connectTimeout = Number(uri.searchParams.get("connect_timeout"));
	if (!Number.isInteger(connectTimeout) || connectTimeout < 1 || connectTimeout > 30) {
		throw new Error("connect_timeout must be an integer from 1 to 30 seconds.");
	}
	const options = uri.searchParams.get("options") ?? "";
	const statementTimeoutMatch = options.match(/(?:^|\s)-c\s+statement_timeout=(\d+)(?:\s|$)/);
	const statementTimeout = Number(statementTimeoutMatch?.[1]);
	if (!Number.isInteger(statementTimeout) || statementTimeout < 1000 || statementTimeout > 120000) {
		throw new Error("statement_timeout must be bounded from 1000 to 120000 ms.");
	}
	if (strictTls) {
		if (uri.searchParams.get("sslmode") !== "verify-full") {
			throw new Error("Managed PostgreSQL requires sslmode=verify-full.");
		}
		if (!caFile || !isAbsolute(caFile) || !existsSync(caFile)) {
			throw new Error("An existing absolute Timeweb CA file is required.");
		}
		const uriCa = uri.searchParams.get("sslrootcert");
		if (!uriCa || resolve(uriCa) !== resolve(caFile)) {
			throw new Error("sslrootcert does not match the approved Timeweb CA file.");
		}
	} else if (uri.hostname !== "127.0.0.1" && uri.hostname !== "localhost") {
		throw new Error("TLS bypass is restricted to the local restore-contract test.");
	}
	return { database, uri };
}

function maintenanceUri(uri) {
	return connectionEnvironment(uri, "postgres");
}

function connectionEnvironment(uri, database) {
	return {
		...process.env,
		PGHOST: uri.hostname,
		PGPORT: uri.port || "5432",
		PGUSER: decodeURIComponent(uri.username),
		PGPASSWORD: decodeURIComponent(uri.password),
		PGDATABASE: database,
		PGSSLMODE: uri.searchParams.get("sslmode") ?? "prefer",
		PGSSLROOTCERT: uri.searchParams.get("sslrootcert") ?? "",
		PGCONNECT_TIMEOUT: uri.searchParams.get("connect_timeout") ?? "",
		PGOPTIONS: uri.searchParams.get("options") ?? "",
	};
}

export function runRestoreDrill({
	dumpFile,
	dumpSha256,
	targetUri,
	expectedHost,
	expectedDatabase,
	caFile,
	smokeSql,
	smokeExpected,
	strictTls = true,
}) {
	if (!dumpFile || !existsSync(dumpFile)) throw new Error("Source dump does not exist.");
	if (!/^[a-f0-9]{64}$/.test(dumpSha256 ?? "") || sha256File(dumpFile) !== dumpSha256) {
		throw new Error("Source dump provenance SHA-256 does not match.");
	}
	if (!smokeSql?.trim() || smokeExpected === undefined) {
		throw new Error("A restored-database smoke query and expected value are required.");
	}
	const { database, uri } = validateRestoreTarget({
		targetUri,
		expectedHost,
		expectedDatabase,
		caFile,
		strictTls,
	});
	const maintenanceEnvironment = maintenanceUri(uri);
	const targetEnvironment = connectionEnvironment(uri, database);
	let created = false;
	try {
		execFileSync("createdb", [database], { env: maintenanceEnvironment, stdio: "pipe" });
		created = true;
		execFileSync(
			"pg_restore",
			["--exit-on-error", "--no-owner", "--no-privileges", `--dbname=${database}`, dumpFile],
			{ env: targetEnvironment, stdio: "pipe" },
		);
		const smoke = execFileSync(
			"psql",
			["--set=ON_ERROR_STOP=1", "--tuples-only", "--no-align", `--command=${smokeSql}`],
			{ env: targetEnvironment, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
		).trim();
		if (smoke !== String(smokeExpected)) {
			throw new Error("Restored-database smoke result does not match the expected value.");
		}
		return { database, smoke: "PASS", cleanup: "PENDING" };
	} finally {
		if (created) {
			execFileSync(
				"dropdb",
				["--if-exists", "--force", database],
				{ env: maintenanceEnvironment, stdio: "pipe" },
			);
		}
	}
}
