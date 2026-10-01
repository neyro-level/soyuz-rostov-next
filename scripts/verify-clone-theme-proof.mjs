import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join, relative, resolve } from "node:path";
import { analyzeDesignTokens } from "./quality/design-tokens.mjs";
import { readClonePreset, renderBrandCss, renderProjectFontConfig } from "./clone-preset.mjs";

const root = resolve(import.meta.dirname, "..");
const starterPreset = readClonePreset(join(root, "docs/CLONE_PRESET.example.json"));
const oceanPreset = structuredClone(starterPreset);
oceanPreset.projectId = "CLIENT-OCEAN-PROOF";
oceanPreset.packageName = "client-ocean-proof";
oceanPreset.brandName = "Океан Недвижимость";
oceanPreset.brand.colors = {
	background: "#eef4f8",
	foreground: "#102536",
	surface: "#ffffff",
	surfaceMuted: "#dfeaf1",
	surfaceSoft: "#f7fbfd",
	surfaceDark: "#102a3a",
	surfaceDarkStrong: "#071923",
	contentSecondary: "#29495c",
	contentMuted: "#617d8c",
	contentInverse: "#ffffff",
	border: "#c7d9e3",
	accent: "#006c83",
	accentHover: "#004f61",
	accentSoft: "#d7f3f6",
	statusWarning: "#8a5a00",
	statusDanger: "#a32035",
	statusSuccess: "#087a4b",
	statusInfo: "#075f9c",
};
oceanPreset.brand.radii = { sm: "4px", md: "8px", lg: "16px", xl: "24px", full: "999px" };
oceanPreset.brand.fontFamily = "Inter";

function values(css) {
	return new Map(
		[...css.matchAll(/^\s*(--brand-[a-z0-9_-]+)\s*:\s*([^;]+);/gim)].map(
			(match) => [match[1], match[2].trim()],
		),
	);
}

const starterCss = renderBrandCss(starterPreset);
const oceanCss = renderBrandCss(oceanPreset);
export const cloneThemeProofs = Object.freeze({
	current: Object.freeze({ css: starterCss, accent: values(starterCss).get("--brand-accent") }),
	ocean: Object.freeze({ css: oceanCss, accent: values(oceanCss).get("--brand-accent") }),
});

function walk(directory) {
	return readdirSync(directory).flatMap((entry) => {
		if (["node_modules", ".next"].includes(entry)) return [];
		const path = join(directory, entry);
		return statSync(path).isDirectory() ? walk(path) : [path];
	});
}

function digestFiles(paths) {
	const hash = createHash("sha256");
	for (const path of [...paths].sort()) {
		hash.update(relative(root, path).replaceAll("\\", "/"));
		hash.update("\0");
		hash.update(readFileSync(path));
		hash.update("\0");
	}
	return hash.digest("hex");
}

function runtimeUiFiles() {
	return [join(root, "src/app"), join(root, "packages/ui/src")]
		.flatMap(walk)
		.filter((path) => [".css", ".ts", ".tsx"].includes(extname(path)));
}

function rawBrandDefinitionLeaks() {
	return [join(root, "src"), join(root, "packages")]
		.flatMap(walk)
		.filter((path) => [".css", ".ts", ".tsx"].includes(extname(path)))
		.filter((path) => path !== join(root, "src/app/globals.css"))
		.flatMap((path) =>
			/(?:^|[;{])\s*["']?--brand-[a-z0-9_-]+["']?\s*:/gim.test(readFileSync(path, "utf8"))
				? [relative(root, path).replaceAll("\\", "/")]
				: [],
		);
}

if (resolve(process.argv[1] ?? "") === import.meta.filename) {
	const uiFiles = runtimeUiFiles();
	const uiHashBefore = digestFiles(uiFiles);
	const fixture = mkdtempSync(join(tmpdir(), "ams-clone-theme-proof-"));
	try {
		writeFileSync(join(fixture, "starter-brand.css"), starterCss);
		writeFileSync(join(fixture, "ocean-brand.css"), oceanCss);
		writeFileSync(join(fixture, "starter-font.ts"), renderProjectFontConfig(starterPreset));
		writeFileSync(join(fixture, "ocean-font.ts"), renderProjectFontConfig(oceanPreset));

		const starterValues = values(starterCss);
		const oceanValues = values(oceanCss);
		const changedPrimitives = [...starterValues].filter(
			([token, value]) => oceanValues.get(token) !== value,
		);
		assert.ok(changedPrimitives.length >= 15, "proof themes must differ in at least 15 brand primitives");
		assert.notEqual(renderProjectFontConfig(starterPreset), renderProjectFontConfig(oceanPreset));
		assert.notEqual(starterCss, oceanCss, "generated globals brand blocks must differ by theme");
		assert.equal(digestFiles(uiFiles), uiHashBefore, "UI source changed while generating client themes");
		assert.deepEqual(rawBrandDefinitionLeaks(), [], "raw brand primitive leaked outside globals.css");
		const analysis = analyzeDesignTokens();
		assert.deepEqual(analysis.failures, [], analysis.failures.join("\n"));
		console.log(
			`verify:clone-theme-proof: PASS (2 themes, ${changedPrimitives.length} changed primitives, UI source stable, no raw brand leaks)`,
		);
	} finally {
		rmSync(fixture, { recursive: true, force: true });
	}
}
