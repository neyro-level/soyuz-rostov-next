import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { clientReadinessConfig } from "../src/project/client-readiness.config.ts";
import { siteConfig } from "../src/project/site.config.ts";
import { validateCloneBootstrap } from "./clone-preset.mjs";

const starterBrand = "AMS Realty Baza Starter";
const starterDomain = "start-baza.ams24.ru";

assert.equal(
	readFileSync(".env.example", "utf8").includes("LEAD_RETENTION_DAYS"),
	false,
	"lead retention must be a versioned client-readiness decision, not an unused env knob",
);
assert.ok(
	readFileSync("src/project/project.config.ts", "utf8").includes(
		"clientReadinessConfig.leadRetentionDays",
	),
	"runtime retention policy must project the client-readiness owner decision",
);

function domainOf(value) {
	if (!value?.trim()) return null;
	try {
		return new URL(value.includes("://") ? value : `https://${value}`).hostname;
	} catch {
		return null;
	}
}

export function validateClientReadiness(input) {
	if (input.projectKind !== "client") return [];

	const errors = [];
	const add = (code) => {
		if (!errors.includes(code)) errors.push(code);
	};
	const configuredDomain = domainOf(input.domain);
	const runtimeDomain = domainOf(input.runtimeOrigin);
	const text = JSON.stringify(input).toLowerCase();

	if (!input.brandName?.trim() || input.brandName.trim() === starterBrand) {
		add("starter-brand-identity");
	}
	if (text.includes("example.test")) add("example-test-runtime-fallback");
	if (
		configuredDomain === starterDomain ||
		runtimeDomain === starterDomain ||
		text.includes(starterDomain)
	) {
		add("starter-demo-domain");
	}
	if (
		input.mediaStorage === "local-media-dir" ||
		text.includes('"media_dir"')
	) {
		add("local-media-dir");
	}
	if (
		input.deploymentTarget === "starter-demo" ||
		text.includes("start-baza.compose") ||
		text.includes("start-baza.ams24.ru.conf")
	) {
		add("starter-deploy-target");
	}
	if (
		!Number.isInteger(input.leadRetentionDays) ||
		input.leadRetentionDays <= 0
	) {
		add("lead-retention-unset");
	}
	if (
		!Number.isInteger(input.archiveRetentionDays) ||
		input.archiveRetentionDays <= 0
	) {
		add("archive-retention-unset");
	}
	if (input.legalContent !== "approved") add("legal-content-placeholder");
	if (!["public", "noindex"].includes(input.productionIndexing)) {
		add("production-indexing-decision-missing");
	}
	if (!configuredDomain) add("client-domain-missing");
	if (
		input.productionIndexing === "public" &&
		(!configuredDomain ||
			!runtimeDomain ||
			configuredDomain !== runtimeDomain ||
			input.legalContent !== "approved")
	) {
		add("public-indexing-prerequisites-missing");
	}
	const allowlists = input.requiredHostAllowlists ?? {};
	if (
		!allowlists.outbound?.length ||
		!allowlists.externalImages?.length ||
		!allowlists.leadOutbound?.length
	) {
		add("required-host-allowlists-missing");
	}
	if (
		!input.deploymentTarget ||
		!input.database ||
		!input.mediaStorage ||
		!input.feedImageSource ||
		input.jobsActiveRuntimeCount !== 1 ||
		input.nginx !== true ||
		input.automaticBackup !== true ||
		input.externalMonitoring !== true
	) {
		add("client-storage-deployment-contract-missing");
	}

	return errors;
}

const validClientFixture = {
	projectKind: "client",
	brandName: "Клиент Недвижимость",
	domain: "realty-client.ru",
	runtimeOrigin: "https://realty-client.ru",
	deploymentTarget: "timeweb-vps",
	database: "timeweb-managed-postgresql",
	mediaStorage: "timeweb-s3",
	feedImageSource: "external-urls",
	jobsActiveRuntimeCount: 1,
	leadRetentionDays: 180,
	archiveRetentionDays: 90,
	legalContent: "approved",
	productionIndexing: "public",
	requiredHostAllowlists: {
		outbound: ["api.realty-client.ru"],
		externalImages: ["feed-cdn.example.org"],
		leadOutbound: ["crm.realty-client.ru"],
	},
	nginx: true,
	automaticBackup: true,
	externalMonitoring: true,
};

function verifyFixtures() {
	const invalidStarterFixture = {
		projectKind: "client",
		brandName: starterBrand,
		domain: null,
		runtimeOrigin: "https://example.test",
		deploymentTarget: "starter-demo",
		database: null,
		mediaStorage: "local-media-dir",
		feedImageSource: null,
		jobsActiveRuntimeCount: null,
		leadRetentionDays: null,
		archiveRetentionDays: null,
		legalContent: "placeholder",
		productionIndexing: null,
		requiredHostAllowlists: {
			outbound: [],
			externalImages: [],
			leadOutbound: [],
		},
		nginx: false,
		automaticBackup: false,
		externalMonitoring: false,
		deployConfig: `deploy/compose/start-baza.compose.yml ${starterDomain}`,
	};
	const expectedErrors = [
		"starter-brand-identity",
		"example-test-runtime-fallback",
		"starter-demo-domain",
		"local-media-dir",
		"starter-deploy-target",
		"lead-retention-unset",
		"archive-retention-unset",
		"legal-content-placeholder",
		"production-indexing-decision-missing",
		"client-domain-missing",
		"required-host-allowlists-missing",
		"client-storage-deployment-contract-missing",
	];
	assert.deepEqual(
		validateClientReadiness(invalidStarterFixture),
		expectedErrors,
	);
	assert.deepEqual(validateClientReadiness(validClientFixture), []);
	assert.deepEqual(
		validateClientReadiness({
			...validClientFixture,
			productionIndexing: "noindex",
		}),
		[],
	);
	assert.deepEqual(
		validateClientReadiness({
			...validClientFixture,
			legalContent: "placeholder",
		}),
		["legal-content-placeholder", "public-indexing-prerequisites-missing"],
	);
	assert.deepEqual(
		validateClientReadiness({
			...invalidStarterFixture,
			projectKind: "starter-demo",
		}),
		[],
		"starter demo and its approved deploy assets are outside the client gate",
	);
}

const mode = process.argv
	.find((arg) => arg.startsWith("--mode="))
	?.split("=")[1];
if (mode === "fixture-client") {
	verifyFixtures();
	console.log("verify:client-readiness: fixture-client PASS");
	process.exit(0);
}

const bootstrap =
	siteConfig.projectKind === "client"
		? validateCloneBootstrap(process.cwd())
		: null;
const errors = validateClientReadiness({
	...clientReadinessConfig,
	projectKind: siteConfig.projectKind,
	brandName: bootstrap?.nap.brandName,
	runtimeOrigin: process.env.NEXT_PUBLIC_SERVER_URL,
});
if (siteConfig.projectKind === "client") {
	assert.ok(bootstrap);
	if (
		bootstrap.productionIndexing !== clientReadinessConfig.productionIndexing
	) {
		errors.push("bootstrap-indexing-decision-drift");
	}
	if (bootstrap.domain !== clientReadinessConfig.domain) {
		errors.push("bootstrap-domain-drift");
	}
}
assert.deepEqual(errors, [], `Client readiness failed: ${errors.join(", ")}`);
console.log(
	`verify:client-readiness: ${siteConfig.projectKind === "client" ? "PASS" : "not applicable (starter-demo)"}`,
);
