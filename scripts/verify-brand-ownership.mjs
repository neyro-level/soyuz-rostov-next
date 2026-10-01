import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { analyzeDesignTokens } from "./quality/design-tokens.mjs";
import {
	readClonePreset,
	renderBrandCss,
	renderProjectFontConfig,
} from "./clone-preset.mjs";

const brandCss = readFileSync("src/project/brand.css", "utf8");
const globalsCss = readFileSync("src/app/globals.css", "utf8");
const starterBrandPreset = readClonePreset("docs/CLONE_PRESET.example.json");

function walk(directory) {
	return readdirSync(directory).flatMap((entry) => {
		if (entry === "node_modules" || entry === ".next") return [];
		const path = join(directory, entry);
		return statSync(path).isDirectory()
			? walk(path)
			: new Set([".css", ".ts", ".tsx"]).has(extname(path))
				? [path]
				: [];
	});
}

export function findRawBrandPrimitiveDefinitions(files) {
	return files.flatMap(({ path, source }) =>
		[...source.matchAll(/(?:^|[;{])\s*["']?(--brand-[a-z0-9_-]+)["']?\s*:/gim)].map(
			(match) => `${path}:${match[1]}`,
		),
	);
}

function block(selector) {
	const generatedBlock =
		globalsCss.match(
			/\/\* CLONE_BRAND_VALUES_BEGIN:[\s\S]*?\/\* CLONE_BRAND_VALUES_END \*\//,
		)?.[0] ?? "";
	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return generatedBlock.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? "";
}

function generatedBrandBlock() {
	return (
		globalsCss.match(
			/\/\* CLONE_BRAND_VALUES_BEGIN:[\s\S]*?\/\* CLONE_BRAND_VALUES_END \*\//,
		)?.[0] ?? ""
	);
}

function values(source) {
	return new Map(
		[...source.matchAll(/^\s*(--brand-[a-z0-9_-]+)\s*:\s*([^;]+);/gim)].map(
			(match) => [match[1], match[2].trim()],
		),
	);
}

function normalizeLineEndings(source) {
	return source.replaceAll("\r\n", "\n");
}

function rgb(hex) {
	const raw = hex.replace("#", "");
	return [0, 2, 4].map((offset) => Number.parseInt(raw.slice(offset, offset + 2), 16));
}

function luminance(hex) {
	return rgb(hex)
		.map((value) => value / 255)
		.map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4))
		.reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
}

function contrast(foreground, background) {
	const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
	return (light + 0.05) / (dark + 0.05);
}

const analysis = analyzeDesignTokens();
assert.deepEqual(analysis.failures, [], analysis.failures.join("\n"));
assert.ok(analysis.brandPrimitives >= 20 && analysis.brandPrimitives <= 30);
assert.deepEqual(
	findRawBrandPrimitiveDefinitions([{ path: "fixture.css", source: ":root { --brand-accent: #000; }" }]),
	["fixture.css:--brand-accent"],
	"raw brand primitive negative fixture must be detected",
);

const rawBrandPrimitiveLeaks = findRawBrandPrimitiveDefinitions(
	[...walk("src"), ...walk("packages")]
		.map((path) => ({
			absolutePath: path,
			path: relative(".", path).replaceAll("\\", "/"),
		}))
		.filter(({ path }) => path !== "src/app/globals.css")
		.map(({ absolutePath, path }) => ({ path, source: readFileSync(absolutePath, "utf8") })),
);
assert.deepEqual(
	rawBrandPrimitiveLeaks,
	[],
	"raw client brand primitives must be defined only in src/app/globals.css",
);
assert.deepEqual(
	findRawBrandPrimitiveDefinitions([
		{ path: "src/project/brand.css", source: brandCss },
	]),
	[],
	"src/project/brand.css must not define runtime brand primitives",
);

const current = values(block(":root"));
const proof = new Map(current);
for (const [key, value] of Object.entries({
	"--brand-accent": "#1557b0",
	"--brand-accent-hover": "#0b3f82",
	"--brand-accent-soft": "#f0f5fc",
})) proof.set(key, value);

for (const theme of [current, proof]) {
	assert.ok(
		contrast(theme.get("--brand-accent"), theme.get("--brand-content-inverse")) >= 4.5,
		"accent text contrast must remain WCAG AA",
	);
	assert.ok(
		contrast(theme.get("--brand-accent-hover"), theme.get("--brand-content-inverse")) >= 4.5,
		"accent hover text contrast must remain WCAG AA",
	);
}

for (const key of ["--brand-accent", "--brand-accent-hover", "--brand-accent-soft"]) {
	assert.notEqual(current.get(key), proof.get(key), `${key} must change in the blue proof theme`);
}
assert.ok(globalsCss.includes("CLONE_BRAND_VALUES_BEGIN"));
assert.ok(globalsCss.includes("CLONE_BRAND_VALUES_END"));
assert.equal(globalsCss.includes('@import "../project/brand.css"'), false);
assert.equal(/rgba?\(\s*(?:138\s*,\s*21\s*,\s*21|158\s*,\s*28\s*,\s*28)/i.test(globalsCss), false);
assert.equal(brandCss.includes("data-brand-proof"), false, "deprecated brand CSS must not ship a verification theme");
assert.equal(
	normalizeLineEndings(generatedBrandBlock()).trim(),
	renderBrandCss(starterBrandPreset).trim(),
);
assert.equal(
	normalizeLineEndings(readFileSync("src/project/font.generated.ts", "utf8")),
	renderProjectFontConfig(starterBrandPreset),
);

console.log(
	`verify:brand-ownership: ok (${analysis.brandPrimitives} primitives; current and fixture blue proof WCAG AA)`,
);
