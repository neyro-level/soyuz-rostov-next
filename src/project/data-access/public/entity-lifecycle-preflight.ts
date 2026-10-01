import "server-only";

import type { PageKey } from "@/core/routing";
import { resolveEntityPageLifecycle } from "@/core/lifecycle/entity-lifecycle";
import { siteProfile } from "@/project/site-profile";
import { createProjectUrlGrammar } from "@/project/url-grammar";
import { findPublicEntityLifecycle } from "./entity-lifecycle";
import { getOptionalPublicGatewayPayload } from "./payload";

export type EntityLifecyclePreflightDecision =
	| { kind: "pass" }
	| { kind: "gone"; statusCode: 410; label: string }
	| { kind: "redirect"; statusCode: 301; destination: string };

const grammar = createProjectUrlGrammar(siteProfile);

export async function lookupCanonicalEntityLifecyclePreflight(
	pageKey: PageKey,
): Promise<EntityLifecyclePreflightDecision> {
	if (
		pageKey.kind !== "property" &&
		pageKey.kind !== "development" &&
		pageKey.kind !== "developer"
	) {
		return { kind: "pass" };
	}
	const payload = await getOptionalPublicGatewayPayload();
	if (!payload) return { kind: "pass" };

	const label = pageKey.kind === "property" ? pageKey.semantic : pageKey.slug;
	const lifecycle = resolveEntityPageLifecycle(
		await findPublicEntityLifecycle({
			payload,
			entityType:
				pageKey.kind === "property"
					? "property"
					: pageKey.kind === "development"
						? "development"
						: "developer",
			...(pageKey.kind === "property"
				? { publicUrlId: pageKey.publicUrlId }
				: { slug: pageKey.slug }),
			canonicalPath: grammar.buildUrl(pageKey),
		}),
	);
	if (lifecycle.kind === "gone") {
		return { kind: "gone", statusCode: 410, label };
	}
	if (lifecycle.kind === "redirect") {
		return {
			kind: "redirect",
			statusCode: 301,
			destination: lifecycle.destination,
		};
	}
	return { kind: "pass" };
}
