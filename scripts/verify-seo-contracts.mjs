import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { composeFinalRobots } from "../src/core/seo/final-robots.ts";
import { toOpenGraphImage } from "../src/core/seo/page-metadata.ts";
import { serializeJsonLdSafely } from "../src/core/seo/json-ld.ts";
import {
	resolvePropertyPageLifecycle,
	sanitizeExplicitRedirectPath,
} from "../src/core/seo/property.ts";
import {
	buildRobots,
	getProjectIndexingPolicy,
	metadataRobotsForPolicy,
	resolveIndexingPolicy,
} from "../src/project/indexing-policy.ts";
import { staticPublicUrlEntries } from "../src/project/seo/site.ts";

const fixtureOrigin = "https://realty-client.example";
assert.equal(getProjectIndexingPolicy(), "noindex");
assert.equal(
	resolveIndexingPolicy({
		projectKind: "starter-demo",
		productionIndexing: "public",
	}),
	"noindex",
);
assert.deepEqual(metadataRobotsForPolicy("noindex"), {
	index: false,
	follow: false,
});
assert.deepEqual(
	toOpenGraphImage({
		kind: "managed",
		src: "/media/og.jpg",
		alt: "Managed OG",
	}),
	{ url: "/media/og.jpg", alt: "Managed OG", width: undefined, height: undefined },
);
assert.deepEqual(
	toOpenGraphImage({
		kind: "external",
		src: "https://images.example.test/og.jpg",
		alt: "External OG",
	}),
	{
		url: "https://images.example.test/og.jpg",
		alt: "External OG",
		width: undefined,
		height: undefined,
	},
);
assert.equal(
	toOpenGraphImage({
		kind: "external",
		src: "http://images.example.test/og.jpg",
		alt: "Rejected OG",
	}),
	undefined,
);
assert.deepEqual(
	composeFinalRobots("noindex", { indexing: "index", following: "follow" }),
	{ index: false, follow: false },
	"global noindex must never be raised by an indexable page",
);
assert.deepEqual(
	composeFinalRobots("public", { indexing: "index", following: "follow" }),
	{ index: true, follow: true },
);
assert.deepEqual(
	composeFinalRobots(
		resolveIndexingPolicy({
			projectKind: "client",
			productionIndexing: "noindex",
		}),
		{ indexing: "index", following: "follow" },
	),
	{ index: false, follow: false },
	"client noindex policy must never be raised by an indexable page",
);
assert.deepEqual(
	composeFinalRobots(
		resolveIndexingPolicy({
			projectKind: "client",
			productionIndexing: "public",
		}),
		{ indexing: "index", following: "follow" },
	),
	{ index: true, follow: true },
);
assert.deepEqual(
	composeFinalRobots("public", { indexing: "noindex", following: "follow" }),
	{ index: false, follow: true },
	"page-level Content Gate noindex must narrow a public client policy",
);
assert.deepEqual(
	composeFinalRobots("public", { indexing: "noindex", following: "follow" }),
	{ index: false, follow: true },
	"archived lifecycle noindex must stay noindex",
);
assert.deepEqual(buildRobots("noindex", fixtureOrigin), {
	rules: [{ userAgent: "*", disallow: "/" }],
});
assert.deepEqual(buildRobots("public", fixtureOrigin), {
	rules: [
		{
			userAgent: "*",
			allow: "/",
			disallow: ["/admin", "/api"],
		},
	],
	sitemap: `${fixtureOrigin}/sitemap.xml`,
	host: fixtureOrigin,
});
assert.deepEqual(
	buildRobots(
		resolveIndexingPolicy({
			projectKind: "client",
			productionIndexing: "noindex",
		}),
		fixtureOrigin,
	),
	{ rules: [{ userAgent: "*", disallow: "/" }] },
);
assert.ok(
	readFileSync("src/app/robots.txt/route.ts", "utf8").includes(
		"renderDiscoveryRobots({",
	),
);
assert.ok(
	readFileSync("src/app/layout.tsx", "utf8").includes(
		"toPublicSiteMetadata",
	),
);

const adversarialJsonLd = {
	name: '</script><script>alert("json-ld")</script>',
	description: '<&>\u2028\u2029quotes"backslash\\',
};
const serializedJsonLd = serializeJsonLdSafely(adversarialJsonLd);
assert.equal(serializedJsonLd.includes("</script"), false);
for (const escaped of ["\\u003c", "\\u003e", "\\u0026", "\\u2028", "\\u2029"]) {
	assert.ok(serializedJsonLd.includes(escaped));
}
assert.deepEqual(JSON.parse(serializedJsonLd), adversarialJsonLd);
const structuredDataSource = readFileSync(
	"src/project/seo/structured-data.tsx",
	"utf8",
);
assert.ok(structuredDataSource.includes("serializeJsonLdSafely(data)"));
assert.equal(structuredDataSource.includes("JSON.stringify(data)"), false);

const sitemapPaths = staticPublicUrlEntries
	.filter((entry) => entry.indexable)
	.map((entry) => entry.path);
assert.ok(sitemapPaths.includes("/"));
assert.equal(sitemapPaths.includes("/nedvizhimost"), false);
assert.equal(sitemapPaths.includes("/politika-konfidencialnosti"), false);
assert.equal(
	sitemapPaths.includes("/soglasie-na-obrabotku-personalnyh-dannyh"),
	false,
);

assert.deepEqual(resolvePropertyPageLifecycle({ found: false }), {
	kind: "missing",
	statusCode: 404,
});
assert.deepEqual(
	resolvePropertyPageLifecycle({
		found: true,
		status: "active",
		publishedAt: "2026-01-01T00:00:00.000Z",
		contentPurgedAt: null,
		explicitRedirectPath: null,
	}),
	{ kind: "active", statusCode: 200 },
);
assert.deepEqual(
	resolvePropertyPageLifecycle({
		found: true,
		status: "archived",
		publishedAt: "2026-01-01T00:00:00.000Z",
		contentPurgedAt: null,
		explicitRedirectPath: null,
	}),
	{ kind: "archived", statusCode: 200, robots: "noindex" },
);
assert.deepEqual(
	resolvePropertyPageLifecycle({
		found: true,
		status: "archived",
		publishedAt: "2026-01-01T00:00:00.000Z",
		contentPurgedAt: "2026-02-01T00:00:00.000Z",
		explicitRedirectPath: null,
	}),
	{ kind: "gone", statusCode: 410, robots: "noindex" },
);
assert.deepEqual(
	resolvePropertyPageLifecycle({
		found: true,
		status: "archived",
		publishedAt: "2026-01-01T00:00:00.000Z",
		contentPurgedAt: "2026-02-01T00:00:00.000Z",
		explicitRedirectPath: "/obekty/explicit-target",
	}),
	{
		kind: "redirect",
		statusCode: 301,
		destination: "/obekty/explicit-target",
	},
);
assert.deepEqual(
	resolvePropertyPageLifecycle({
		found: true,
		status: "archived",
		publishedAt: "2026-01-01T00:00:00.000Z",
		contentPurgedAt: "2026-02-01T00:00:00.000Z",
		explicitRedirectPath: "/",
	}),
	{ kind: "gone", statusCode: 410, robots: "noindex" },
);
assert.equal(sanitizeExplicitRedirectPath("/"), null);
assert.equal(sanitizeExplicitRedirectPath("/obekty/next"), "/obekty/next");

const sitemapSource = readFileSync("src/app/sitemap.ts", "utf8");
assert.ok(sitemapSource.includes("generateSitemaps"));
assert.match(sitemapSource, /export const revalidate = 3600;/);
assert.equal(sitemapSource.includes("limit: 1000"), false);
const catalogSource = readFileSync(
	"src/project/data-access/public/catalog.ts",
	"utf8",
);
assert.equal(catalogSource.includes("limit: 1000"), false);
assert.ok(catalogSource.includes("aggregatePublicCatalogFacets"));
assert.ok(catalogSource.includes("payload-aggregate"));
assert.equal(catalogSource.includes("sql-aggregate"), false);
assert.ok(
	readFileSync("src/core/http/property-gone-response.ts", "utf8").includes(
		"status: 410",
	),
);
assert.ok(
	readFileSync("src/project/collections/Pages.ts", "utf8").includes(
		"reservedGeoRootSlugs",
	),
);

const marketingPages = [
	"src/app/(site)/uslugi/page.tsx",
	"src/app/(site)/o-kompanii/page.tsx",
	"src/app/(site)/ipoteka/page.tsx",
	"src/app/(site)/kontakty/page.tsx",
	"src/app/(site)/politika-konfidencialnosti/page.tsx",
	"src/app/(site)/soglasie-na-obrabotku-personalnyh-dannyh/page.tsx",
	"src/app/(site)/sdat/page.tsx",
	"src/app/(site)/prodat/page.tsx",
];
for (const file of marketingPages) {
	const source = readFileSync(file, "utf8");
	assert.equal(
		source.includes("force-dynamic"),
		false,
		`${file} must not be force-dynamic`,
	);
	assert.ok(
		source.includes("export const revalidate = 3600;"),
		`${file} must export literal ISR revalidate`,
	);
}
assert.match(
	readFileSync("src/core/lib/page-cache.ts", "utf8"),
	/export const marketingRevalidateSeconds = 3600;/,
);
assert.ok(
	readFileSync("src/app/(site)/page.tsx", "utf8").includes(
		"export const revalidate = 3600;",
	),
	"home must export literal ISR revalidate",
);
assert.equal(
	readFileSync("src/app/(site)/page.tsx", "utf8").includes("force-dynamic"),
	false,
	"home must not be force-dynamic",
);
assert.ok(
	readFileSync("src/project/routing/legacy-route-manifest.ts", "utf8").includes(
		"routes: siteProfile.legacyRoutes",
	) &&
		readFileSync("src/project/site-profile.config.ts", "utf8").includes(
			'"to": "/kvartiry/"',
		),
	"legacy catalog must remain in the direct redirect manifest",
);
assert.ok(
	readFileSync("src/app/(site)/nedvizhimost/page.tsx", "utf8").includes(
		"notFound()",
	),
	"legacy catalog fallback page must fail closed",
);

console.log("verify-seo-contracts: ok");
