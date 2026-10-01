import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runRestoreDrill, sha256File, validateRestoreTarget } from "./db-restore-contract.mjs";

const temp = mkdtempSync(join(tmpdir(), "ams-plan11-restore-"));
const caFile = join(temp, "timeweb-ca.pem");
const dumpFile = join(temp, "source.dump");
const container = `ams-plan11-restore-${process.pid}`;
writeFileSync(caFile, "fixture-ca-only-not-a-production-certificate\n");

const strictUri = new URL("postgresql://user:fixture-parser-password@db.example.test/restore_drill_fixture");
strictUri.searchParams.set("sslmode", "verify-full");
strictUri.searchParams.set("sslrootcert", caFile);
strictUri.searchParams.set("connect_timeout", "10");
strictUri.searchParams.set("options", "-c statement_timeout=30000");
assert.equal(
	validateRestoreTarget({
		targetUri: strictUri.toString(),
		expectedHost: "db.example.test",
		expectedDatabase: "restore_drill_fixture",
		caFile,
	}).database,
	"restore_drill_fixture",
);
assert.throws(
	() => validateRestoreTarget({ targetUri: strictUri.toString(), expectedHost: "wrong.example.test", expectedDatabase: "restore_drill_fixture", caFile }),
	/approved host/,
);
assert.throws(
	() => validateRestoreTarget({ targetUri: strictUri.toString(), expectedHost: "db.example.test", expectedDatabase: "restore_drill_fixture", caFile: join(temp, "wrong-ca.pem") }),
	/Timeweb CA file/,
);
assert.throws(
	() => validateRestoreTarget({ targetUri: strictUri.toString().replace("restore_drill_fixture", "production"), expectedHost: "db.example.test", expectedDatabase: "production", caFile }),
	/temporary database/,
);

try {
	execFileSync(
		"docker",
		["run", "-d", "--rm", "--name", container, "-e", "POSTGRES_PASSWORD=fixture-restore-password", "-e", "POSTGRES_DB=restore_source", "-p", "127.0.0.1::5432", "postgres:18-alpine"],
		{ stdio: "pipe" },
	);
	for (let attempt = 0; attempt < 60; attempt += 1) {
		try {
			execFileSync("docker", ["exec", container, "pg_isready", "-U", "postgres", "-d", "restore_source"], { stdio: "pipe" });
			break;
		} catch {
			if (attempt === 59) throw new Error("Disposable PostgreSQL did not become ready.");
			await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
		}
	}
	const mapped = execFileSync("docker", ["port", container, "5432/tcp"], { encoding: "utf8" }).trim();
	const port = mapped.split(":").at(-1).trim();
	for (let attempt = 0; attempt < 30; attempt += 1) {
		try {
			execFileSync("pg_isready", ["--host=127.0.0.1", `--port=${port}`, "--username=postgres", "--dbname=restore_source"], { stdio: "pipe" });
			break;
		} catch {
			if (attempt === 29) throw new Error("Mapped disposable PostgreSQL port did not become ready.");
			await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
		}
	}
	const sourceUri = `postgresql://postgres:fixture-restore-password@127.0.0.1:${port}/restore_source?sslmode=disable&connect_timeout=5&options=-c%20statement_timeout%3D30000`;
	execFileSync("psql", [sourceUri, "--set=ON_ERROR_STOP=1", "--command=CREATE TABLE restore_marker (marker text NOT NULL); INSERT INTO restore_marker VALUES ('plan11-ok');"], { stdio: "pipe" });
	execFileSync("pg_dump", ["--format=custom", `--file=${dumpFile}`, sourceUri], { stdio: "pipe" });
	const targetUri = `postgresql://postgres:fixture-restore-password@127.0.0.1:${port}/restore_drill_plan11?sslmode=disable&connect_timeout=5&options=-c%20statement_timeout%3D30000`;
	assert.throws(
		() => runRestoreDrill({ dumpFile, dumpSha256: "0".repeat(64), targetUri, expectedHost: "127.0.0.1", expectedDatabase: "restore_drill_plan11", smokeSql: "SELECT marker FROM restore_marker LIMIT 1", smokeExpected: "plan11-ok", strictTls: false }),
		/provenance/,
	);
	const result = runRestoreDrill({
		dumpFile,
		dumpSha256: sha256File(dumpFile),
		targetUri,
		expectedHost: "127.0.0.1",
		expectedDatabase: "restore_drill_plan11",
		smokeSql: "SELECT marker FROM restore_marker LIMIT 1",
		smokeExpected: "plan11-ok",
		strictTls: false,
	});
	assert.equal(result.smoke, "PASS");
	const remaining = execFileSync("psql", [sourceUri, "--tuples-only", "--no-align", "--command=SELECT count(*) FROM pg_database WHERE datname = 'restore_drill_plan11'"], { encoding: "utf8" }).trim();
	assert.equal(remaining, "0", "temporary restore database must be removed");
} finally {
	try { execFileSync("docker", ["rm", "-f", container], { stdio: "ignore" }); } catch {}
	rmSync(temp, { recursive: true, force: true });
}

console.log("verify:db-restore-drill: PASS (verify-full fixtures + provenance + local restore smoke + cleanup)");
