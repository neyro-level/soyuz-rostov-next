import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";

const SOURCE_EXTENSIONS = new Set([".css", ".ts", ".tsx"]);
const SKIPPED_DIRECTORIES = new Set([".git", ".next", "node_modules"]);

export function walk(directory) {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		if (SKIPPED_DIRECTORIES.has(entry.name)) return [];
		const path = join(directory, entry.name);
		if (entry.isDirectory()) return walk(path);
		return SOURCE_EXTENSIONS.has(extname(entry.name)) ? [path] : [];
	});
}

export function scanDesignLiterals(source, file = "fixture.tsx") {
	const findings = [];
	const patterns = [
		["radius", /\brounded-\[(?!var\(--|inherit\])([^\]]+)\]/g],
		[
			"color",
			/(?:^|[\s"'`])(?:text|bg|border|ring|outline|fill|stroke)-\[(?!var\(--)(#[0-9a-f]{3,8}|rgba?\([^\]]+\)|hsla?\([^\]]+\))\]/gi,
		],
		["type-size", /\btext-\[(?!var\(--)([0-9.]+(?:px|rem))\]/g],
		["type-weight", /\bfont-\[(?!var\(--)([1-9][0-9]{2})\]/g],
		["motion-duration", /\bduration-\[(?!var\(--)([0-9.]+(?:ms|s))\]/g],
	];

	for (const [kind, pattern] of patterns) {
		for (const match of source.matchAll(pattern)) {
			const line = source.slice(0, match.index).split(/\r?\n/).length;
			findings.push({
				id: `design-literal:${file}:${line}:${kind}`,
				rule: "design-literals",
				file,
				line,
				kind,
				value: match[0].trim(),
			});
		}
	}

	return findings;
}

export function collectDesignFindings(root) {
	const roots = [join(root, "src"), join(root, "packages", "ui", "src")];
	return roots
		.flatMap((directory) => walk(directory))
		.flatMap((path) => {
			const file = relative(root, path).replaceAll("\\", "/");
			return scanDesignLiterals(readFileSync(path, "utf8"), file);
		});
}

export function fingerprint(finding) {
	return `${finding.rule}|${finding.file}|${finding.line}|${finding.kind}|${finding.value}`;
}
