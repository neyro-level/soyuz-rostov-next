import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createPresetSiteProfileConfig } from "../src/project/site-profile-presets.ts";
import {
	renderSiteProfileConfigFromConfig,
	siteProfileConfigForPreset,
} from "./clone-preset.mjs";

const root = process.cwd();
const outputPath = resolve(root, "src/project/site-profile.config.ts");
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
if (
	(!clientMode &&
		(source.schemaVersion !== 1 || source.projectKind !== "starter-demo")) ||
	(clientMode &&
		(source.schemaVersion !== 3 || source.fixtureData !== "cleared"))
) {
	throw new Error(
		clientMode
			? "Client SiteProfile owner must be CLIENT_BOOTSTRAP schemaVersion 3 with cleared fixtures."
			: "Starter profile preset must use schemaVersion 1 and projectKind starter-demo.",
	);
}
const { schemaVersion: _schemaVersion, ...starterInput } = source;
const profile = clientMode
	? siteProfileConfigForPreset(source)
	: createPresetSiteProfileConfig(starterInput);
const rendered = renderSiteProfileConfigFromConfig(profile);

if (checkOnly) {
	if (
		!existsSync(outputPath) ||
		readFileSync(outputPath, "utf8") !== rendered
	) {
		throw new Error(
			"Generated SiteProfile drift: run pnpm profile:generate and commit both source and output.",
		);
	}
	console.log(
		`${clientMode ? "client" : "starter"} SiteProfile generated-config drift guard: PASS`,
	);
} else {
	writeFileSync(outputPath, rendered);
	console.log("generated src/project/site-profile.config.ts");
}
