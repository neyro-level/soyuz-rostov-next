import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	runStarterUpgrade,
	validateUpgradeArchive,
} from "./starter-upgrade.mjs";

const hash = (value) => createHash("sha256").update(value).digest("hex");
const architecture = readFileSync(
	join(process.cwd(), "docs", "03_ARCHITECTURE.md"),
	"utf8",
);
const packageScripts = JSON.parse(
	readFileSync(join(process.cwd(), "package.json"), "utf8"),
).scripts;
assert.match(architecture, /Фоновое и автоматическое обновление запрещены/);
assert.match(architecture, /snapshot, а не runtime-зависимость/);
assert.match(architecture, /только явная команда владельца/);
assert.match(packageScripts["starter:upgrade"], /starter-upgrade\.mjs/);
assert.doesNotMatch(packageScripts.dev, /starter:upgrade/);
assert.doesNotMatch(packageScripts.start, /starter:upgrade/);
const oldSha = "1".repeat(40);
const newSha = "2".repeat(40);
const oldContent = Buffer.from("old core\n");
const newContent = Buffer.from("new core\n");
const oldGlobals = Buffer.from(".platform { color: old; }\n");
const newGlobals = Buffer.from(".platform { color: new; }\n");
const migration = Buffer.from("export async function up() {}\n");
const collectionOwner = Buffer.from("export const collection = 'example';\n");
const regenerated = Buffer.from("new generated output\n");
const clientBrand = { accent: "#8a1515", radius: "12px" };
const generatedBrand = Buffer.from(
	`:root { --brand-accent: ${clientBrand.accent}; --brand-radius-lg: ${clientBrand.radius}; }\n`,
);
const regenerationScript = Buffer.from(
	[
		'import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";',
		'import { join } from "node:path";',
		'const input = JSON.parse(readFileSync(join(process.cwd(), "docs", "CLIENT_BOOTSTRAP.json"), "utf8")).brand;',
		'const brand = ":root { --brand-accent: " + input.accent + "; --brand-radius-lg: " + input.radius + "; }\\n";',
		'if (process.argv.includes("--check")) {',
		'  if (!existsSync(join(process.cwd(), "src", "project", "brand.css")) || readFileSync(join(process.cwd(), "src", "project", "brand.css"), "utf8") !== brand) throw new Error("Generated brand output is not reproducible from client input.");',
		"  process.exit(0);",
		"}",
		'mkdirSync(join(process.cwd(), "src", "project"), { recursive: true });',
		'writeFileSync(join(process.cwd(), "src", "project", "generated.txt"), "new generated output\\n");',
		'writeFileSync(join(process.cwd(), "src", "project", "brand.css"), brand);',
	].join("\n"),
);
const previousPackage = {
	name: "client-realty",
	private: true,
	dependencies: {
		next: "16.0.0",
		payload: "3.0.0",
		"@aws-sdk/client-s3": "3.800.0",
	},
	scripts: { dev: "client-dev", client: "client-only" },
};
const upstreamPackage = {
	name: "ams-realty-baza-starter",
	private: true,
	dependencies: { next: "16.0.1", payload: "3.0.1" },
	scripts: {
		dev: "next dev",
		build: "next build",
		starterOnly: "starter-only",
	},
};

function archive(
	entries = [
		["package.json", Buffer.from(`${JSON.stringify(upstreamPackage)}\n`)],
		["src/app/globals.css", newGlobals],
		["src/core/example.txt", newContent],
		["scripts/regenerate-example.mjs", regenerationScript],
		["src/project/collections/Example.ts", collectionOwner],
		["migrations/20260927_upgrade.ts", migration],
	],
) {
	const rows = entries.map(([path, content]) => ({
		type: "file",
		path,
		size: content.length,
		sha256: hash(content),
		contentBase64: content.toString("base64"),
	}));
	const hashes = Object.fromEntries(
		rows.map((entry) => [entry.path, entry.sha256]),
	);
	return {
		schemaVersion: 1,
		from: { tag: "starter-v2.1.0", sha: oldSha },
		tag: "starter-v2.2.0",
		sha: newSha,
		entries: rows,
		migrationOwners: {
			"migrations/20260927_upgrade.ts": ["src/project/collections/Example.ts"],
		},
		packageMerge: {
			schemaVersion: 1,
			preserve: {
				dependencies: ["@aws-sdk/client-s3"],
				devDependencies: [],
				scripts: ["client"],
			},
			omitScripts: ["starterOnly"],
		},
		composites: [
			{ path: "package.json", strategy: "structured", handler: "package-json" },
		],
		regeneration: {
			schemaVersion: 1,
			steps: [
				{
					script: "scripts/regenerate-example.mjs",
					verifyBeforeRegeneration: true,
					outputs: {
						"src/project/generated.txt": hash(regenerated),
						"src/project/brand.css": hash(generatedBrand),
					},
				},
			],
		},
		release: {
			schemaVersion: 1,
			status: "released",
			tag: "starter-v2.2.0",
			sha: newSha,
			starterOwnedManifestVersion: 1,
			hashes,
		},
	};
}

function fixture() {
	const root = mkdtempSync(join(tmpdir(), "starter-upgrade-"));
	mkdirSync(join(root, "src/core"), { recursive: true });
	mkdirSync(join(root, "src/app"), { recursive: true });
	mkdirSync(join(root, "src/project"), { recursive: true });
	mkdirSync(join(root, "docs"), { recursive: true });
	writeFileSync(join(root, "src/core/example.txt"), oldContent);
	writeFileSync(join(root, "src/app/globals.css"), oldGlobals);
	writeFileSync(
		join(root, "docs", "CLIENT_BOOTSTRAP.json"),
		JSON.stringify({ brand: clientBrand }),
	);
	writeFileSync(join(root, "src/project/brand.css"), generatedBrand);
	const previousPackageSource = `${JSON.stringify(previousPackage, null, "\t")}\n`;
	writeFileSync(join(root, "package.json"), previousPackageSource);
	writeFileSync(
		join(root, "docs", "CLONE_GENERATED_OUTPUTS.json"),
		`${JSON.stringify(
			{
				schemaVersion: 1,
				presetSha: "fixture-preset",
				outputs: {
					"package.json": hash(Buffer.from(previousPackageSource)),
					"src/project/generated.txt": hash(
						Buffer.from("client-stale generated output\n"),
					),
				},
			},
			null,
			"\t",
		)}\n`,
	);
	writeFileSync(
		join(root, "src/project/generated.txt"),
		"client-stale generated output\n",
	);
	writeFileSync(
		join(root, ".starter-version"),
		JSON.stringify({
			schemaVersion: 1,
			tag: "starter-v2.1.0",
			sha: oldSha,
			manifestVersion: 1,
			hashes: {
				"src/app/globals.css": hash(oldGlobals),
				"src/core/example.txt": hash(oldContent),
			},
		}),
	);
	const archivePath = join(root, "upgrade.json");
	writeFileSync(archivePath, JSON.stringify(archive()));
	return { root, archivePath };
}

{
	const { root, archivePath } = fixture();
	try {
		const result = runStarterUpgrade({ root, archivePath });
		assert.equal(result.status, "applied");
		assert.deepEqual(
			readFileSync(join(root, "src/core/example.txt")),
			newContent,
		);
		assert.deepEqual(
			readFileSync(join(root, "migrations/20260927_upgrade.ts")),
			migration,
		);
		assert.deepEqual(
			readFileSync(join(root, "src/project/collections/Example.ts")),
			collectionOwner,
		);
		assert.deepEqual(
			readFileSync(join(root, "src/project/generated.txt")),
			regenerated,
		);
		assert.deepEqual(
			readFileSync(join(root, "src/project/brand.css")),
			generatedBrand,
		);
		assert.deepEqual(
			JSON.parse(
				readFileSync(join(root, "docs", "CLIENT_BOOTSTRAP.json"), "utf8"),
			).brand,
			clientBrand,
			"client accent and radii input must remain unchanged",
		);
		assert.equal(
			readFileSync(join(root, "src/app/globals.css"), "utf8"),
			newGlobals.toString("utf8"),
		);
		const packageAfter = JSON.parse(
			readFileSync(join(root, "package.json"), "utf8"),
		);
		assert.equal(packageAfter.name, "client-realty");
		assert.equal(packageAfter.dependencies.next, "16.0.1");
		assert.equal(packageAfter.dependencies.payload, "3.0.1");
		assert.equal(packageAfter.dependencies["@aws-sdk/client-s3"], "3.800.0");
		assert.equal(packageAfter.scripts.build, "next build");
		assert.equal(packageAfter.scripts.client, "client-only");
		assert.equal(packageAfter.scripts.starterOnly, undefined);
		const generatedManifest = JSON.parse(
			readFileSync(join(root, "docs", "CLONE_GENERATED_OUTPUTS.json"), "utf8"),
		);
		assert.equal(
			generatedManifest.outputs["package.json"],
			hash(readFileSync(join(root, "package.json"))),
		);
		assert.equal(
			generatedManifest.outputs["src/project/generated.txt"],
			hash(readFileSync(join(root, "src/project/generated.txt"))),
		);
		assert.equal(
			JSON.parse(readFileSync(join(root, ".starter-version"), "utf8")).sha,
			newSha,
		);
		assert.equal(
			runStarterUpgrade({ root, archivePath }).status,
			"already-current",
		);
		assert.deepEqual(
			readFileSync(join(root, "src/project/generated.txt")),
			regenerated,
			"regeneration is idempotent",
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
}

{
	const { root, archivePath } = fixture();
	try {
		rmSync(join(root, "src/project/brand.css"));
		const result = runStarterUpgrade({ root, archivePath });
		assert.equal(result.status, "applied");
		assert.deepEqual(
			readFileSync(join(root, "src/project/brand.css")),
			generatedBrand,
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
}

{
	const { root, archivePath } = fixture();
	try {
		writeFileSync(
			join(root, "src/project/brand.css"),
			"/* manual modification */\n",
		);
		assert.throws(
			() => runStarterUpgrade({ root, archivePath }),
			/not reproducible/,
		);
		assert.equal(
			JSON.parse(
				readFileSync(join(root, ".starter-upgrade/journal.json"), "utf8"),
			).status,
			"pending",
		);
		assert.equal(
			runStarterUpgrade({ root, recover: true }).status,
			"recovered",
		);
		assert.equal(
			readFileSync(join(root, "src/app/globals.css"), "utf8"),
			oldGlobals.toString("utf8"),
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
}

{
	const { root, archivePath } = fixture();
	try {
		writeFileSync(join(root, "client-owned.txt"), "committed\n");
		execFileSync("git", ["init"], { cwd: root, stdio: "ignore" });
		execFileSync("git", ["add", "."], { cwd: root, stdio: "ignore" });
		execFileSync(
			"git",
			[
				"-c",
				"user.name=Test",
				"-c",
				"user.email=test@example.invalid",
				"commit",
				"-m",
				"fixture",
			],
			{ cwd: root, stdio: "ignore" },
		);
		writeFileSync(join(root, "client-owned.txt"), "dirty\n");
		assert.throws(
			() => runStarterUpgrade({ root, archivePath }),
			/Dirty client-owned path/,
		);
		assert.deepEqual(
			readFileSync(join(root, "src/core/example.txt")),
			oldContent,
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
}

{
	const { root, archivePath } = fixture();
	try {
		writeFileSync(join(root, "src/core/example.txt"), "client change\n");
		const result = runStarterUpgrade({ root, archivePath });
		assert.equal(result.status, "conflicts");
		assert.equal(
			readFileSync(join(root, "src/core/example.txt"), "utf8"),
			"client change\n",
		);
		assert.deepEqual(
			readFileSync(join(root, "src/core/example.txt.rej")),
			newContent,
		);
		assert.equal(
			JSON.parse(readFileSync(join(root, ".starter-version"), "utf8")).sha,
			oldSha,
		);
		const report = JSON.parse(
			readFileSync(join(root, ".starter-upgrade/report.json"), "utf8"),
		);
		assert.equal(report.status, "conflicts");
		assert.deepEqual(report.conflicts, [
			{ path: "src/core/example.txt", reason: "locally-modified" },
		]);
		assert.ok(
			!existsSync(join(root, "migrations/20260927_upgrade.ts")),
			"conflict must prevent every platform write",
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
}

for (const [mutate, pattern] of [
	[
		(value) => {
			value.entries[0].path = "../escape";
		},
		/inside the repository/,
	],
	[
		(value) => {
			value.entries[0].sha256 = "0".repeat(64);
		},
		/hash mismatch/,
	],
	[
		(value) => {
			value.release.status = "candidate";
		},
		/released/,
	],
	[
		(value) => {
			value.entries[0].size = 17 * 1024 * 1024;
		},
		/excessive/,
	],
	[
		(value) => {
			delete value.packageMerge;
		},
		/packageMerge contract/,
	],
	[
		(value) => {
			value.packageMerge.preserve.dependencies = [
				"@aws-sdk/client-s3",
				"@aws-sdk/client-s3",
			];
		},
		/unique package names/,
	],
	[
		(value) => {
			value.packageMerge.omitScripts = ["starterOnly", "starterOnly"];
		},
		/unique package names/,
	],
	[
		(value) => {
			delete value.composites;
		},
		/composite-file contract/,
	],
	[
		(value) => {
			value.composites[0].path = "src/app/globals.css";
		},
		/Only package.json/,
	],
	[
		(value) => {
			value.entries.push({
				...value.entries[0],
				path: "src/project/brand.css",
			});
		},
		/Generated output must not be archived/,
	],
	[
		(value) => {
			delete value.from;
		},
		/source starter version/,
	],
	[
		(value) => {
			delete value.migrationOwners;
		},
		/migrationOwners/,
	],
	[
		(value) => {
			value.migrationOwners["migrations/20260927_upgrade.ts"] = [
				"src/project/collections/Missing.ts",
			];
		},
		/absent from upgrade archive/,
	],
	[
		(value) => {
			value.migrationOwners["migrations/20260927_upgrade.ts"] = [
				"src/project/routing/runtime-route.ts",
			];
		},
		/collection schema file/,
	],
	[
		(value) => {
			delete value.regeneration;
		},
		/regeneration contract/,
	],
	[
		(value) => {
			value.regeneration.steps[0].outputs["src/project/generated.txt"] =
				"0".repeat(64);
		},
		/Generated output does not match/,
	],
	[
		(value) => {
			value.regeneration.steps[0].script = "src/project/generated.txt";
		},
		/archived scripts/,
	],
	[
		(value) => {
			value.entries.push({
				...value.entries[0],
				path: "src/project/generated.txt",
			});
		},
		/Generated output must not be archived/,
	],
	[
		(value) => {
			delete value.regeneration.steps[0].verifyBeforeRegeneration;
		},
		/Generated brand output must verify/,
	],
]) {
	const value = archive();
	mutate(value);
	if (pattern.source.includes("does not match")) {
		const { root, archivePath } = fixture();
		try {
			writeFileSync(archivePath, JSON.stringify(value));
			assert.throws(() => runStarterUpgrade({ root, archivePath }), pattern);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	} else {
		assert.throws(() => validateUpgradeArchive(value), pattern);
	}
}

{
	const { root, archivePath } = fixture();
	try {
		const value = archive();
		value.from.sha = "f".repeat(40);
		writeFileSync(archivePath, JSON.stringify(value));
		assert.throws(
			() => runStarterUpgrade({ root, archivePath }),
			/source does not match/,
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
}

{
	const { root, archivePath } = fixture();
	try {
		const outside = join(root, "outside");
		mkdirSync(outside);
		rmSync(join(root, "src/core"), { recursive: true, force: true });
		symlinkSync(outside, join(root, "src/core"), "junction");
		assert.throws(() => runStarterUpgrade({ root, archivePath }), /symlink/);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
}

{
	const { root, archivePath } = fixture();
	try {
		assert.throws(
			() => runStarterUpgrade({ root, archivePath, interruptAfter: 1 }),
			/interruption/,
		);
		assert.equal(
			JSON.parse(
				readFileSync(join(root, ".starter-upgrade/journal.json"), "utf8"),
			).status,
			"pending",
		);
		assert.equal(
			runStarterUpgrade({ root, recover: true }).status,
			"recovered",
		);
		assert.deepEqual(
			readFileSync(join(root, "src/core/example.txt")),
			oldContent,
		);
		assert.ok(!existsSync(join(root, "migrations/20260927_upgrade.ts")));
		assert.equal(
			readFileSync(join(root, "src/project/generated.txt"), "utf8"),
			"client-stale generated output\n",
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
}

console.log(
	"starter upgrade: PASS (clean, regeneration, conflict, hostile archive, symlink, interruption recovery)",
);
