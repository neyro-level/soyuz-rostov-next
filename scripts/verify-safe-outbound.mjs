import assert from "node:assert/strict";
import { safeOutboundFetch } from "../src/core/security/safe-outbound-client.ts";

const publicHost = "feeds.example.test";
const publicUrl = `https://${publicHost}/feed.xml`;
const allowedHosts = [publicHost, "127.0.0.1", "localhost", "0.0.0.0", "10.0.0.1"];

function jsonResponse(status, body, headers = {}) {
	return new Response(body, { status, headers });
}

async function rejects(fn, needle) {
	await assert.rejects(fn, (error) => String(error.message).includes(needle));
}

await rejects(
	() =>
		safeOutboundFetch("https://localhost/secret", {
			allowedHosts: ["localhost"],
			resolveAddresses: async () => [{ address: "127.0.0.1", family: 4 }],
		}),
	"private or link-local",
);

await rejects(
	() =>
		safeOutboundFetch("https://127.0.0.1/secret", {
			allowedHosts: ["127.0.0.1"],
		}),
	"private or link-local",
);

await rejects(
	() =>
		safeOutboundFetch("https://0.0.0.0/secret", {
			allowedHosts: ["0.0.0.0"],
		}),
	"private or link-local",
);

await rejects(
	() =>
		safeOutboundFetch("https://10.0.0.1/secret", {
			allowedHosts: ["10.0.0.1"],
		}),
	"private or link-local",
);

await rejects(
	() =>
		safeOutboundFetch("https://169.254.1.1/secret", {
			allowedHosts: ["169.254.1.1"],
		}),
	"private or link-local",
);

await rejects(
	() =>
		safeOutboundFetch("https://[::1]/secret", {
			allowedHosts: ["[::1]", "::1"],
			resolveAddresses: async () => [{ address: "::1", family: 6 }],
		}),
	"private or link-local",
);

await rejects(
	() =>
		safeOutboundFetch("https://ula.example.test/secret", {
			allowedHosts: ["ula.example.test"],
			resolveAddresses: async () => [{ address: "fd12:3456::1", family: 6 }],
		}),
	"private or link-local",
);

await rejects(
	() =>
		safeOutboundFetch(publicUrl, {
			allowedHosts,
			resolveAddresses: async () => [{ address: "93.184.216.34", family: 4 }],
			fetchImpl: async () =>
				jsonResponse(302, null, { location: "https://127.0.0.1/private" }),
		}),
	"private or link-local",
);

await rejects(
	() =>
		safeOutboundFetch(publicUrl, {
			allowedHosts: [publicHost, "redirect.example.test"],
			resolveAddresses: async (host) =>
				host === publicHost
					? [{ address: "93.184.216.34", family: 4 }]
					: [{ address: "10.0.0.2", family: 4 }],
			fetchImpl: async () =>
				jsonResponse(302, null, {
					location: "https://redirect.example.test/private",
				}),
		}),
	"private or link-local",
);

await rejects(
	() =>
		safeOutboundFetch(`http://${publicHost}/feed.xml`, {
			allowedHosts,
			resolveAddresses: async () => [{ address: "93.184.216.34", family: 4 }],
		}),
	"protocol is not approved",
);

await rejects(
	() =>
		safeOutboundFetch("https://not-allowlisted.example.test/x", {
			allowedHosts,
		}),
	"not allowlisted",
);

await rejects(
	() =>
		safeOutboundFetch(publicUrl, {
			allowedHosts,
			maxBytes: 8,
			resolveAddresses: async () => [{ address: "93.184.216.34", family: 4 }],
			fetchImpl: async () => new Response("0123456789"),
		}),
	"max size",
);

await rejects(
	() =>
		safeOutboundFetch(publicUrl, {
			allowedHosts,
			timeoutMs: 20,
			resolveAddresses: async () => [{ address: "93.184.216.34", family: 4 }],
			fetchImpl: (_url, init) =>
				new Promise((_, reject) => {
					init.signal?.addEventListener("abort", () => {
						reject(new Error("The operation was aborted"));
					});
				}),
		}),
	"aborted",
);

const ok = await safeOutboundFetch(publicUrl, {
	allowedHosts,
	resolveAddresses: async () => [{ address: "93.184.216.34", family: 4 }],
	fetchImpl: async () => new Response("ok"),
});
assert.equal(ok.status, 200);
assert.equal(await ok.text(), "ok");

let resolutionCalls = 0;
let dispatcherClosed = false;
const pinnedDispatcher = {
	dispatch() {
		throw new Error("test dispatcher must be passed through, not invoked directly");
	},
	async close() {
		dispatcherClosed = true;
	},
};
const pinned = await safeOutboundFetch(publicUrl, {
	allowedHosts,
	resolveAddresses: async () => {
		resolutionCalls += 1;
		return resolutionCalls === 1
			? [{ address: "93.184.216.34", family: 4 }]
			: [{ address: "10.0.0.9", family: 4 }];
	},
	createDispatcher: (address) => {
		assert.deepEqual(address, { address: "93.184.216.34", family: 4 });
		return pinnedDispatcher;
	},
	fetchImpl: async (_url, init) => {
		assert.equal(init.dispatcher, pinnedDispatcher);
		return new Response("pinned");
	},
});
assert.equal(await pinned.text(), "pinned");
await new Promise((resolve) => setImmediate(resolve));
assert.equal(resolutionCalls, 1, "connection must reuse the validated resolution");
assert.equal(dispatcherClosed, true);

console.log("verify-safe-outbound: ok");
