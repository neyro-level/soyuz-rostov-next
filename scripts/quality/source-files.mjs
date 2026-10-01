import { readdirSync } from "node:fs";
import { extname, join } from "node:path";

const skipped = new Set([".git", ".next", "node_modules"]);

export function filesUnder(root, relativeDirectory, extensions) {
	const directory = join(root, relativeDirectory);
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		if (skipped.has(entry.name)) return [];
		const path = join(directory, entry.name);
		return entry.isDirectory()
			? filesUnder(root, join(relativeDirectory, entry.name), extensions)
			: extensions.has(extname(entry.name))
				? [path]
				: [];
	});
}
