import "server-only";

import {
	type PropertyLifecyclePreflightDecision,
	resolvePropertyLifecyclePreflight,
} from "../../../core/http/property-lifecycle-preflight.ts";
import { propertyCategorySurface } from "../../../core/property/taxonomy.ts";
import { fixtureProperties } from "../../../fixture/provider.ts";
import { siteConfig } from "../../site.config.ts";
import { siteProfile } from "../../site-profile.ts";
import { createProjectUrlGrammar } from "../../url-grammar.ts";
import { findPublicPropertyLifecycleBySlug } from "./catalog.ts";
import { getOptionalPublicGatewayPayload } from "./payload.ts";

const grammar = createProjectUrlGrammar(siteProfile);

export async function lookupCurrentPropertyLifecyclePreflight(
	slug: string,
): Promise<PropertyLifecyclePreflightDecision> {
	const payload = await getOptionalPublicGatewayPayload();
	if (!payload) {
		if ((siteConfig.projectKind as "starter-demo" | "client") === "client") {
			return { kind: "pass" };
		}
		const property = fixtureProperties.find(
			(candidate) => candidate.slug === slug,
		);
		return property
			? { kind: "redirect", statusCode: 301, destination: property.href }
			: { kind: "pass" };
	}
	const lookup = await findPublicPropertyLifecycleBySlug(payload, slug);
	return resolvePropertyLifecyclePreflight(
		lookup.found
			? {
					...lookup,
					canonicalPath: grammar.buildUrl({
						kind: "property",
						category: propertyCategorySurface[lookup.category],
						semantic: lookup.slug,
						publicUrlId: lookup.publicUrlId,
					}),
				}
			: lookup,
	);
}

export type LegacyApartmentLifecyclePreflightDecision =
	| PropertyLifecyclePreflightDecision
	| { kind: "notFound"; statusCode: 404 };

/** Resolves the Souz legacy apartment route through an entity lookup, never a string rewrite. */
export async function lookupLegacyApartmentLifecyclePreflight(
	slug: string,
): Promise<LegacyApartmentLifecyclePreflightDecision> {
	const payload = await getOptionalPublicGatewayPayload();
	if (!payload) {
		if ((siteConfig.projectKind as "starter-demo" | "client") === "client") {
			return { kind: "notFound", statusCode: 404 };
		}
		const property = fixtureProperties.find(
			(candidate) => candidate.slug === slug && candidate.category === "apartment",
		);
		return property
			? { kind: "redirect", statusCode: 301, destination: property.href }
			: { kind: "notFound", statusCode: 404 };
	}
	const lookup = await findPublicPropertyLifecycleBySlug(payload, slug);
	if (!lookup.found || lookup.category !== "apartment") {
		return { kind: "notFound", statusCode: 404 };
	}
	return resolvePropertyLifecyclePreflight({
		...lookup,
		canonicalPath: grammar.buildUrl({
			kind: "property",
			category: propertyCategorySurface[lookup.category],
			semantic: lookup.slug,
			publicUrlId: lookup.publicUrlId,
		}),
	});
}
