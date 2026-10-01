import { type NextRequest, NextResponse } from "next/server";
import { createEntityGoneResponse } from "./core/http/property-gone-response.ts";
import {
	overwriteLifecyclePreflightHeader,
	parseCurrentPropertyLifecyclePath,
} from "./core/http/property-lifecycle-preflight.ts";
import { anonymousRawRestEdgeDecision } from "./core/security/anonymous-raw-rest.ts";
import { projectCopy } from "./project/copy.ts";
import { lookupCanonicalEntityLifecyclePreflight } from "./project/data-access/public/entity-lifecycle-preflight.ts";
import {
	lookupCurrentPropertyLifecyclePreflight,
	lookupLegacyApartmentLifecyclePreflight,
} from "./project/data-access/public/property-lifecycle-preflight.ts";
import { matchLegacyRoute } from "./project/routing/legacy-route-manifest.ts";
import { siteProfile } from "./project/site-profile.ts";
import { createProjectUrlGrammar } from "./project/url-grammar.ts";

const urlGrammar = createProjectUrlGrammar(siteProfile);

export async function proxy(request: NextRequest) {
	const denial = anonymousRawRestEdgeDecision(
		request.nextUrl.pathname,
		request.cookies.get("payload-token")?.value,
	);
	if (denial) {
		return NextResponse.json({ error: "notFound" }, { status: denial.status });
	}

	let requestHeaders = overwriteLifecyclePreflightHeader(
		request.headers,
		"not-applicable",
	);
	const legacyRoute = matchLegacyRoute(request.nextUrl.pathname);
	if (legacyRoute.kind === "route") {
		return NextResponse.redirect(
			new URL(legacyRoute.destination, request.url),
			legacyRoute.statusCode,
		);
	}
	if (legacyRoute.kind === "legacyApartment") {
		const decision = await lookupLegacyApartmentLifecyclePreflight(
			legacyRoute.slug,
		);
		if (decision.kind === "notFound") {
			return new NextResponse(null, { status: decision.statusCode });
		}
		if (decision.kind === "gone") {
			return createEntityGoneResponse(legacyRoute.slug, projectCopy.entityGone);
		}
		if (decision.kind === "redirect") {
			return NextResponse.redirect(
				new URL(decision.destination, request.url),
				decision.statusCode,
			);
		}
	}
	const propertySlug =
		legacyRoute.kind === "property"
			? legacyRoute.slug
			: parseCurrentPropertyLifecyclePath(request.nextUrl.pathname);
	const canonicalPageKey = urlGrammar.parseUrl(request.nextUrl.pathname);
	const decision = propertySlug
		? await lookupCurrentPropertyLifecyclePreflight(propertySlug)
		: canonicalPageKey
			? await lookupCanonicalEntityLifecyclePreflight(canonicalPageKey)
			: { kind: "pass" as const };
	if (decision.kind === "gone") {
		return createEntityGoneResponse(
			"label" in decision ? String(decision.label) : (propertySlug ?? "entity"),
			projectCopy.entityGone,
		);
	}
	if (decision.kind === "redirect") {
		return NextResponse.redirect(
			new URL(decision.destination, request.url),
			decision.statusCode,
		);
	}
	if (canonicalPageKey) {
		const builtPath = urlGrammar.buildUrl(canonicalPageKey);
		const canonicalPath =
			builtPath === "/" ? builtPath : `${builtPath.replace(/\/+$/, "")}/`;
		if (canonicalPath !== request.nextUrl.pathname) {
			const destination = new URL(canonicalPath, request.url);
			destination.search = request.nextUrl.search;
			return NextResponse.redirect(destination, 308);
		}
	}

	requestHeaders = overwriteLifecyclePreflightHeader(requestHeaders, "pass");
	return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
	matcher: [
		"/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
	],
};
