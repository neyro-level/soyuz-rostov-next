import type { ContentGateDecision } from "./content-gate.ts";

export const discoveryGroups = [
	"static",
	"geo",
	"catalog",
	"districts",
	"facets",
	"developments",
	"developers",
	"properties",
] as const;

export type DiscoveryGroup = (typeof discoveryGroups)[number];

export type DiscoveryCandidate = {
	group: DiscoveryGroup;
	path: string;
	canonicalPath: string;
	lastModified: string | Date;
	published: boolean;
	gate: Pick<
		ContentGateDecision,
		"statusCode" | "indexing" | "following" | "canonical" | "includeInSitemap"
	>;
};

export type DiscoveryUrl = {
	url: string;
	lastModified: string;
};

export type DiscoveryShard = {
	id: string;
	group: DiscoveryGroup;
	entries: DiscoveryUrl[];
};

export const sitemapUrlLimit = 50_000;

function normalizedOrigin(value: string): URL {
	const origin = new URL(value);
	if (
		!(["http:", "https:"] as const).includes(
			origin.protocol as "http:" | "https:",
		)
	) {
		throw new Error("Discovery public origin must use HTTP or HTTPS.");
	}
	if (
		origin.username ||
		origin.password ||
		origin.pathname !== "/" ||
		origin.search ||
		origin.hash
	) {
		throw new Error(
			"Discovery public origin must be an origin without credentials or path.",
		);
	}
	return origin;
}

function normalizedPath(value: string): string {
	if (!value.startsWith("/") || value.startsWith("//")) {
		throw new Error(`Discovery URL must be a root-relative path: ${value}`);
	}
	const parsed = new URL(value, "https://discovery.invalid");
	if (parsed.origin !== "https://discovery.invalid" || parsed.hash) {
		throw new Error(`Discovery URL is invalid: ${value}`);
	}
	return `${parsed.pathname}${parsed.search}`;
}

function normalizedLastModified(value: string | Date): string {
	const parsed = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		throw new Error(`Discovery lastModified is invalid: ${String(value)}`);
	}
	return parsed.toISOString();
}

function escapeXml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&apos;");
}

export function latestLastModified(values: readonly (string | Date)[]): string {
	if (values.length === 0) {
		throw new Error(
			"Discovery listing lastModified needs at least one source timestamp.",
		);
	}
	return values
		.map(normalizedLastModified)
		.sort((left, right) => right.localeCompare(left))[0];
}

export function buildDiscoveryShards(input: {
	publicOrigin: string;
	candidates: readonly DiscoveryCandidate[];
	shardSize?: number;
}): DiscoveryShard[] {
	const origin = normalizedOrigin(input.publicOrigin);
	const shardSize = input.shardSize ?? sitemapUrlLimit;
	if (
		!Number.isSafeInteger(shardSize) ||
		shardSize < 1 ||
		shardSize > sitemapUrlLimit
	) {
		throw new Error(
			`Discovery shardSize must be between 1 and ${sitemapUrlLimit}.`,
		);
	}

	const byGroup = new Map<DiscoveryGroup, DiscoveryUrl[]>();
	for (const group of discoveryGroups) byGroup.set(group, []);
	const seen = new Map<string, DiscoveryGroup>();

	for (const candidate of input.candidates) {
		const path = normalizedPath(candidate.path);
		const canonicalPath = normalizedPath(candidate.canonicalPath);
		const gateCanonical = normalizedPath(candidate.gate.canonical);
		if (
			!candidate.published ||
			candidate.gate.statusCode !== 200 ||
			candidate.gate.indexing !== "index" ||
			candidate.gate.following !== "follow" ||
			!candidate.gate.includeInSitemap ||
			path !== canonicalPath ||
			path !== gateCanonical
		) {
			continue;
		}
		const url = new URL(path, origin).href;
		const duplicateGroup = seen.get(url);
		if (duplicateGroup) {
			throw new Error(
				`Discovery canonical URL is assigned more than once (${duplicateGroup}, ${candidate.group}): ${url}`,
			);
		}
		seen.set(url, candidate.group);
		byGroup.get(candidate.group)?.push({
			url,
			lastModified: normalizedLastModified(candidate.lastModified),
		});
	}

	const shards: DiscoveryShard[] = [];
	for (const group of discoveryGroups) {
		const entries = (byGroup.get(group) ?? []).sort((left, right) =>
			left.url.localeCompare(right.url),
		);
		for (let offset = 0; offset < entries.length; offset += shardSize) {
			const index = Math.floor(offset / shardSize) + 1;
			shards.push({
				id: `${group}-${index}`,
				group,
				entries: entries.slice(offset, offset + shardSize),
			});
		}
	}
	return shards;
}

export function renderSitemapXml(entries: readonly DiscoveryUrl[]): string {
	if (entries.length > sitemapUrlLimit) {
		throw new Error(
			`A sitemap cannot contain more than ${sitemapUrlLimit} URLs.`,
		);
	}
	const rows = entries.map(
		(entry) =>
			`  <url><loc>${escapeXml(entry.url)}</loc><lastmod>${escapeXml(entry.lastModified)}</lastmod></url>`,
	);
	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		...rows,
		"</urlset>",
	].join("\n");
}

export function renderSitemapIndexXml(input: {
	publicOrigin: string;
	shards: readonly DiscoveryShard[];
	basePath?: string;
}): string {
	const origin = normalizedOrigin(input.publicOrigin);
	const basePath = normalizedPath(input.basePath ?? "/sitemaps").replace(
		/\/$/,
		"",
	);
	const rows = input.shards.map((shard) => {
		const lastModified = latestLastModified(
			shard.entries.map((entry) => entry.lastModified),
		);
		const location = new URL(`${basePath}/${shard.id}.xml`, origin).href;
		return `  <sitemap><loc>${escapeXml(location)}</loc><lastmod>${escapeXml(lastModified)}</lastmod></sitemap>`;
	});
	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		...rows,
		"</sitemapindex>",
	].join("\n");
}

export function renderDiscoveryRobots(input: {
	publicOrigin: string;
	indexingEnabled: boolean;
	sitemapIndexPath?: string;
	cleanParam?: string;
}): string {
	const origin = normalizedOrigin(input.publicOrigin);
	if (!input.indexingEnabled) {
		return "User-agent: *\nDisallow: /\n";
	}
	const sitemap = new URL(input.sitemapIndexPath ?? "/sitemap.xml", origin)
		.href;
	return [
		"User-agent: *",
		"Allow: /",
		"Disallow: /admin/",
		"Disallow: /api/",
		`Sitemap: ${sitemap}`,
		`Host: ${origin.host}`,
		...(input.cleanParam ? [`Clean-param: ${input.cleanParam}`] : []),
		"",
	].join("\n");
}
