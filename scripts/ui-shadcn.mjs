import { spawnSync } from "node:child_process";

const [command, ...commandArguments] = process.argv.slice(2);

if (!command) {
	console.error("Usage: pnpm ui:shadcn -- <command> [arguments]");
	process.exit(1);
}

if (commandArguments.includes("--overwrite") || commandArguments.includes("--force")) {
	console.error("Destructive shadcn flags are disabled in the project wrapper.");
	process.exit(1);
}

if (
	["init", "apply"].includes(command) ||
	(command === "add" && commandArguments.includes("--all"))
) {
	console.error("Foundation-wide shadcn mutations are disabled in the project wrapper.");
	process.exit(1);
}

const pnpmEntry = process.env.npm_execpath;
if (!pnpmEntry) {
	console.error("Run this wrapper through pnpm.");
	process.exit(1);
}

const result = spawnSync(
	process.execPath,
	[pnpmEntry, "dlx", "shadcn@latest", command, ...commandArguments, "-c", "packages/ui"],
	{ stdio: "inherit" },
);

if (result.error) {
	throw result.error;
}

process.exit(result.status ?? 1);
