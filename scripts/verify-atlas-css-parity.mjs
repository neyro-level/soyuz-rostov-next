import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
const donorRoot = process.env.ATLAS_DONOR_ROOT;
const donorSha = process.env.ATLAS_DONOR_SHA;
const port = Number(process.env.ATLAS_PARITY_PORT ?? 3013);
const baseUrl = `http://127.0.0.1:${port}`;

if (!donorRoot || !donorSha) {
	throw new Error("ATLAS_DONOR_ROOT and ATLAS_DONOR_SHA are required");
}
if (!/^[0-9a-f]{40}$/.test(donorSha)) {
	throw new Error("ATLAS_DONOR_SHA must be a full lowercase Git SHA");
}

const git = (...args) =>
	execFileSync("git", ["-C", donorRoot, ...args], { encoding: "utf8" }).trim();
if (
	git("rev-parse", "HEAD") !== donorSha ||
	git("rev-parse", "origin/main") !== donorSha
) {
	throw new Error("Atlas donor is not at the pinned SHA");
}
if (git("status", "--porcelain", "--untracked-files=no")) {
	throw new Error("Atlas donor has tracked changes");
}
if (
	!/git\.sourcecraft\.dev[/:]integrator-p\/atlas-realty-starter(?:\.git)?$/.test(
		git("remote", "get-url", "origin"),
	)
) {
	throw new Error("Unexpected Atlas donor origin");
}

const cssPaths = [
	"src/app/globals.css",
	"packages/ui/src/styles/shell.css",
	"packages/ui/src/styles/request-modal.css",
	"packages/ui/src/styles/site-footer.css",
	"packages/ui/src/styles/home-articles.css",
];
const cssParts = await Promise.all(
	cssPaths.map(async (file) => {
		let css = await readFile(path.join(root, file), "utf8");
		if (file.endsWith("globals.css")) {
			css = css
				.replace(/^@import .*$/gm, "")
				.replace(/^@source .*$/gm, "")
				.replace(/^@custom-variant .*$/gm, "")
				.replace(/@theme inline\s*\{[\s\S]*\}\s*$/m, "");
		}
		return `/* ${file} */\n${css}`;
	}),
);
const baseCss = cssParts.slice(0, 4).join("\n");
const homeCss = cssParts.slice(4).join("\n");
const stabilityCss = `
*, *::before, *::after {
  animation: none !important;
  caret-color: transparent !important;
  scroll-behavior: auto !important;
  transition: none !important;
}
nextjs-portal {
  display: none !important;
}`;

const scenarioFilter = process.env.ATLAS_PARITY_SCENARIO;
const viewportFilter = process.env.ATLAS_PARITY_VIEWPORT;
const scenarios = [
	{ name: "home", route: "/" },
	{ name: "catalog", route: "/kvartiry/" },
	{ name: "property", route: "/kvartiry/svetlaya-kvartira-v-centre-1001/" },
	{ name: "commercial-service", route: "/promo/stroitelstvo-domov" },
	{ name: "contacts", route: "/kontakty" },
	{ name: "lead-modal-validation", route: "/", state: "lead-modal-validation" },
].filter(({ name }) => !scenarioFilter || name === scenarioFilter);
const viewports = [
	{ name: "mobile", width: 390, height: 844 },
	{ name: "tablet", width: 768, height: 1024 },
	{ name: "desktop", width: 1280, height: 900 },
	{ name: "wide", width: 1440, height: 1000 },
].filter(({ name }) => !viewportFilter || name === viewportFilter);

async function waitForServer(server) {
	const deadline = Date.now() + 180_000;
	while (Date.now() < deadline) {
		if (server.exitCode !== null)
			throw new Error(`Atlas exited with ${server.exitCode}`);
		try {
			if ((await fetch(baseUrl)).ok) return;
		} catch {}
		await new Promise((resolve) => setTimeout(resolve, 500));
	}
	throw new Error("Atlas fixture server did not become ready");
}

await new Promise((resolve, reject) => {
	const probe = net.createServer();
	probe.once("error", () =>
		reject(new Error(`Port ${port} is already in use`)),
	);
	probe.once("listening", () => probe.close(resolve));
	probe.listen(port, "127.0.0.1");
});

const nextBin = path.join(
	donorRoot,
	"node_modules",
	"next",
	"dist",
	"bin",
	"next",
);
const playwrightUrl = pathToFileURL(
	path.join(donorRoot, "node_modules", "@playwright", "test", "index.mjs"),
).href;
const { chromium } = await import(playwrightUrl);
const server = spawn(
	process.execPath,
	[nextBin, "dev", "--hostname", "127.0.0.1", "--port", String(port)],
	{
		cwd: donorRoot,
		env: {
			...process.env,
			APP_ENV: "test",
			DATABASE_URL:
				"postgresql://atlas_realty_starter_local:replace-local-password@127.0.0.1:5435/atlas_realty_starter_test",
			NEXT_PUBLIC_APP_URL: baseUrl,
			NEXT_PUBLIC_INDEXABLE: "false",
			NEXT_PUBLIC_SITE_URL: baseUrl,
			NODE_ENV: "development",
			PAYLOAD_SECRET: "fixture-visual-secret-at-least-32-characters",
			REVALIDATE_SECRET: "fixture-visual-revalidate-at-least-32-chars",
			SITE_ENGINE: "fixture",
		},
		stdio: "ignore",
		windowsHide: true,
	},
);

let browser;
const comparisons = [];
const mismatchRoot = path.join(root, ".tmp", "atlas-css-parity");

async function capture(context, scenario, css) {
	const page = await context.newPage();
	try {
		await page.goto(new URL(scenario.route, baseUrl).toString(), {
			waitUntil: "networkidle",
			timeout: 90_000,
		});
		await page
			.locator('main:not([aria-busy="true"])')
			.waitFor({ state: "visible", timeout: 30_000 });
		await page.waitForFunction(
			() =>
				Math.abs(
					document.querySelector("main")?.getBoundingClientRect().left ?? 9999,
				) < 2,
			undefined,
			{ timeout: 30_000 },
		);
		if (scenario.route === "/") {
			await page.waitForFunction(
				() =>
					Math.abs(
						document.querySelector(".home-page")?.getBoundingClientRect()
							.left ?? 9999,
					) <
					window.innerWidth / 4,
				undefined,
				{ timeout: 30_000 },
			);
		}
		if (css) {
			await page.addStyleTag({ content: css });
		}
		await page.addStyleTag({ content: stabilityCss });
		await page.waitForTimeout(300);
		await page.evaluate(async () => {
			await document.fonts.ready;
			window.scrollTo(0, 0);
		});
		if (scenario.state) {
			await page
				.getByRole("button", { name: "Подобрать проверенный объект" })
				.click();
			const dialog = page.getByRole("dialog");
			await dialog.locator('button[type="submit"]').click();
			await dialog.getByText("Введите имя").waitFor({ state: "visible" });
		}
		return await page.screenshot({
			animations: "disabled",
			fullPage: true,
			mask: [page.locator("[data-visual-dynamic]")],
			maskColor: "#e7e5e4",
		});
	} finally {
		await page.close();
	}
}

try {
	await waitForServer(server);
	browser = await chromium.launch();
	for (const viewport of viewports) {
		const context = await browser.newContext({
			colorScheme: "light",
			locale: "ru-RU",
			reducedMotion: "reduce",
			viewport: { width: viewport.width, height: viewport.height },
		});
		await context.addInitScript(() =>
			localStorage.setItem("agency.cookie.notice.dismissed", "1"),
		);
		for (const scenario of scenarios) {
			const scenarioCss = `${baseCss}\n${scenario.route === "/" ? homeCss : ""}`;
			const before = await capture(context, scenario);
			const after = await capture(context, scenario, scenarioCss);
			const beforeHash = createHash("sha256").update(before).digest("hex");
			const afterHash = createHash("sha256").update(after).digest("hex");
			if (beforeHash !== afterHash) {
				await mkdir(mismatchRoot, { recursive: true });
				const prefix = `${scenario.name}-${viewport.width}x${viewport.height}`;
				await Promise.all([
					writeFile(path.join(mismatchRoot, `${prefix}-before.png`), before),
					writeFile(path.join(mismatchRoot, `${prefix}-after.png`), after),
				]);
			}
			comparisons.push({
				scenario: scenario.name,
				viewport: `${viewport.width}x${viewport.height}`,
				beforeHash,
				afterHash,
				identical: beforeHash === afterHash,
			});
		}
		await context.close();
	}
} finally {
	if (browser) await browser.close();
	if (server.exitCode === null) server.kill();
}

const failures = comparisons.filter((item) => !item.identical);
const report = {
	schemaVersion: 1,
	donor: "integrator-p/atlas-realty-starter",
	donorSha,
	cssFiles: cssPaths,
	comparisonCount: comparisons.length,
	result: failures.length === 0 ? "PASS" : "FAIL",
	comparisons,
};
await writeFile(
	path.join(root, "docs/research/atlas-css-parity.json"),
	`${JSON.stringify(report, null, 2)}\n`,
);
if (failures.length > 0) {
	throw new Error(`Atlas CSS parity failed for ${failures.length} comparisons`);
}
console.log(
	`Atlas CSS parity PASS: ${comparisons.length}/${comparisons.length} pixel-identical comparisons.`,
);
