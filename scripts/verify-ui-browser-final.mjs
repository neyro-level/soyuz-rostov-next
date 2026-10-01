import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";

const pnpmEntrypoint = process.env.npm_execpath;
assert.ok(
	pnpmEntrypoint,
	"ui browser final proof must be launched through pnpm",
);

const port = 3812 + (process.pid % 300);
const baseUrl = `http://127.0.0.1:${port}`;
const environment = {
	...process.env,
	DATABASE_URI: "",
	DATABASE_URI_TEST: "",
	STARTER_VISUAL_BASE_URL: baseUrl,
	STARTER_VISUAL_CHECK_LINKS: "false",
};
const server = spawn(
	process.execPath,
	[pnpmEntrypoint, "dev", "--hostname", "127.0.0.1", "--port", String(port)],
	{ cwd: process.cwd(), env: environment, stdio: ["ignore", "pipe", "pipe"] },
);
let serverOutput = "";
server.stdout.on("data", (chunk) => {
	serverOutput += chunk;
});
server.stderr.on("data", (chunk) => {
	serverOutput += chunk;
});

const delay = (milliseconds) =>
	new Promise((resolve) => setTimeout(resolve, milliseconds));
try {
	let ready = false;
	for (let attempt = 0; attempt < 120; attempt += 1) {
		try {
			const response = await fetch(baseUrl);
			if (response.ok) {
				ready = true;
				break;
			}
		} catch {}
		await delay(500);
	}
	assert.ok(
		ready,
		`Next browser-proof runtime did not start.\n${serverOutput.slice(-4000)}`,
	);
	execFileSync(process.execPath, ["scripts/verify-ui-browser.mjs"], {
		cwd: process.cwd(),
		env: environment,
		stdio: "inherit",
		maxBuffer: 64 * 1024 * 1024,
	});
} finally {
	if (process.platform === "win32") {
		try {
			execFileSync("taskkill.exe", ["/PID", String(server.pid), "/T", "/F"], {
				stdio: "ignore",
			});
		} catch {}
	} else {
		server.kill("SIGTERM");
	}
}
