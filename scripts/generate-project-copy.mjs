import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createPresetSiteProfileConfig } from "../src/project/site-profile-presets.ts";
import {
	renderProjectCopy,
	renderProjectCopyFromConfig,
} from "./clone-preset.mjs";

const root = process.cwd();
const outputPath = resolve(root, "src/project/copy.ts");
const checkOnly = process.argv.includes("--check");
const siteConfig = readFileSync(
	resolve(root, "src/project/site.config.ts"),
	"utf8",
);
const clientMode = /projectKind:\s*["']client["']/.test(siteConfig);
const sourcePath = resolve(
	root,
	clientMode ? "docs/CLIENT_BOOTSTRAP.json" : "docs/CLONE_PRESET.starter.json",
);
const source = JSON.parse(readFileSync(sourcePath, "utf8"));
const rendered = clientMode
	? renderProjectCopy(source)
	: renderProjectCopyFromConfig(
			createPresetSiteProfileConfig(
				Object.fromEntries(
					Object.entries(source).filter(([key]) => key !== "schemaVersion"),
				),
			),
		);

if (checkOnly) {
	if (
		!existsSync(outputPath) ||
		readFileSync(outputPath, "utf8") !== rendered
	) {
		throw new Error(
			"Generated project copy drift: run pnpm copy:generate and commit the output.",
		);
	}
	console.log("project copy generated-config drift guard: PASS");
} else {
	writeFileSync(outputPath, rendered);
	console.log("generated src/project/copy.ts");
}
