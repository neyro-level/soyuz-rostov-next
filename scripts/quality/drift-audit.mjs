import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const stylesEntryPath = join(root, "packages", "ui", "src", "styles.css");
const stylesDir = join(root, "packages", "ui", "src", "styles");
const tokenSource = join(root, "src", "app", "globals.css");
const maxImportedBytes = 10 * 1024;
const violations = [];

function walk(directory, extensions) {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		if (entry.name === "node_modules" || entry.name === ".next") return [];
		const path = join(directory, entry.name);
		if (entry.isDirectory()) return walk(path, extensions);
		return extensions.has(extname(entry.name)) ? [path] : [];
	});
}

const stylesEntry = readFileSync(stylesEntryPath, "utf8");
const importedNames = [
	...stylesEntry.matchAll(/@import\s+["']\.\/styles\/([^"']+)["']/g),
].map((match) => match[1]);

if (importedNames.includes("home-page.css")) {
	violations.push("home-page.css must not be a runtime import of packages/ui/src/styles.css");
}

const importedPaths = importedNames.map((name) => join(stylesDir, name));

for (const path of importedPaths) {
	const name = relative(root, path).replaceAll("\\", "/");
	const size = statSync(path).size;
	if (size > maxImportedBytes) {
		violations.push(`${name}: imported CSS is ${size} bytes (> 10 KB)`);
	}

	const css = readFileSync(path, "utf8");
	if (/\.site-primary-action\b/.test(css)) {
		violations.push(`${name}: runtime CSS must not define .site-primary-action`);
	}

	const selectorCounts = new Map();
	for (const match of css.matchAll(/(?:^|})\s*(\.[a-z][\w-]*)\s*\{/gi)) {
		const selector = match[1].toLowerCase();
		if (!/(?:btn|button|primary-action)$/i.test(selector) && !/\.(btn|button)/i.test(selector)) {
			continue;
		}
		selectorCounts.set(selector, (selectorCounts.get(selector) ?? 0) + 1);
	}
	for (const [selector, count] of selectorCounts) {
		if (count > 1) {
			violations.push(`${name}: duplicate primitive selector ${selector} (${count})`);
		}
	}

	if (/:root\s*\{[^}]*--[a-z0-9-]+\s*:/i.test(css)) {
		violations.push(`${name}: imported CSS must not be a second token file`);
	}
}

const extraTokenFiles = walk(join(root, "src"), new Set([".css"]))
	.concat(walk(join(root, "packages"), new Set([".css"])))
	.filter((path) => /tokens\.css$/i.test(path) && path !== tokenSource);
for (const path of extraTokenFiles) {
	violations.push(`${relative(root, path).replaceAll("\\", "/")}: extra token file`);
}

const projectCss = walk(join(root, "src"), new Set([".css"])).concat(
	walk(join(root, "packages"), new Set([".css"])),
);
for (const path of projectCss) {
	const css = readFileSync(path, "utf8");
	const name = relative(root, path).replaceAll("\\", "/");
	if (path !== tokenSource && /^\s*--brand-[a-z0-9_-]+\s*:/im.test(css)) {
		violations.push(`${name}: brand primitive defined outside src/app/globals.css`);
	}
}

if (violations.length) {
	console.error(violations.join("\n"));
	process.exit(1);
}

console.log(
	`verify:drift ok (${importedNames.join(", ") || "no local style imports"}; atlas dumps not size-gated)`,
);
