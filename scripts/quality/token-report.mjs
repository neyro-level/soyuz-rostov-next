import { analyzeDesignTokens } from "./design-tokens.mjs";

const analysis = analyzeDesignTokens();
const args = process.argv.slice(2);
const format =
	args.find((arg) => arg.startsWith("--format="))?.split("=")[1] ?? "table";
const deadOnly = args.includes("--dead-only");
const explained = args
	.find((arg) => arg.startsWith("--explain="))
	?.slice("--explain=".length);

if (!["table", "json"].includes(format)) {
	console.error("tokens:report supports --format=table or --format=json");
	process.exit(1);
}

const normalizedExplain = explained
	? explained.startsWith("--")
		? explained
		: `--${explained}`
	: null;
let rows = analysis.inventory;
if (deadOnly) rows = rows.filter((item) => item.state === "DEAD");
if (normalizedExplain)
	rows = rows.filter((item) => item.token === normalizedExplain);

if (normalizedExplain && rows.length === 0) {
	console.error(`Unknown token: ${normalizedExplain}`);
	process.exit(1);
}

const counts = Object.fromEntries(
	["CORE", "SHADCN", "PROJECT ACTIVE", "MODULE-RESERVED", "DEAD"].map(
		(state) => [
			state,
			analysis.inventory.filter((item) => item.state === state).length,
		],
	),
);

if (format === "json") {
	console.log(
		JSON.stringify({ ...analysis, counts, inventory: rows }, null, 2),
	);
} else {
	console.log(
		[["BRAND", analysis.brandPrimitives], ...Object.entries(counts)]
			.map(([state, count]) => `${state}=${count}`)
			.join(" | "),
	);
	console.log("STATE\tTOKEN\tUSAGE LOCATIONS");
	for (const item of rows) {
		console.log(
			`${item.state}\t${item.token}\t${item.usages.join(", ") || "-"}`,
		);
	}
}

if (analysis.failures.length > 0) {
	console.error(
		`Gate findings: ${analysis.failures.length}. Run pnpm quality:design-tokens for fail output.`,
	);
}
