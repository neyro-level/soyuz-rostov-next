import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { renderBrandCss } from "./clone-preset.mjs";

const root = resolve(process.cwd());
const bootstrapPath = join(root, "docs", "CLIENT_BOOTSTRAP.json");
const outputPath = join(root, "src", "app", "globals.css");
const blockPattern =
	/\/\* CLONE_BRAND_VALUES_BEGIN:[\s\S]*?\/\* CLONE_BRAND_VALUES_END \*\//;
const legacyBrandImportPattern =
	/^@import\s+["']\.\.\/project\/brand\.css["'];\r?\n?/m;
const uiStylesImportPattern =
	/^@import\s+["']@ams\/realtbase-ui\/styles\.css["'];\r?\n?/m;

if (!existsSync(bootstrapPath)) {
	throw new Error("Brand regeneration requires client docs/CLIENT_BOOTSTRAP.json input.");
}

const bootstrap = JSON.parse(readFileSync(bootstrapPath, "utf8"));
if (!bootstrap.brand || typeof bootstrap.brand !== "object") {
	throw new Error("Client bootstrap brand input is missing.");
}

const expected = renderBrandCss({ brand: bootstrap.brand });
const currentOutput = readFileSync(outputPath, "utf8").replaceAll("\r\n", "\n");
const hasBrandBlock = blockPattern.test(currentOutput);
const hasLegacyBrandImport = legacyBrandImportPattern.test(currentOutput);
const hasUiStylesImport = uiStylesImportPattern.test(currentOutput);
if (!hasBrandBlock && !hasLegacyBrandImport && !hasUiStylesImport) {
	throw new Error("Generated globals brand block is missing.");
}
if (process.argv.slice(2).includes("--check")) {
	const currentBlock = hasBrandBlock
		? currentOutput.match(blockPattern)?.[0] ?? ""
		: "";
	if (!hasBrandBlock || currentBlock.trim() !== expected.trim()) {
		throw new Error("Generated globals brand block is not reproducible from client input.");
	}
	console.log("regenerate-brand-css: existing globals brand block matches client input");
} else {
	const nextOutput = hasBrandBlock
		? currentOutput.replace(blockPattern, expected.trim())
		: hasLegacyBrandImport
			? currentOutput.replace(legacyBrandImportPattern, `${expected.trim()}\n`)
			: currentOutput.replace(
					uiStylesImportPattern,
					(match) => `${match}${expected.trim()}\n`,
				);
	writeFileSync(outputPath, nextOutput);
	console.log("regenerate-brand-css: wrote deterministic globals brand block");
}
