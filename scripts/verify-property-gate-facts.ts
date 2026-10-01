import assert from "node:assert/strict";
import { parseAllowedImageHosts } from "../src/core/ingest/image-hosts.ts";
import { evaluateContentGate } from "../src/core/seo/content-gate.ts";
import { siteProfileFixtures } from "../src/fixture/site-profile.ts";
import { countPropertyGatePhotos } from "../src/project/routing/property-gate-facts.ts";

const allowedHosts = parseAllowedImageHosts("images.example.test");
const allowedExternal = [1, 2, 3].map((id) => ({
	kind: "external" as const,
	url: `https://images.example.test/property-${id}.jpg`,
}));

assert.equal(countPropertyGatePhotos(allowedExternal, allowedHosts), 3);
assert.equal(
	countPropertyGatePhotos(allowedExternal.slice(0, 2), allowedHosts),
	2,
);
assert.equal(
	countPropertyGatePhotos(
		[
			...allowedExternal,
			{ kind: "external", url: "https://disallowed.example/property.jpg" },
			{ kind: "external", url: "not-a-url" },
			{ kind: "external", url: "javascript:alert(1)" },
		],
		allowedHosts,
	),
	3,
);
assert.equal(
	countPropertyGatePhotos(
		[
			{ kind: "managed", media: { url: "/media/property.jpg" } },
			{ kind: "managed", media: 42 },
			{ kind: "managed", media: { url: "" } },
		],
		allowedHosts,
	),
	1,
);

function gateFor(images: Parameters<typeof countPropertyGatePhotos>[0]) {
	return evaluateContentGate(siteProfileFixtures.multiGeo, {
		kind: "secondary",
		url: "/kvartiry/test-p100001/",
		canonical: "/kvartiry/test-p100001/",
		profileStatus: "ACTIVE",
		priceMinor: 7_000_000_00,
		area: 54,
		category: "apartment",
		rooms: 2,
		district: null,
		rawDistrictRef: "Северный",
		ownedPhotoCount: countPropertyGatePhotos(images, allowedHosts),
		description: "Проверенное описание объекта.",
	});
}

assert.equal(gateFor(allowedExternal).indexing, "index");
assert.equal(gateFor(allowedExternal.slice(0, 2)).indexing, "noindex");

console.log(
	"verify-property-gate-facts: managed and allowlisted external images passed",
);
