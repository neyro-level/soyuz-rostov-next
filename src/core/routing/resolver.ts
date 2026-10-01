import {
	type CatalogSurfaceSlug,
	catalogSurfaceMarketMatrix,
	isConfiguredRouteAvailable,
	type Market,
	type ProfileStatus,
	type SiteProfile,
} from "../profile/index.ts";
import type { PageKey, UrlGrammar } from "./url-grammar.ts";

export type ResolverPageRecord = {
	lifecycle: "active" | "archived" | "purged";
	canonicalPageKey?: PageKey;
	replacementPageKey?: PageKey;
	geo: string | null;
	market: Market | null;
	dataTier: "A" | "B" | "C" | null;
};

export type ResolverRedirectRecord = {
	destinationPath: string;
	statusCode: 301;
};

export interface ResolverDataPort {
	lookupPage(pageKey: PageKey): Promise<ResolverPageRecord | null>;
	findRedirect(path: string): Promise<ResolverRedirectRecord | null>;
	countInventory(pageKey: PageKey): Promise<number>;
}

export type ResolverPageResult = {
	kind: "page";
	pageKey: PageKey;
	canonicalPath: string;
	profileStatus: ProfileStatus;
	lifecycle: "active" | "archived";
	market: Market | null;
	dataTier: "A" | "B" | "C" | null;
	inventory: number;
};

export type ResolverResult =
	| ResolverPageResult
	| { kind: "redirect"; destinationPath: string; statusCode: 301 | 308 }
	| { kind: "notFound"; statusCode: 404 }
	| { kind: "gone"; statusCode: 410 };

export type RouteResolver = ReturnType<typeof createRouteResolver>;

export type RouteDecision = {
	available: boolean;
	profileStatus: ProfileStatus;
};

export function createRouteResolver(input: {
	profile: SiteProfile;
	grammar: UrlGrammar;
	port: ResolverDataPort;
}) {
	const { profile, grammar, port } = input;

	async function resolvePath(path: string): Promise<ResolverResult> {
		return resolve(path, true, new Set<string>());
	}

	async function resolve(
		path: string,
		allowStoredRedirect: boolean,
		visited: Set<string>,
	): Promise<ResolverResult> {
		const requestPath = normalizeRequestPath(path);
		if (!requestPath || visited.has(requestPath)) return notFound();
		visited.add(requestPath);

		if (allowStoredRedirect) {
			const stored = await port.findRedirect(requestPath);
			if (stored) {
				return resolveDirectRedirect(
					stored.destinationPath,
					stored.statusCode,
					visited,
				);
			}
		}

		const pageKey = grammar.parseUrl(requestPath);
		if (!pageKey) return notFound();
		const canonicalPath = grammar.buildUrl(pageKey);
		const page = await resolvePageKey(pageKey, canonicalPath, visited);
		if (page.kind !== "page") return page;
		if (requestPath !== canonicalPath) {
			return {
				kind: "redirect",
				destinationPath: canonicalPath,
				statusCode: 308,
			};
		}
		return page;
	}

	async function resolveDirectRedirect(
		destination: string,
		statusCode: 301,
		visited: Set<string>,
	): Promise<ResolverResult> {
		const destinationPath = normalizeRequestPath(destination);
		if (!destinationPath || visited.has(destinationPath)) return notFound();
		if (await port.findRedirect(destinationPath)) return notFound();
		const target = await resolve(destinationPath, false, visited);
		if (target.kind !== "page") return notFound();
		return {
			kind: "redirect",
			destinationPath: target.canonicalPath,
			statusCode,
		};
	}

	async function resolvePageKey(
		pageKey: PageKey,
		canonicalPath: string,
		visited: Set<string>,
	): Promise<ResolverResult> {
		const record = await port.lookupPage(pageKey);
		if (!record) return notFound();

		if (record.lifecycle === "purged") {
			if (!record.replacementPageKey) return { kind: "gone", statusCode: 410 };
			return resolveDirectRedirect(
				grammar.buildUrl(record.replacementPageKey),
				301,
				visited,
			);
		}

		if (record.canonicalPageKey) {
			const recordCanonicalPath = grammar.buildUrl(record.canonicalPageKey);
			if (recordCanonicalPath !== canonicalPath) {
				return resolveDirectRedirect(recordCanonicalPath, 301, visited);
			}
		}

		const inventory = await port.countInventory(pageKey);
		const route = resolveRouteDecision(profile, pageKey, record, inventory);
		if (!route.available) return notFound();
		return {
			kind: "page",
			pageKey,
			canonicalPath,
			profileStatus: route.profileStatus,
			lifecycle: record.lifecycle,
			market: record.market,
			dataTier: record.dataTier,
			inventory,
		};
	}

	return { resolvePath };
}

export function resolveRouteDecision(
	profile: SiteProfile,
	pageKey: PageKey,
	record: ResolverPageRecord,
	inventory: number,
): RouteDecision {
	const statuses: ProfileStatus[] = [];

	const addGeo = (geo: string): boolean => {
		if (profile.geoMode === "SINGLE_GEO" && geo !== profile.primaryGeo) {
			return false;
		}
		const definition = profile.geos[geo];
		if (!definition?.published) return false;
		statuses.push(definition.hubStatus);
		return true;
	};
	const addSurface = (surface: CatalogSurfaceSlug, geo?: string): boolean => {
		statuses.push(profile.categoryStatus[surface]);
		if (geo) {
			const status = profile.geoCategoryStatus[geo]?.[surface];
			if (!status) return false;
			statuses.push(status);
		}
		const marketCandidates = catalogSurfaceMarketMatrix[surface].map(
			(market) => {
				const candidate = [profile.marketCapability[market]];
				if (geo && profile.marketStatus[geo]) {
					candidate.push(profile.marketStatus[geo][market]);
				}
				return candidate;
			},
		);
		const availableMarkets = marketCandidates.filter((candidate) =>
			candidate.every((status) =>
				isConfiguredRouteAvailable({ status, inventory }),
			),
		);
		if (availableMarkets.length === 0) return false;
		if (
			availableMarkets.every((candidate) =>
				candidate.some((status) => status === "NOINDEX_AUTO"),
			)
		) {
			statuses.push("NOINDEX_AUTO");
		}
		return true;
	};
	const addMarket = (market: Market | null, geo: string | null): boolean => {
		if (!market) return true;
		statuses.push(profile.marketCapability[market]);
		if (geo && profile.marketStatus[geo])
			statuses.push(profile.marketStatus[geo][market]);
		return true;
	};

	switch (pageKey.kind) {
		case "home":
		case "static":
			return { available: true, profileStatus: "ACTIVE" };
		case "geoHub":
			if (!addGeo(pageKey.geo)) return unavailable();
			break;
		case "categoryRoot":
			if (!addSurface(pageKey.category)) return unavailable();
			break;
		case "categoryGeo":
		case "categoryGeoDistrict":
		case "categoryGeoFacet":
			if (!addGeo(pageKey.geo) || !addSurface(pageKey.category, pageKey.geo))
				return unavailable();
			break;
		case "geoDevelopers":
			if (!addGeo(pageKey.geo)) return unavailable();
			statuses.push(profile.developersSurface.root);
			statuses.push(profile.developersSurface.byGeo[pageKey.geo]);
			break;
		case "developerRoot":
		case "developer":
			statuses.push(profile.developersSurface.root);
			break;
		case "property":
			if (!addSurface(pageKey.category)) return unavailable();
			addMarket(record.market, record.geo);
			break;
		case "development": {
			const surface =
				pageKey.developmentKind === "residential_complex"
					? "novostroyki"
					: "kottedzhnye-poselki";
			if (!addSurface(surface)) return unavailable();
			addMarket("newbuild", record.geo);
			break;
		}
	}

	if (
		statuses.some(
			(status) => !isConfiguredRouteAvailable({ status, inventory }),
		)
	) {
		return unavailable();
	}
	const statusNoindex = statuses.some((status) => status === "NOINDEX_AUTO");
	const singleGeoRootNoindex =
		profile.geoMode === "SINGLE_GEO" &&
		(pageKey.kind === "categoryRoot" || pageKey.kind === "developerRoot");
	const newbuildLotNoindex =
		pageKey.kind === "property" && record.market === "newbuild";
	return {
		available: true,
		profileStatus:
			statusNoindex || singleGeoRootNoindex || newbuildLotNoindex
				? "NOINDEX_AUTO"
				: "ACTIVE",
	};
}

function unavailable(): RouteDecision {
	return { available: false, profileStatus: "OUT" };
}

function normalizeRequestPath(value: string): string | null {
	const pathname = value.split(/[?#]/, 1)[0];
	if (!pathname?.startsWith("/") || pathname.includes("//")) return null;
	return pathname === "/" ? "/" : `${pathname.replace(/\/+$/, "")}/`;
}

function notFound(): ResolverResult {
	return { kind: "notFound", statusCode: 404 };
}
