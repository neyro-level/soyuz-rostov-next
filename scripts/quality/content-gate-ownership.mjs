import { existsSync, readFileSync, readdirSync } from "node:fs";
import { relative, resolve } from "node:path";

const root = process.cwd();
const codeExtension = /\.(?:ts|tsx)$/;
function filesUnder(directory) {
	const absolute = resolve(root, directory);
	if (!existsSync(absolute)) return [];
	return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
		const child = resolve(absolute, entry.name);
		return entry.isDirectory()
			? filesUnder(relative(root, child))
			: codeExtension.test(entry.name)
				? [relative(root, child).replaceAll("\\", "/")]
				: [];
	});
}
const owned = [
	...filesUnder("src/app/(site)"),
	...filesUnder("src/project/data-access/public"),
	"src/project/routing/runtime-route.ts",
	"src/project/seo/discovery-runtime.ts",
];
const violations = owned.filter((file) =>
	/indexing\s*:\s*["']index["']/.test(readFileSync(resolve(root, file), "utf8")),
);
if (violations.length) {
	throw new Error(
		`Content Gate ownership violation: direct index decision in ${violations.join(", ")}`,
	);
}
const runtime = readFileSync(
	resolve(root, "src/project/routing/runtime-route.ts"),
	"utf8",
);
const discovery = readFileSync(
	resolve(root, "src/project/seo/discovery-runtime.ts"),
	"utf8",
);
const provider = readFileSync(
	resolve(root, "src/project/data-access/public/provider.ts"),
	"utf8",
);
if (!runtime.includes("decidePage(decision, routeData)")) {
	throw new Error("Runtime route must delegate page semantics to decidePage.");
}
if (
	!discovery.includes("entry.gate") ||
	discovery.includes("resolveRuntimeRoute") ||
	!provider.includes("decideResolvedPage")
) {
	throw new Error(
		"Discovery runtime must consume batch Gate decisions without per-URL runtime resolution.",
	);
}
console.log("content-gate ownership guard passed");
