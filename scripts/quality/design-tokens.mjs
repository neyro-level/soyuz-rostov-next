import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const tokenSource = join(root, "src/app/globals.css");
const brandCompatibilitySource = join(root, "src/project/brand.css");
const tokenCss = readFileSync(tokenSource, "utf8");
const brandCompatibilityCss = readFileSync(brandCompatibilitySource, "utf8");

function walk(directory, extensions) {
	return readdirSync(directory).flatMap((entry) => {
		if (entry === "node_modules" || entry === ".next") return [];
		const path = join(directory, entry);
		return statSync(path).isDirectory()
			? walk(path, extensions)
			: extensions.has(extname(entry))
				? [path]
				: [];
	});
}

const definitions = new Set(
	[...tokenCss.matchAll(/^\s*(--[a-z0-9_-]+)\s*:/gim)].map((match) => match[1]),
);
const brandDefinitions = new Set(
	[...tokenCss.matchAll(/^\s*(--brand-[a-z0-9_-]+)\s*:/gim)].map(
		(match) => match[1],
	),
);

const componentCssFiles = walk(join(root, "src"), new Set([".css"]))
	.concat(walk(join(root, "packages"), new Set([".css"])))
	.filter((path) => path !== tokenSource);
const externalDefinitions = new Set(
	componentCssFiles.flatMap((path) => {
		const css = readFileSync(path, "utf8");
		return [...css.matchAll(/(?:^|[;{])\s*(--[a-z0-9_-]+)\s*:/gim)].map(
			(match) => match[1],
		);
	}),
);
const knownDefinitions = new Set([
	...definitions,
	...brandDefinitions,
	...externalDefinitions,
]);
export function findExternalTokenMappings(files) {
	return files.flatMap(({ path, source }) =>
		[...source.matchAll(/(?:^|[;{])\s*(--[a-z0-9_-]+)\s*:/gim)].map(
			(match) => `${path}:${match[1]}`,
		),
	);
}

const externalMappings = findExternalTokenMappings(
	componentCssFiles.map((path) => ({
		path: relative(root, path).replaceAll("\\", "/"),
		source: readFileSync(path, "utf8"),
	})),
);
const externalValues = componentCssFiles.flatMap((path) => {
	const css = readFileSync(path, "utf8");
	return [...css.matchAll(/^\s*(--[a-z0-9_-]+)\s*:\s*([^;]+);/gim)]
		.filter((match) => !match[2].includes("var(--"))
		.map((match) => `${relative(root, path)}:${match[1]}`);
});

const uiFiles = walk(
	join(root, "packages/ui/src"),
	new Set([".ts", ".tsx", ".css"]),
);
const uiCodeFiles = uiFiles.filter((path) => !path.endsWith(".css"));
const primitiveStyleFiles = [
	...walk(
		join(root, "packages/ui/src/components/ui"),
		new Set([".ts", ".tsx"]),
	),
	join(root, "packages/ui/src/lead-consent-field.tsx"),
	join(root, "packages/ui/src/views/property/MediaGallery.tsx"),
];
const unresolved = [];

for (const path of uiFiles) {
	const source = readFileSync(path, "utf8");
	for (const match of source.matchAll(
		/var\((--[a-z0-9_-]+)(?:\s*,\s*([^)]*))?\)/gim,
	)) {
		const [, token, fallback] = match;
		if (knownDefinitions.has(token)) continue;

		const fallbackToken = fallback?.match(/var\((--[a-z0-9_-]+)/i)?.[1];
		const hasSafeFallback = Boolean(
			fallback && (!fallbackToken || knownDefinitions.has(fallbackToken)),
		);
		if (!hasSafeFallback) unresolved.push(`${relative(root, path)}:${token}`);
	}
}

const forbiddenStylePatterns = [
	/(?:text|bg|border|ring|accent|outline)-(?:white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-|\/|\b)/i,
	/#[0-9a-f]{3,8}\b/i,
	/rgba?\(/i,
	/hsla?\(/i,
	/rounded-\[(?!var\(|inherit\])/i,
	/backdrop-blur-\[(?!var\()/i,
	/duration-\[(?!var\()/i,
	/ease-\[(?!var\()/i,
];
const forbiddenStyles = primitiveStyleFiles.flatMap((path) => {
	const source = readFileSync(path, "utf8");
	return source.split(/\r?\n/).flatMap((line, index) => {
		const hasForbiddenLiteral = forbiddenStylePatterns.some((pattern) =>
			pattern.test(line),
		);
		const hasUntokenizedMotion =
			/\btransition(?:-|\s)/.test(line) &&
			!line.includes("duration-[var(--motion-duration-");
		return hasForbiddenLiteral || hasUntokenizedMotion
			? [`${relative(root, path)}:${index + 1}`]
			: [];
	});
});

const uiSource = uiCodeFiles
	.map((path) => readFileSync(path, "utf8"))
	.join("\n");
const allowedExternalHooks = new Set([
	"home-page",
	"request-modal__link",
	"site-primary-action",
]);
export function findRawPageDesignValues(files) {
	return files.flatMap(({ path, source }) => {
		const failures = [];
		for (const [index, line] of source.split(/\r?\n/).entries()) {
			if (
				/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|font-weight:\s*[0-9]+|border-radius:\s*[0-9]+|(?:[0-9]*\.)?[0-9]+(?:ms|s)\b/i.test(
					line,
				)
			) {
				failures.push(`${path}:${index + 1}:raw design value`);
			}
			if (/box-shadow:/.test(line) && !line.includes("var(--")) {
				failures.push(`${path}:${index + 1}:raw shadow`);
			}
		}
		return failures;
	});
}

const pageStyleFailures = componentCssFiles.flatMap((path) => {
	const css = readFileSync(path, "utf8");
	const relativePath = relative(root, path);
	const failures = findRawPageDesignValues([{ path: relativePath, source: css }]);
	for (const [index, line] of css.split(/\r?\n/).entries()) {
		if (/\.(?:journal|leadgen|promo)-/i.test(line)) {
			failures.push(`${relativePath}:${index + 1}:excluded module selector`);
		}
	}

	const selectorCss = css.replace(/^@import.*$/gm, "");
	const selectors = [
		...new Set(
			[...selectorCss.matchAll(/\.([a-z][a-z0-9_-]*)/gi)].map(
				(match) => match[1],
			),
		),
	];
	for (const selector of selectors) {
		if (!uiSource.includes(selector) && !allowedExternalHooks.has(selector)) {
			failures.push(`${relativePath}:unused selector .${selector}`);
		}
	}
	return failures;
});

const projectDoc = readFileSync(join(root, "docs/PROJECT.md"), "utf8");
const designDoc = readFileSync(join(root, "docs/DESIGN.md"), "utf8");

export function resolveModuleTokenReservations({
	designText,
	projectText,
	manifestExists,
}) {
	const projectModuleBlock =
		projectText.match(
			/<!-- MODULE_GOVERNANCE_BEGIN -->([\s\S]*?)<!-- MODULE_GOVERNANCE_END -->/,
		)?.[1] ?? "";
	const projectModules = new Set(
		[...projectModuleBlock.matchAll(/\|\s*`([a-z0-9-]+)`\s*\|/gi)].map(
			(match) => match[1].toLowerCase(),
		),
	);
	const reservationBlock =
		designText.match(
			/<!-- MODULE_TOKEN_RESERVATIONS_BEGIN -->([\s\S]*?)<!-- MODULE_TOKEN_RESERVATIONS_END -->/,
		)?.[1] ?? "";
	const rows = [
		...reservationBlock.matchAll(
			/\|\s*`([a-z0-9-]+)`\s*\|\s*`(--[a-z0-9_-]+-)`\s*\|/gi,
		),
	].map((match) => ({ module: match[1].toLowerCase(), prefix: match[2] }));
	const failures = rows.flatMap(({ module }) => {
		const rowFailures = [];
		if (!projectModules.has(module))
			rowFailures.push(
				`reserved token module is not documented in PROJECT.md: ${module}`,
			);
		if (!manifestExists(module))
			rowFailures.push(`reserved token module manifest is missing: ${module}`);
		return rowFailures;
	});
	return {
		prefixes: failures.length === 0 ? rows.map(({ prefix }) => prefix) : [],
		failures,
	};
}

const reservationContract = resolveModuleTokenReservations({
	designText: designDoc,
	projectText: projectDoc,
	manifestExists: (module) =>
		existsSync(join(root, "docs/modules", `${module}.md`)),
});
const reservationFailures = reservationContract.failures;
const reservedPrefixes = reservationContract.prefixes;

function isReservedToken(token) {
	return reservedPrefixes.some((prefix) => token.startsWith(prefix));
}

const externalIntegrationPrefixes = ["--yarl__"];

function isExternalIntegrationToken(token) {
	return externalIntegrationPrefixes.some((prefix) => token.startsWith(prefix));
}

const themeBlock =
	tokenCss.match(/^@theme inline\s*\{([\s\S]*?)^\}/m)?.[1] ?? "";
const themeKeys = new Set(
	[...themeBlock.matchAll(/^\s*(--[a-z0-9_-]+)\s*:/gim)].map(
		(match) => match[1],
	),
);
const codeCorpus = [
	...walk(join(root, "src"), new Set([".css", ".ts", ".tsx"])),
	...walk(join(root, "packages"), new Set([".css", ".ts", ".tsx"])),
	...walk(join(root, "scripts"), new Set([".mjs", ".ts"])),
]
	.filter((path) => path !== tokenSource)
	.map((path) => ({ path, text: readFileSync(path, "utf8") }));

const guardedBrandColorNames = new Set([
	"--brand-accent",
	"--brand-accent-hover",
	"--brand-accent-soft",
	"--brand-status-warning",
	"--brand-status-danger",
	"--brand-status-success",
	"--brand-status-info",
]);
const rawBrandColorPatterns = [
	...tokenCss.matchAll(
		/^\s*(--brand-[a-z0-9_-]+)\s*:\s*(#[0-9a-f]{3,8})\s*;/gim,
	),
]
	.filter((match) => guardedBrandColorNames.has(match[1]))
	.map((match) => new RegExp(`${match[2]}\\b`, "i"));
const rawBrandColorFindings = codeCorpus.flatMap((file) =>
	!file.path.includes(`${join(root, "scripts")}`) &&
	rawBrandColorPatterns.some((pattern) => pattern.test(file.text))
		? [relative(root, file.path).replaceAll("\\", "/")]
		: [],
);
const proofColorPatterns = [/#1557b0\b/i, /#0b3f82\b/i, /#f0f5fc\b/i];
export function findProofColorRuntimeFindings(files) {
	return files.flatMap(({ path, source }) =>
		!path.startsWith("scripts/") &&
		proofColorPatterns.some((pattern) => pattern.test(source))
			? [path]
			: [],
	);
}
const proofColorRuntimeFindings = findProofColorRuntimeFindings(
	codeCorpus.map((file) => ({
		path: relative(root, file.path).replaceAll("\\", "/"),
		source: file.text,
	})),
);
const neutralEffectRgbAllowlist = new Set([
	"0,0,0",
	"16,16,17",
	"17,24,39",
	"20,18,22",
	"23,22,26",
	"24,22,24",
	"24,24,26",
	"28,27,31",
	"227,227,225",
	"255,255,255",
]);
const unapprovedEffectColors = [
	...tokenCss.matchAll(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,/gim),
]
	.map((match) => `${match[1]},${match[2]},${match[3]}`)
	.filter((rgb) => !neutralEffectRgbAllowlist.has(rgb));

const deadTokens = [...definitions].filter((token) => {
	if (themeKeys.has(token) || isReservedToken(token) || isExternalIntegrationToken(token)) return false;
	const needle = `var(${token}`;
	return (
		!codeCorpus.some((file) => file.text.includes(needle)) &&
		!tokenCss.includes(needle)
	);
});

const moduleDrift = codeCorpus.flatMap((file) => {
	const relativePath = relative(root, file.path).replaceAll("\\", "/");
	if (
		relativePath.includes("/journal") ||
		relativePath.endsWith("globals.css") ||
		relativePath.includes("token-taxonomy")
	) {
		return [];
	}
	const hits = [...file.text.matchAll(/var\((--journal-[a-z0-9_-]+)/gi)].map(
		(match) => match[1],
	);
	return hits.map(
		(token) => `${relativePath}:${token}: journal token outside journal module`,
	);
});

const secondControl = componentCssFiles.flatMap((path) => {
	const css = readFileSync(path, "utf8");
	return css.includes(".home-btn-primary")
		? [`${relative(root, path)}: second control pattern .home-btn-primary`]
		: [];
});

const required = [
	"--background",
	"--surface",
	"--text-primary",
	"--border",
	"--accent",
	"--site-type-display",
	"--site-type-body",
	"--site-radius-sm",
	"--site-radius-lg",
	"--site-radius-full",
	"--site-font-weight-medium",
	"--site-font-weight-bold",
	"--site-frame-max",
	"--site-frame-floating-max",
	"--container-copy-measure",
	"--container-narrow-max",
	"--container-site-max",
	"--container-wide-max",
	"--site-section-space-desktop",
	"--section-space-sm",
	"--section-space-md",
	"--section-space-lg",
	"--control-height-md",
	"--control-radius",
	"--focus-ring-soft",
	"--motion-duration-standard",
	"--motion-ease-standard",
	"--motion-ease-emphasized",
	"--color-background",
	"--font-sans",
];

export function classifyTokenState({
	requiredToken,
	themeToken,
	reservedToken,
	used,
}) {
	if (requiredToken) return "CORE";
	if (themeToken) return "SHADCN";
	if (reservedToken) return "MODULE-RESERVED";
	if (used) return "PROJECT ACTIVE";
	return "DEAD";
}

const requiredSet = new Set(required);
const deadTokenSet = new Set(deadTokens);
const usageLocations = new Map(
	[...definitions].map((token) => {
		const needle = `var(${token}`;
		const locations = codeCorpus.flatMap((file) =>
			file.text
				.split(/\r?\n/)
				.flatMap((line, index) =>
					line.includes(needle)
						? [
								`${relative(root, file.path).replaceAll("\\", "/")}:${index + 1}`,
							]
						: [],
				),
		);
		for (const [index, line] of tokenCss.split(/\r?\n/).entries()) {
			if (line.includes(needle))
				locations.push(`src/app/globals.css:${index + 1}`);
		}
		return [token, [...new Set(locations)]];
	}),
);
const inventory = [...definitions]
	.map((token) => ({
		token,
		state: classifyTokenState({
			requiredToken: requiredSet.has(token),
			themeToken: themeKeys.has(token),
			reservedToken: isReservedToken(token),
			used: !deadTokenSet.has(token),
		}),
		usages: usageLocations.get(token) ?? [],
	}))
	.sort((left, right) => left.token.localeCompare(right.token));

const fixtureFailures = [];
const reservationFixture = resolveModuleTokenReservations({
	designText:
		"<!-- MODULE_TOKEN_RESERVATIONS_BEGIN -->\n| `journal` | `--journal-` |\n<!-- MODULE_TOKEN_RESERVATIONS_END -->",
	projectText:
		"<!-- MODULE_GOVERNANCE_BEGIN -->\n| `journal` | `disabled` | `docs/modules/journal.md` |\n<!-- MODULE_GOVERNANCE_END -->",
	manifestExists: (module) => module === "journal",
});
if (
	reservationFixture.failures.length > 0 ||
	!reservationFixture.prefixes.includes("--journal-")
) {
	fixtureFailures.push(
		"positive module reservation fixture did not satisfy the three-source contract",
	);
}
const brokenReservationFixture = resolveModuleTokenReservations({
	designText:
		"<!-- MODULE_TOKEN_RESERVATIONS_BEGIN -->\n| `journal` | `--journal-` |\n<!-- MODULE_TOKEN_RESERVATIONS_END -->",
	projectText: "<!-- MODULE_GOVERNANCE_BEGIN --><!-- MODULE_GOVERNANCE_END -->",
	manifestExists: () => false,
});
if (brokenReservationFixture.failures.length === 0) {
	fixtureFailures.push(
		"negative module reservation fixture accepted a missing project/manifest contract",
	);
}
if (
	classifyTokenState({
		requiredToken: false,
		themeToken: false,
		reservedToken: false,
		used: false,
	}) !== "DEAD"
) {
	fixtureFailures.push("negative token fixture was not classified DEAD");
}
if (
	classifyTokenState({
		requiredToken: false,
		themeToken: false,
		reservedToken: true,
		used: false,
	}) !== "MODULE-RESERVED"
) {
	fixtureFailures.push(
		"documented module token fixture was not classified MODULE-RESERVED",
	);
}
if (
	findExternalTokenMappings([
		{ path: "fixture.css", source: ".fixture { --component-accent: var(--accent); }" },
	]).length !== 1
) {
	fixtureFailures.push("negative external token mapping fixture was not detected");
}
if (
	findRawPageDesignValues([
		{ path: "fixture.css", source: ".fixture { color: #1557b0; box-shadow: 0 1px 2px #000; }" },
	]).length !== 2
) {
	fixtureFailures.push("negative raw page design-value fixture was not detected");
}
if (
	findProofColorRuntimeFindings([
		{ path: "packages/ui/src/fixture.tsx", source: 'style={{ color: "#1557b0" }}' },
	]).length !== 1
) {
	fixtureFailures.push("negative runtime proof-color fixture was not detected");
}

const missingRequired = required.filter((token) => !definitions.has(token));
const brandCompatibilityDefinitions = [
	...brandCompatibilityCss.matchAll(/^\s*(--[a-z0-9_-]+)\s*:/gim),
].map((match) => match[1]);
const failures = [
	...(brandDefinitions.size < 20 || brandDefinitions.size > 30
		? [`brand primitive count ${brandDefinitions.size} is outside 20..30`]
		: []),
	...rawBrandColorFindings.map(
		(file) => `raw brand color outside src/app/globals.css: ${file}`,
	),
	...unapprovedEffectColors.map(
		(rgb) => `raw effect RGB is absent from the explicit neutral allowlist: ${rgb}`,
	),
	...missingRequired.map((token) => `missing required token ${token}`),
	...externalValues.map(
		(item) => `raw token value outside globals.css ${item}`,
	),
	...externalMappings.map(
		(item) => `semantic/component token mapping outside globals.css ${item}`,
	),
	...unresolved.map((item) => `unresolved UI token ${item}`),
	...forbiddenStyles.map((item) => `forbidden primitive style literal ${item}`),
	...pageStyleFailures.map((item) => `page CSS violation ${item}`),
	...deadTokens.map((token) => `dead token ${token}`),
	...proofColorRuntimeFindings.map(
		(file) => `test proof color outside test/verification code: ${file}`,
	),
	...reservationFailures,
	...fixtureFailures,
	...moduleDrift,
	...secondControl,
];

if (!tokenCss.includes("@theme inline"))
	failures.push("missing Tailwind @theme mapping");
if (
	!tokenCss.includes("CLONE_BRAND_VALUES_BEGIN") ||
	!tokenCss.includes("CLONE_BRAND_VALUES_END")
) {
	failures.push("globals.css clone brand values block is missing");
}
if (tokenCss.includes('@import "../project/brand.css"'))
	failures.push("globals.css must not import deprecated src/project/brand.css");
if (brandCompatibilityDefinitions.length > 0) {
	failures.push(
		`src/project/brand.css must not define custom properties: ${brandCompatibilityDefinitions.join(", ")}`,
	);
}
if (brandCompatibilityCss.includes("data-brand-proof"))
	failures.push("deprecated brand.css must not ship a verification-only proof theme");

export function analyzeDesignTokens() {
	return {
		tokenSource: "src/app/globals.css",
		brandSource: "src/app/globals.css",
		brandCompatibilitySource: "src/project/brand.css",
		brandPrimitives: brandDefinitions.size,
		definitions: definitions.size,
		uiSourceFiles: uiFiles.length,
		inventory,
		failures: [...failures],
	};
}

if (resolve(process.argv[1] ?? "") === import.meta.filename) {
	if (failures.length > 0) {
		console.error(failures.join("\n"));
		process.exit(1);
	}

	console.log(
		`Design tokens OK: ${definitions.size} semantic/component definitions + ${brandDefinitions.size} brand primitives, ${uiFiles.length} UI source files.`,
	);
}
