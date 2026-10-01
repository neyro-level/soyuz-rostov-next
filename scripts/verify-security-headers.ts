import assert from "node:assert/strict";
import { buildSecurityHeaders } from "../src/core/security/headers.ts";
import { evaluateRuntimeEnv } from "../src/project/env.ts";

const imageCspSrc = "'self' data: blob:";
const off = buildSecurityHeaders({ imageCspSrc });
const provider = buildSecurityHeaders({
	imageCspSrc,
	analyticsProvider: "yandex-metrika",
});
const preload = buildSecurityHeaders({ imageCspSrc, hstsPreload: true });
const unknown = buildSecurityHeaders({
	imageCspSrc,
	analyticsProvider: "unknown-provider",
});

assert.equal(
	off.publicCsp,
	"default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; object-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'",
);
assert.equal(
	provider.publicCsp,
	"default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; object-src 'none'; script-src 'self' 'unsafe-inline' https://mc.yandex.ru https://yastatic.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://mc.yandex.ru https://yastatic.net; font-src 'self' data:; connect-src 'self' https://mc.yandex.ru https://yastatic.net; frame-src 'self' https://mc.yandex.ru https://yastatic.net",
);
assert.equal(unknown.publicCsp, off.publicCsp);
assert.equal(provider.adminCsp, off.adminCsp);
assert.equal(
	off.baseSecurityHeaders.find(
		(header) => header.key === "Strict-Transport-Security",
	)?.value,
	"max-age=63072000; includeSubDomains",
);
assert.equal(
	preload.baseSecurityHeaders.find(
		(header) => header.key === "Strict-Transport-Security",
	)?.value,
	"max-age=63072000; includeSubDomains; preload",
);
for (const directive of ["script-src", "connect-src", "img-src", "frame-src"]) {
	const value = provider.publicCsp
		.split("; ")
		.find((item) => item.startsWith(directive));
	assert.match(value ?? "", /https:\/\/mc\.yandex\.ru/);
	assert.match(value ?? "", /https:\/\/yastatic\.net/);
}
assert.doesNotMatch(provider.publicCsp, /\shttps:\s|\s\*\s/);
assert.equal(
	evaluateRuntimeEnv(
		{ NODE_ENV: "test", ANALYTICS_PROVIDER: "unknown-provider" },
		"test",
	).ok,
	false,
);
assert.equal(
	evaluateRuntimeEnv(
		{
			NODE_ENV: "test",
			ANALYTICS_PROVIDER: "yandex-metrika",
			HSTS_PRELOAD: "true",
		},
		"test",
	).ok,
	true,
);

console.log(
	"verify-security-headers: provider on/off and HSTS preload on/off snapshots passed",
);
