import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const modules = ["novostroyki", "journal", "agents"];
const requiredSections = [
	"Status",
	"Prerequisites",
	"Enabled flag owner",
	"Reserved URLs",
	"Collections to add",
	"Migration contract",
	"Backfill contract",
	"Gateway/DTO additions",
	"Feed identity requirements",
	"Cache targets",
	"UI composition",
	"SEO contract",
	"Verification",
	"Non-goals",
	"Trigger to REALTY_EXTENDED",
	"Rollback/deactivation notes",
];

const collectionMarkers = {
	novostroyki: ["developments", "developers"],
	journal: ["posts"],
	agents: ["agents"],
};

function parseProjectStates(projectText) {
	const block = projectText.match(
		/<!-- MODULE_GOVERNANCE_BEGIN -->([\s\S]*?)<!-- MODULE_GOVERNANCE_END -->/,
	)?.[1];
	if (!block)
		return {
			states: new Map(),
			violations: ["PROJECT module governance block is missing"],
		};

	const states = new Map();
	for (const module of modules) {
		const row = block
			.split(/\r?\n/)
			.find((line) => line.includes(`| \`${module}\` |`));
		if (!row) continue;
		const cells = [...row.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
		if (
			cells.length !== 3 ||
			!["enabled", "prepared", "disabled"].includes(cells[1])
		)
			continue;
		states.set(module, { state: cells[1], manifest: cells[2] });
	}

	const violations = modules
		.filter((module) => !states.has(module))
		.map((module) => `PROJECT module row is missing: ${module}`);
	return { states, violations };
}

function sourceMarkers(sourceFiles, module) {
	const markers = [];
	const modulePath = new RegExp(
		`(?:@/|src/)?project/modules/${module}(?:/|["'])`,
	);
	const routePath = new RegExp(
		`(?:^|/)${module === "novostroyki" ? "novostroyki" : module}(?:/|$)`,
	);
	for (const file of sourceFiles) {
		if (modulePath.test(file.content) || modulePath.test(file.name))
			markers.push(file.name);
		if (file.name.includes("/app/") && routePath.test(file.name))
			markers.push(file.name);
		for (const slug of collectionMarkers[module]) {
			const slugPattern = new RegExp(`slug\\s*:\\s*["']${slug}["']`);
			if (slugPattern.test(file.content))
				markers.push(`${file.name}#slug:${slug}`);
		}
	}
	return [...new Set(markers)];
}

function publicSurfaceMarkers(sourceFiles, module) {
	const route = module === "novostroyki" ? "novostroyki" : module;
	const routePath = new RegExp(`(?:^|/)app/(?:[^/]+/)*${route}(?:/|$)`);
	const publicOwner = /(?:sitemap\.ts|navigation|menu|site-header|site-footer)/i;
	const publicLiteral = new RegExp(`["'\\x60]/?${route}(?:/|["'\\x60])`);
	return sourceFiles.flatMap((file) => {
		if (routePath.test(file.name)) return [file.name];
		if (publicOwner.test(file.name) && publicLiteral.test(file.content)) {
			return [file.name];
		}
		return [];
	});
}

export function evaluateGovernance({ projectText, manifests, sourceFiles }) {
	const parsed = parseProjectStates(projectText);
	const violations = [...parsed.violations];

	for (const module of modules) {
		const config = parsed.states.get(module);
		const manifest = manifests.get(module);
		if (!manifest) {
			violations.push(`module manifest is missing: ${module}`);
			continue;
		}
		for (const section of requiredSections) {
			if (!manifest.includes(`## ${section}`)) {
				violations.push(`${module} manifest section is missing: ${section}`);
			}
		}
		if (!config) continue;
		const markers = sourceMarkers(sourceFiles, module);
		if (markers.length > 0 && config.state === "disabled") {
			violations.push(
				`${module} has runtime markers while disabled: ${markers.join(", ")}`,
			);
		}
		const publicMarkers = publicSurfaceMarkers(sourceFiles, module);
		if (publicMarkers.length > 0 && config.state === "prepared") {
			violations.push(
				`${module} has public surface markers while prepared: ${publicMarkers.join(", ")}`,
			);
		}
		if (config.manifest !== `docs/modules/${module}.md`) {
			violations.push(
				`${module} manifest mapping is not canonical: ${config.manifest}`,
			);
		}
	}

	return violations;
}

function walkSource(directory) {
	if (!fs.existsSync(directory)) return [];
	return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const absolute = path.join(directory, entry.name);
		if (entry.isDirectory()) return walkSource(absolute);
		if (!/\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) return [];
		return [
			{
				name: path.relative(root, absolute).replaceAll("\\", "/"),
				content: fs.readFileSync(absolute, "utf8"),
			},
		];
	});
}

const projectText = fs.readFileSync(path.join(root, "docs/PROJECT.md"), "utf8");
const manifests = new Map(
	modules.map((module) => {
		const file = path.join(root, "docs/modules", `${module}.md`);
		return [module, fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null];
	}),
);

const actualViolations = evaluateGovernance({
	projectText,
	manifests,
	sourceFiles: walkSource(path.join(root, "src")),
});

const negativeViolations = evaluateGovernance({
	projectText,
	manifests,
	sourceFiles: [
		{
			name: "src/project/modules/journal/index.ts",
			content: 'export const marker = "journal";',
		},
	],
});
if (
	!negativeViolations.some((violation) =>
		violation.includes("journal has runtime markers while disabled"),
	)
) {
	actualViolations.push(
		"negative fixture did not reject a disabled journal runtime marker",
	);
}

const preparedRouteViolations = evaluateGovernance({
	projectText,
	manifests,
	sourceFiles: [
		{
			name: "src/app/(site)/novostroyki/page.tsx",
			content: 'export default function Page() { return "public"; }',
		},
	],
});
if (
	!preparedRouteViolations.some((violation) =>
		violation.includes("novostroyki has public surface markers while prepared"),
	)
) {
	actualViolations.push(
		"negative fixture did not reject a prepared novostroyki public route",
	);
}

if (actualViolations.length > 0) {
	console.error(
		actualViolations.map((violation) => `- ${violation}`).join("\n"),
	);
	process.exit(1);
}

console.log(
	"Module governance: PASS (3 manifests; disabled and prepared negative fixtures rejected)",
);
