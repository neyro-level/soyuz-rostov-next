/** @type {import("dependency-cruiser").IConfiguration} */
export default {
	forbidden: [
		{
			name: "no-circular",
			severity: "error",
			from: {},
			to: { circular: true },
		},
		{
			name: "no-unresolved",
			severity: "error",
			from: {},
			to: { couldNotResolve: true },
		},
		{
			name: "production-does-not-import-tests",
			severity: "error",
			from: { path: "^(src|packages)/" },
			to: { path: "[.](?:spec|test)[.](?:js|mjs|cjs|jsx|ts|mts|cts|tsx)$" },
		},
		{
			name: "ui-has-no-persistence-dependencies",
			severity: "error",
			from: { path: "^packages/ui/" },
			to: { path: "^(?:next/|payload|@payloadcms/|pg$|prisma$|@prisma/)" },
		},
		{
			name: "contracts-have-no-runtime-or-persistence-dependencies",
			severity: "error",
			from: { path: "^packages/contracts/" },
			to: { path: "^(?:next/|payload|@payloadcms/|pg$|prisma$|@prisma/)" },
		},
		{
			name: "ui-does-not-import-app-persistence",
			severity: "error",
			from: { path: "^packages/ui/" },
			to: { path: "^src/(?:payload|project)/" },
		},
		{
			name: "core-does-not-import-ui",
			severity: "error",
			from: { path: "^src/core/" },
			to: { path: "^packages/ui/" },
		},
		{
			name: "core-and-packages-do-not-import-project",
			severity: "error",
			from: { path: "^(?:src/core|packages/(?:ui|contracts))/" },
			to: { path: "^src/project/" },
		},
	],
	options: {
		doNotFollow: { path: ["node_modules"] },
		tsConfig: { fileName: "tsconfig.json" },
		tsPreCompilationDeps: true,
		enhancedResolveOptions: {
			exportsFields: ["exports"],
			conditionNames: ["import", "node", "default", "types"],
			extensions: [".js", ".mjs", ".ts", ".tsx"],
			mainFields: ["module", "main", "types", "typings"],
		},
		skipAnalysisNotInRules: true,
	},
};
