import { readFileSync, readdirSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { analyzeDesignTokens } from "./design-tokens.mjs";

const root = resolve(import.meta.dirname, "../..");
const uiRoot = join(root, "packages", "ui", "src");
const policy = JSON.parse(readFileSync(join(import.meta.dirname, "ui-clone-policy.json"), "utf8"));
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
	const path = join(dir, entry.name);
	return entry.isDirectory() ? walk(path) : [path];
});
const sourceFiles = walk(uiRoot).filter((path) => /\.tsx?$/.test(path));
const plainUses = [];
for (const path of sourceFiles) {
	const lines = readFileSync(path, "utf8").split(/\r?\n/);
	for (let index = 0; index < lines.length; index += 1) {
		if (!/variant=["']plain["']/.test(lines[index])) continue;
		let component = "unknown";
		for (let cursor = index; cursor >= 0; cursor -= 1) {
			const match = lines[cursor].match(/<([A-Z][A-Za-z0-9.]*)\b/);
			if (match) { component = match[1]; break; }
		}
		const file = relative(root, path).replaceAll("\\", "/");
		const name = basename(path);
		const category = Object.entries(policy.classification).find(([, files]) => files.includes(name))?.[0] ?? "UNCLASSIFIED";
		plainUses.push({ file, line: index + 1, component, category });
	}
}

const tokenReport = analyzeDesignTokens();
const deadTokens = tokenReport.inventory.filter((item) => item.state === "DEAD").map((item) => item.token);
const packageJson = JSON.parse(readFileSync(join(root, "packages", "ui", "package.json"), "utf8"));
const cssFiles = walk(join(uiRoot, "styles")).map((path) => relative(root, path).replaceAll("\\", "/"));
const allSource = sourceFiles.map((path) => readFileSync(path, "utf8")).join("\n");
const projectTokenFamilies = [...new Set([...allSource.matchAll(/var\(--([a-z0-9]+)-/g)].map((match) => `--${match[1]}-`))].sort();
const donorViews = sourceFiles.filter((path) => /var\(--(?:home|catalog|property|legal|site|atlas)-/.test(readFileSync(path, "utf8"))).map((path) => relative(root, path).replaceAll("\\", "/"));
const lock = readFileSync(join(root, "pnpm-lock.yaml"), "utf8");
const lucide = lock.match(/lucide-react@([^\s:(]+)/)?.[1] ?? "not-found";

const report = {
	schema_version: 1,
	status: plainUses.length <= policy.plain_usage_limit && deadTokens.length === 0 ? "PASS" : "FAIL",
	plain_policy: { limit: policy.plain_usage_limit, actual: plainUses.length, uses: plainUses },
	donor_views: donorViews,
	project_token_families: projectTokenFamilies,
	dead_tokens: deadTokens,
	public_exports: Object.keys(packageJson.exports),
	page_specific_styles: cssFiles.filter((path) => !path.endsWith("/styles.css")),
	icons: { ecosystem: "lucide-react", locked_version: lucide, react_peer: packageJson.peerDependencies.react },
};
console.log(JSON.stringify(report, null, 2));
