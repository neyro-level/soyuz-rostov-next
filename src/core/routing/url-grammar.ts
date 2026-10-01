import {
	catalogSurfaceSlugs,
	type CatalogSurfaceSlug,
} from "../profile/index.ts";

export const propertySurfaceSlugs = [
	"kvartiry",
	"doma",
	"uchastki",
	"kommercheskaya-nedvizhimost",
	"komnaty",
	"garazhi",
] as const satisfies readonly CatalogSurfaceSlug[];

export const platformReservedRoots = [
	"_next",
	"admin",
	"api",
	"journal",
	"legal",
	"media",
	"poisk",
	"robots.txt",
	"sotrudniki",
	"komplex",
	"sitemap.xml",
	"sitemap",
	"search",
] as const;

export function isPlatformReservedRoot(value: string): boolean {
	return (
		(platformReservedRoots as readonly string[]).includes(value) ||
		value.startsWith("sitemap")
	);
}

export type PropertySurfaceSlug = (typeof propertySurfaceSlugs)[number];
export type DevelopmentKind = "residential_complex" | "cottage_village";

export type PageKey =
	| { kind: "home" }
	| { kind: "geoHub"; geo: string }
	| { kind: "categoryRoot"; category: CatalogSurfaceSlug }
	| { kind: "categoryGeo"; geo: string; category: CatalogSurfaceSlug }
	| {
			kind: "categoryGeoDistrict";
			geo: string;
			category: CatalogSurfaceSlug;
			district: string;
	  }
	| {
			kind: "categoryGeoFacet";
			geo: string;
			category: CatalogSurfaceSlug;
			facet: string;
	  }
	| { kind: "geoDevelopers"; geo: string }
	| {
			kind: "property";
			category: PropertySurfaceSlug;
			semantic: string;
			publicUrlId: number;
	  }
	| { kind: "development"; developmentKind: DevelopmentKind; slug: string }
	| { kind: "developerRoot" }
	| { kind: "developer"; slug: string }
	| { kind: "static"; path: `/${string}/` };

export type UrlGrammarInput = {
	geoSlugs: readonly string[];
	staticPaths: readonly string[];
	moduleRootSlugs?: readonly string[];
	districtSlugsByGeoCategory?: Readonly<
		Record<string, Partial<Record<CatalogSurfaceSlug, readonly string[]>>>
	>;
	facetSlugsByGeoCategory?: Readonly<
		Record<string, Partial<Record<CatalogSurfaceSlug, readonly string[]>>>
	>;
};

const transliteration: Readonly<Record<string, string>> = {
	а: "a",
	б: "b",
	в: "v",
	г: "g",
	д: "d",
	е: "e",
	ё: "e",
	ж: "zh",
	з: "z",
	и: "i",
	й: "y",
	к: "k",
	л: "l",
	м: "m",
	н: "n",
	о: "o",
	п: "p",
	р: "r",
	с: "s",
	т: "t",
	у: "u",
	ф: "f",
	х: "kh",
	ц: "ts",
	ч: "ch",
	ш: "sh",
	щ: "shch",
	ъ: "",
	ы: "y",
	ь: "",
	э: "e",
	ю: "yu",
	я: "ya",
};

const canonicalSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const catalogSurfaceSet = new Set<string>(catalogSurfaceSlugs);
const propertySurfaceSet = new Set<string>(propertySurfaceSlugs);

export function transliterateToSlug(value: string): string {
	return [...value.trim().toLowerCase()]
		.map((character) => transliteration[character] ?? character)
		.join("")
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.replace(/-{2,}/g, "-");
}

function assertCanonicalSlug(value: string, label: string): string {
	if (!canonicalSlugPattern.test(value)) {
		throw new Error(
			`${label} must be a canonical lowercase ASCII slug: ${value}`,
		);
	}
	return value;
}

function canonicalStaticPath(value: string): `/${string}/` {
	if (!value.startsWith("/") || value.includes("?") || value.includes("#")) {
		throw new Error(`Static path must be an absolute pathname: ${value}`);
	}
	const segments = value.split("/").filter(Boolean);
	if (segments.length === 0 || segments.length > 3) {
		throw new Error(`Static path must contain one to three segments: ${value}`);
	}
	for (const segment of segments)
		assertCanonicalSlug(segment, "Static segment");
	return `/${segments.join("/")}/`;
}

function normalizedRequestSegments(path: string): string[] | null {
	const pathname = path.split(/[?#]/, 1)[0] ?? "";
	if (!pathname.startsWith("/") || pathname.includes("//")) return null;
	const rawSegments = pathname.split("/").filter(Boolean);
	if (rawSegments.length > 3) return null;
	try {
		const segments = rawSegments.map((segment) =>
			decodeURIComponent(segment).toLowerCase(),
		);
		return segments.every((segment) => canonicalSlugPattern.test(segment))
			? segments
			: null;
	} catch {
		return null;
	}
}

function assertUnique(values: readonly string[], label: string): void {
	if (new Set(values).size !== values.length) {
		throw new Error(`${label} contains a duplicate slug.`);
	}
}

export function createUrlGrammar(input: UrlGrammarInput) {
	const geoSlugs = [...input.geoSlugs];
	const staticPaths = input.staticPaths.map(canonicalStaticPath);
	assertUnique(geoSlugs, "geoSlugs");
	assertUnique(staticPaths, "staticPaths");

	const reservedRoots = new Set<string>([
		...platformReservedRoots,
		...catalogSurfaceSlugs,
		"zastroyshchiki",
		...staticPaths.map((path) => path.split("/").filter(Boolean)[0]),
		...(input.moduleRootSlugs ?? []),
	]);
	for (const geo of geoSlugs) {
		assertCanonicalSlug(geo, "Geo");
		if (reservedRoots.has(geo) || isPlatformReservedRoot(geo)) {
			throw new Error(`Geo slug collides with a reserved root: ${geo}`);
		}
	}

	const geoSet = new Set(geoSlugs);
	const districtSets = new Map<string, Set<string>>();
	for (const [geo, byCategory] of Object.entries(
		input.districtSlugsByGeoCategory ?? {},
	)) {
		if (!geoSet.has(geo))
			throw new Error(`District matrix uses unknown geo: ${geo}`);
		for (const [category, slugs] of Object.entries(byCategory)) {
			if (!catalogSurfaceSet.has(category)) {
				throw new Error(`District matrix uses unknown category: ${category}`);
			}
			const checked = (slugs ?? []).map((slug) =>
				assertCanonicalSlug(slug, "District"),
			);
			assertUnique(checked, `Districts for ${geo}/${category}`);
			const reserved = checked.find(
				(slug) => reservedRoots.has(slug) || isPlatformReservedRoot(slug),
			);
			if (reserved) {
				throw new Error(
					`District slug collides with a reserved subslug for ${geo}/${category}: ${reserved}`,
				);
			}
			districtSets.set(`${geo}/${category}`, new Set(checked));
		}
	}

	const facetSets = new Map<string, Set<string>>();
	for (const [geo, byCategory] of Object.entries(
		input.facetSlugsByGeoCategory ?? {},
	)) {
		if (!geoSet.has(geo))
			throw new Error(`Facet matrix uses unknown geo: ${geo}`);
		for (const [category, slugs] of Object.entries(byCategory)) {
			if (!catalogSurfaceSet.has(category)) {
				throw new Error(`Facet matrix uses unknown category: ${category}`);
			}
			const checked = (slugs ?? []).map((slug) =>
				assertCanonicalSlug(slug, "Facet"),
			);
			assertUnique(checked, `Facets for ${geo}/${category}`);
			const reserved = checked.find(
				(slug) => reservedRoots.has(slug) || isPlatformReservedRoot(slug),
			);
			if (reserved) {
				throw new Error(
					`Facet slug collides with a reserved subslug for ${geo}/${category}: ${reserved}`,
				);
			}
			const districtSet =
				districtSets.get(`${geo}/${category}`) ?? new Set<string>();
			const collision = checked.find((slug) => districtSet.has(slug));
			if (collision) {
				throw new Error(
					`District/facet collision for ${geo}/${category}: ${collision}`,
				);
			}
			facetSets.set(`${geo}/${category}`, new Set(checked));
		}
	}

	const staticSet = new Set(staticPaths);
	for (const path of staticPaths) {
		const segments = path.split("/").filter(Boolean);
		if (
			catalogSurfaceSet.has(segments[0]) ||
			geoSet.has(segments[0]) ||
			segments[0] === "zastroyshchiki" ||
			isPlatformReservedRoot(segments[0])
		) {
			throw new Error(`Static path collides with canonical grammar: ${path}`);
		}
	}

	function assertConfiguredGeo(value: string): string {
		const geo = assertCanonicalSlug(value.toLowerCase(), "Geo");
		if (!geoSet.has(geo)) throw new Error(`Unknown configured geo: ${geo}`);
		return geo;
	}

	function assertDistrict(
		geo: string,
		category: CatalogSurfaceSlug,
		value: string,
	): string {
		const district = assertCanonicalSlug(value.toLowerCase(), "District");
		if (!districtSets.get(`${geo}/${category}`)?.has(district)) {
			throw new Error(`Unknown district for ${geo}/${category}: ${district}`);
		}
		return district;
	}

	function assertFacet(
		geo: string,
		category: CatalogSurfaceSlug,
		value: string,
	): string {
		const facet = assertCanonicalSlug(value.toLowerCase(), "Facet");
		if (!facetSets.get(`${geo}/${category}`)?.has(facet)) {
			throw new Error(`Unknown facet for ${geo}/${category}: ${facet}`);
		}
		return facet;
	}

	function assertEntitySlug(slug: string, label: string): string {
		assertCanonicalSlug(slug, label);
		if (reservedRoots.has(slug) || isPlatformReservedRoot(slug)) {
			throw new Error(`${label} collides with a reserved root: ${slug}`);
		}
		return slug;
	}

	function isAllowedEntitySlug(slug: string): boolean {
		return (
			canonicalSlugPattern.test(slug) &&
			!reservedRoots.has(slug) &&
			!isPlatformReservedRoot(slug)
		);
	}

	function buildUrl(key: PageKey): string {
		switch (key.kind) {
			case "home":
				return "/";
			case "geoHub":
				return `/${assertConfiguredGeo(key.geo)}/`;
			case "categoryRoot":
				return `/${key.category}/`;
			case "categoryGeo":
				return `/${assertConfiguredGeo(key.geo)}/${key.category}/`;
			case "categoryGeoDistrict": {
				const geo = assertConfiguredGeo(key.geo);
				return `/${geo}/${key.category}/${assertDistrict(geo, key.category, key.district)}/`;
			}
			case "categoryGeoFacet": {
				const geo = assertConfiguredGeo(key.geo);
				return `/${geo}/${key.category}/${assertFacet(geo, key.category, key.facet)}/`;
			}
			case "geoDevelopers":
				return `/${assertConfiguredGeo(key.geo)}/zastroyshchiki/`;
			case "property": {
				if (!Number.isSafeInteger(key.publicUrlId) || key.publicUrlId <= 0) {
					throw new Error(
						"Property publicUrlId must be a positive safe integer.",
					);
				}
				return `/${key.category}/${assertEntitySlug(key.semantic.toLowerCase(), "Property semantic")}-${key.publicUrlId}/`;
			}
			case "development": {
				const prefix =
					key.developmentKind === "residential_complex" ? "zhk-" : "kp-";
				const category =
					key.developmentKind === "residential_complex"
						? "novostroyki"
						: "kottedzhnye-poselki";
				const slug = assertEntitySlug(key.slug.toLowerCase(), "Development");
				if (slug.startsWith("zhk-") || slug.startsWith("kp-")) {
					throw new Error("Development slug must not repeat an entity prefix.");
				}
				return `/${category}/${prefix}${slug}/`;
			}
			case "developerRoot":
				return "/zastroyshchiki/";
			case "developer":
				return `/zastroyshchiki/${assertEntitySlug(key.slug.toLowerCase(), "Developer")}/`;
			case "static": {
				const path = canonicalStaticPath(key.path);
				if (!staticSet.has(path))
					throw new Error(`Unknown static path: ${path}`);
				return path;
			}
		}
	}

	function parseUrl(path: string): PageKey | null {
		const segments = normalizedRequestSegments(path);
		if (!segments) return null;
		if (segments.length === 0) return { kind: "home" };
		const normalizedPath = `/${segments.join("/")}/`;
		if (staticSet.has(normalizedPath as `/${string}/`)) {
			return { kind: "static", path: normalizedPath as `/${string}/` };
		}

		const [first, second, third] = segments;
		if (segments.length === 1) {
			if (first === "zastroyshchiki") return { kind: "developerRoot" };
			if (catalogSurfaceSet.has(first)) {
				return { kind: "categoryRoot", category: first as CatalogSurfaceSlug };
			}
			if (geoSet.has(first)) return { kind: "geoHub", geo: first };
			return null;
		}

		if (segments.length === 2) {
			if (first === "zastroyshchiki" && second) {
				return isAllowedEntitySlug(second)
					? { kind: "developer", slug: second }
					: null;
			}
			if (geoSet.has(first)) {
				if (second === "zastroyshchiki") {
					return { kind: "geoDevelopers", geo: first };
				}
				if (catalogSurfaceSet.has(second)) {
					return {
						kind: "categoryGeo",
						geo: first,
						category: second as CatalogSurfaceSlug,
					};
				}
				return null;
			}
			if (first === "novostroyki" && second?.startsWith("zhk-")) {
				const slug = second.slice(4);
				return isAllowedEntitySlug(slug) &&
					!slug.startsWith("zhk-") &&
					!slug.startsWith("kp-")
					? {
							kind: "development",
							developmentKind: "residential_complex",
							slug,
						}
					: null;
			}
			if (first === "kottedzhnye-poselki" && second?.startsWith("kp-")) {
				const slug = second.slice(3);
				return isAllowedEntitySlug(slug) &&
					!slug.startsWith("zhk-") &&
					!slug.startsWith("kp-")
					? { kind: "development", developmentKind: "cottage_village", slug }
					: null;
			}
			if (propertySurfaceSet.has(first) && second) {
				const match = second.match(/^(.+)-([1-9][0-9]*)$/);
				if (!match || !isAllowedEntitySlug(match[1])) return null;
				const publicUrlId = Number(match[2]);
				if (!Number.isSafeInteger(publicUrlId)) return null;
				return {
					kind: "property",
					category: first as PropertySurfaceSlug,
					semantic: match[1],
					publicUrlId,
				};
			}
			return null;
		}

		if (
			segments.length === 3 &&
			geoSet.has(first) &&
			catalogSurfaceSet.has(second) &&
			third
		) {
			if (districtSets.get(`${first}/${second}`)?.has(third)) {
				return {
					kind: "categoryGeoDistrict",
					geo: first,
					category: second as CatalogSurfaceSlug,
					district: third,
				};
			}
			if (facetSets.get(`${first}/${second}`)?.has(third)) {
				return {
					kind: "categoryGeoFacet",
					geo: first,
					category: second as CatalogSurfaceSlug,
					facet: third,
				};
			}
		}
		return null;
	}

	return {
		buildUrl,
		parseUrl,
		reservedRoots: Object.freeze([...reservedRoots].sort()),
	};
}

export type UrlGrammar = ReturnType<typeof createUrlGrammar>;
