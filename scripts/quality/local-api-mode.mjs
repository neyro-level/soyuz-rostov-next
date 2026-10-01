import { readFileSync } from "node:fs";
import { relative } from "node:path";

import { findMissingLocalApiModes } from "./local-api-mode-rule.mjs";
import { filesUnder } from "./source-files.mjs";

const root = process.cwd();
const findings = filesUnder(root, "src", new Set([".ts", ".tsx"])).flatMap(
	(path) =>
		findMissingLocalApiModes(
			readFileSync(path, "utf8"),
			relative(root, path).replaceAll("\\", "/"),
		),
);

if (findings.length) {
	console.error(
		findings
			.map(
				({ file, line, operation }) =>
					`${file}:${line} payload.${operation} missing explicit Local API mode`,
			)
			.join("\n"),
	);
	process.exit(1);
}

console.log("Local API mode guard: PASS");
