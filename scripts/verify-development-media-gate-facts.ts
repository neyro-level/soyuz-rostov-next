import assert from "node:assert/strict";
import { assertDevelopmentMediaItems } from "../src/core/developments/domain.ts";
import {
	parseAllowedImageHosts,
	validateHttpsExternalImageUrl,
} from "../src/core/ingest/image-hosts.ts";

const allowedHosts = parseAllowedImageHosts("images.example.test");
const item = {
	mediaType: "gallery" as const,
	rights: "publication-approved",
	source: "official-developer",
	checkedAt: "2026-09-28T12:00:00.000Z",
};

assert.equal(
	validateHttpsExternalImageUrl("https://images.example.test/a.jpg", allowedHosts)
		.ok,
	true,
);
for (const externalUrl of [
	"http://images.example.test/a.jpg",
	"https://other.example.test/a.jpg",
	"not-a-url",
]) {
	assert.equal(validateHttpsExternalImageUrl(externalUrl, allowedHosts).ok, false);
}
assert.doesNotThrow(() =>
	assertDevelopmentMediaItems([
		{ ...item, kind: "external", externalUrl: "https://images.example.test/a.jpg" },
	]),
);
assert.throws(
	() => assertDevelopmentMediaItems([{ ...item, kind: "external" }]),
	/externalUrl/,
);
assert.throws(
	() => assertDevelopmentMediaItems([{ ...item, kind: "managed" }]),
	/requires media/,
);
console.log("verify:development-media-gate-facts passed");
