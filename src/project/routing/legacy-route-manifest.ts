import { siteProfile } from "../site-profile.ts";

export const legacyRouteManifest = {
	routes: siteProfile.legacyRoutes,
	patterns: siteProfile.legacyPatterns,
} as const;

export const legacyRouteRoots = [
	...new Set(
		[
			...legacyRouteManifest.routes.map((route) => route.from),
			...legacyRouteManifest.patterns.map((pattern) => pattern.from),
		]
			.map((source) => source.split("/").filter(Boolean)[0])
			.filter((root): root is string => Boolean(root)),
	),
];

export type LegacyRouteMatch =
	| { kind: "route"; destination: string; statusCode: 301 }
	| { kind: "property"; slug: string; statusCode: 301 }
	| { kind: "legacyApartment"; slug: string; statusCode: 301 }
	| { kind: "none" };

function normalizedSource(pathname: string): string {
	return pathname === "/" ? pathname : pathname.replace(/\/$/, "");
}

function matchPropertyPattern(
	pattern: string,
	pathname: string,
): string | null {
	const [prefix, suffix] = pattern.split("{slug}");
	if (prefix === undefined || suffix === undefined) return null;
	const normalized = normalizedSource(pathname);
	if (!normalized.startsWith(prefix) || !normalized.endsWith(suffix))
		return null;
	const slug = normalized.slice(
		prefix.length,
		normalized.length - suffix.length,
	);
	return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : null;
}

const legacyApartmentPath =
	/^\/kvartiry-rostova\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/;

function matchLegacyApartmentPath(pathname: string): string | null {
	return pathname.match(legacyApartmentPath)?.[1] ?? null;
}

export function matchLegacyRoute(pathname: string): LegacyRouteMatch {
	const normalized = normalizedSource(pathname);
	const route = legacyRouteManifest.routes.find(
		(candidate) => candidate.from === normalized,
	);
	if (route) {
		return {
			kind: "route",
			destination: route.to,
			statusCode: route.statusCode,
		};
	}
	for (const pattern of legacyRouteManifest.patterns) {
		if (pattern.kind !== "property") continue;
		const slug = matchPropertyPattern(pattern.from, pathname);
		if (slug) return { kind: "property", slug, statusCode: pattern.statusCode };
	}
	const legacyApartmentSlug = matchLegacyApartmentPath(pathname);
	if (legacyApartmentSlug) {
		return { kind: "legacyApartment", slug: legacyApartmentSlug, statusCode: 301 };
	}
	return { kind: "none" };
}
