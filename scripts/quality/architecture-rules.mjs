import path from "node:path";
import ts from "typescript";

function sourceFile(name, content) {
	return ts.createSourceFile(
		name,
		content,
		ts.ScriptTarget.Latest,
		true,
		name.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
	);
}

function normalize(name) {
	return name.replaceAll("\\", "/");
}

function moduleReferences(name, content) {
	const references = [];
	const visit = (node) => {
		if (
			(ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
			node.moduleSpecifier &&
			ts.isStringLiteral(node.moduleSpecifier)
		) {
			references.push({ kind: "static", value: node.moduleSpecifier.text });
		}
		if (
			ts.isImportEqualsDeclaration(node) &&
			ts.isExternalModuleReference(node.moduleReference) &&
			node.moduleReference.expression &&
			ts.isStringLiteral(node.moduleReference.expression)
		) {
			references.push({
				kind: "static",
				value: node.moduleReference.expression.text,
			});
		}
		if (
			ts.isCallExpression(node) &&
			node.expression.kind === ts.SyntaxKind.ImportKeyword &&
			node.arguments.length === 1 &&
			ts.isStringLiteral(node.arguments[0])
		) {
			references.push({ kind: "dynamic", value: node.arguments[0].text });
		}
		ts.forEachChild(node, visit);
	};
	visit(sourceFile(name, content));
	return references;
}

function isFrameworkOrPersistence(moduleName) {
	return /^(?:next(?:\/|$)|payload$|@payloadcms\/|pg$|prisma$|@prisma\/)/.test(
		moduleName,
	);
}

function projectTarget(file, moduleName) {
	if (moduleName.startsWith("@/")) return `src/${moduleName.slice(2)}`;
	if (moduleName === "@ams/realtbase-ui") return "packages/ui";
	if (moduleName.startsWith("@ams/realtbase-ui/")) {
		return `packages/ui/${moduleName.slice("@ams/realtbase-ui/".length)}`;
	}
	if (!moduleName.startsWith(".")) return moduleName;
	return path.posix.normalize(
		path.posix.join(path.posix.dirname(file), moduleName),
	);
}

export function findPackageBoundaryViolations(entries) {
	const violations = [];
	for (const { name, content } of entries) {
		const file = normalize(name);
		const isUi = file.startsWith("packages/ui/");
		const isContracts = file.startsWith("packages/contracts/");
		const isCore = file.startsWith("src/core/");
		if (!isUi && !isContracts && !isCore) continue;
		for (const reference of moduleReferences(file, content)) {
			const target = projectTarget(file, reference.value);
			if (target.startsWith("src/project/")) {
				violations.push(`${file}: reusable layer imports project ${target}`);
				continue;
			}
			if ((isUi || isContracts) && isFrameworkOrPersistence(reference.value)) {
				violations.push(
					`${file}: ${isUi ? "UI" : "contracts"} imports framework/persistence runtime ${reference.value}`,
				);
			}
			if (isCore && target.startsWith("packages/ui")) {
				violations.push(`${file}: core imports UI ${target}`);
			}
		}
	}
	return violations;
}

function stringLiterals(name, content) {
	const values = [];
	const visit = (node) => {
		if (ts.isStringLiteralLike(node)) values.push(node.text);
		ts.forEachChild(node, visit);
	};
	visit(sourceFile(name, content));
	return values;
}

export function findForbiddenProjectLiteralViolations(entries, denylist) {
	const forbidden = denylist.filter(
		(value) => typeof value === "string" && value.length > 0,
	);
	return entries.flatMap(({ name, content }) => {
		const file = normalize(name);
		return stringLiterals(file, content).flatMap((value) =>
			forbidden.some((literal) => value.includes(literal))
				? [`${file}: reusable layer contains project city/brand/domain literal`]
				: [],
		);
	});
}

export function projectLiteralDenylist(policy) {
	const identity = policy?.projectIdentity;
	if (!identity || typeof identity !== "object") {
		throw new Error("project literal policy must declare projectIdentity");
	}
	const groups = ["brands", "domains", "cities"];
	const values = groups.flatMap((group) => {
		const items = identity[group];
		if (
			!Array.isArray(items) ||
			items.some((item) => typeof item !== "string")
		) {
			throw new Error(`project literal policy ${group} must be a string array`);
		}
		return items.map((item) => item.trim()).filter(Boolean);
	});
	return [...new Set(values)];
}

export function findHrefLiteralReports(entries) {
	const reports = [];
	for (const { name, content } of entries) {
		const file = normalize(name);
		if (!file.startsWith("packages/ui/")) continue;
		const visit = (node) => {
			const reportValue = (value) => {
				if (value.startsWith("#") || /^(?:mailto|tel|https?):/.test(value))
					return;
				reports.push(`${file}: JSX/object href literal`);
			};
			if (
				ts.isJsxAttribute(node) &&
				node.name.text === "href" &&
				node.initializer &&
				(ts.isStringLiteral(node.initializer) ||
					(ts.isJsxExpression(node.initializer) &&
						node.initializer.expression &&
						ts.isStringLiteralLike(node.initializer.expression)))
			) {
				const initializer = node.initializer;
				const value = ts.isStringLiteral(initializer)
					? initializer.text
					: initializer.expression.text;
				reportValue(value);
			}
			if (
				ts.isPropertyAssignment(node) &&
				((ts.isIdentifier(node.name) && node.name.text === "href") ||
					(ts.isStringLiteral(node.name) && node.name.text === "href")) &&
				ts.isStringLiteralLike(node.initializer)
			) {
				reportValue(node.initializer.text);
			}
			ts.forEachChild(node, visit);
		};
		visit(sourceFile(file, content));
	}
	return reports;
}

export function configuredStaticRoutePaths(name, content) {
	const paths = [];
	const visit = (node) => {
		if (
			ts.isPropertyAssignment(node) &&
			((ts.isIdentifier(node.name) && node.name.text === "staticRoutes") ||
				(ts.isStringLiteral(node.name) && node.name.text === "staticRoutes")) &&
			ts.isArrayLiteralExpression(node.initializer)
		) {
			for (const element of node.initializer.elements) {
				if (!ts.isObjectLiteralExpression(element)) continue;
				const pathProperty = element.properties.find(
					(property) =>
						ts.isPropertyAssignment(property) &&
						((ts.isIdentifier(property.name) &&
							property.name.text === "path") ||
							(ts.isStringLiteral(property.name) &&
								property.name.text === "path")),
				);
				if (
					pathProperty &&
					ts.isPropertyAssignment(pathProperty) &&
					ts.isStringLiteralLike(pathProperty.initializer)
				) {
					paths.push(pathProperty.initializer.text);
				}
			}
		}
		ts.forEachChild(node, visit);
	};
	visit(sourceFile(name, content));
	return [...new Set(paths)];
}

export function configuredLegacyRoutePaths(name, content) {
	const paths = [];
	const visit = (node) => {
		if (
			ts.isPropertyAssignment(node) &&
			((ts.isIdentifier(node.name) && node.name.text === "legacyRoutes") ||
				(ts.isStringLiteral(node.name) && node.name.text === "legacyRoutes")) &&
			ts.isArrayLiteralExpression(node.initializer)
		) {
			for (const element of node.initializer.elements) {
				if (!ts.isObjectLiteralExpression(element)) continue;
				const fromProperty = element.properties.find(
					(property) =>
						ts.isPropertyAssignment(property) &&
						((ts.isIdentifier(property.name) &&
							property.name.text === "from") ||
							(ts.isStringLiteral(property.name) &&
								property.name.text === "from")),
				);
				if (
					fromProperty &&
					ts.isPropertyAssignment(fromProperty) &&
					ts.isStringLiteralLike(fromProperty.initializer)
				) {
					paths.push(fromProperty.initializer.text);
				}
			}
		}
		ts.forEachChild(node, visit);
	};
	visit(sourceFile(name, content));
	return [...new Set(paths)];
}

export function configuredProjectGeoSlugs(name, content) {
	const values = [];
	const visit = (node) => {
		if (
			ts.isPropertyAssignment(node) &&
			((ts.isIdentifier(node.name) && node.name.text === "geos") ||
				(ts.isStringLiteral(node.name) && node.name.text === "geos")) &&
			ts.isObjectLiteralExpression(node.initializer)
		) {
			for (const property of node.initializer.properties) {
				if (ts.isPropertyAssignment(property)) {
					const value = ts.isIdentifier(property.name)
						? property.name.text
						: ts.isStringLiteral(property.name)
							? property.name.text
							: null;
					if (value) values.push(value);
				}
			}
		}
		ts.forEachChild(node, visit);
	};
	visit(sourceFile(name, content));
	return [...new Set(values)];
}

export function findStaticRouteParityViolations(
	routeFiles,
	configuredPaths,
	legacyFallbackPaths = [],
	allowUnconfiguredFolders = false,
) {
	const normalizedConfigured = new Set(
		configuredPaths.map((value) =>
			value === "/" ? "/" : `/${value.replace(/^\/+|\/+$/g, "")}`,
		),
	);
	const normalizedLegacyFallbacks = new Set(
		legacyFallbackPaths.map((value) =>
			value === "/" ? "/" : `/${value.replace(/^\/+|\/+$/g, "")}`,
		),
	);
	const folderPaths = new Set(
		routeFiles.flatMap((name) => {
			const file = normalize(name);
			const prefix = "src/app/(site)/";
			if (file === "src/app/(site)/page.tsx") return ["/"];
			if (!file.startsWith(prefix) || !file.endsWith("/page.tsx")) return [];
			const segments = file
				.slice(prefix.length, -"/page.tsx".length)
				.split("/");
			if (segments.some((segment) => segment.startsWith("["))) return [];
			return [`/${segments.join("/")}`];
		}),
	);
	return [
		...(allowUnconfiguredFolders
			? []
			: [...folderPaths]
					.filter(
						(pathValue) =>
							!normalizedConfigured.has(pathValue) &&
							!normalizedLegacyFallbacks.has(pathValue),
					)
					.map(
						(pathValue) =>
							`static route folder missing from registry: ${pathValue}`,
					)),
		...[...normalizedConfigured]
			.filter((pathValue) => !folderPaths.has(pathValue))
			.map((pathValue) => `static route registry missing folder: ${pathValue}`),
	];
}

function isCacheGraph(file) {
	return (
		file.startsWith("src/core/ingest/") ||
		file.startsWith("src/project/jobs/") ||
		file.startsWith("src/core/cache/")
	);
}

export function findCacheGraphViolations(entries) {
	const violations = [];
	for (const { name, content } of entries) {
		const file = normalize(name);
		if (!isCacheGraph(file)) continue;
		for (const reference of moduleReferences(file, content)) {
			if (reference.kind === "static" && reference.value.startsWith("next/")) {
				violations.push(
					`${file}: top-level ${reference.value} import in cache graph`,
				);
			}
			if (
				reference.kind === "dynamic" &&
				reference.value === "next/cache" &&
				file !== "src/core/cache/in-process.ts"
			) {
				violations.push(
					`${file}: lazy next/cache is only allowed in the in-process adapter`,
				);
			}
		}
	}
	return violations;
}

export function findUiPersistenceViolations(entries) {
	const violations = [];
	const forbidden = new Set(["localStorage", "sessionStorage", "indexedDB"]);
	for (const { name, content } of entries) {
		const file = normalize(name);
		if (!file.startsWith("packages/ui/")) continue;
		const hits = new Set();
		const visit = (node) => {
			if (ts.isIdentifier(node) && forbidden.has(node.text))
				hits.add(node.text);
			ts.forEachChild(node, visit);
		};
		visit(sourceFile(file, content));
		for (const api of hits) {
			violations.push(`${file}: UI must not own browser persistence (${api})`);
		}
	}
	return violations;
}

export function findSeoMorphologyDerivationViolations(entries) {
	const violations = [];
	for (const { name, content } of entries) {
		const file = normalize(name);
		if (!file.startsWith("src/project/seo/")) continue;
		if (
			/district(?:AdjLocative|AdjGenitive|Phrase)[\s\S]{0,160}\.replace\s*\(/u.test(
				content,
			) ||
			/\.replace\s*\([\s\S]{0,160}(?:районе|округе|микрорайоне)/iu.test(content)
		) {
			violations.push(
				`${file}: district morphology must use explicit stored forms, not suffix mutation`,
			);
		}
	}
	return violations;
}
