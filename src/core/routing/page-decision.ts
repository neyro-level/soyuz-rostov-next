import type { SiteProfile } from "../profile/index.ts";
import {
	evaluateContentGate,
	type ContentGateDecision,
	type ContentGateInput,
} from "../seo/content-gate.ts";
import type { ResolverPageResult } from "./resolver.ts";
import type { PageKey } from "./url-grammar.ts";

export type PageDecision = ResolverPageResult & {
	statusCode: 200;
	robots: Pick<ContentGateDecision, "indexing" | "following">;
	inSitemap: boolean;
	indexNowEligible: boolean;
	visibleInMenu: boolean;
	visibleInInterlinks: boolean;
	gate: ContentGateDecision;
};

export function decidePage(
	profile: SiteProfile,
	pageKey: PageKey,
	resolved: ResolverPageResult,
	input: ContentGateInput,
	now = new Date(),
): PageDecision {
	if (
		resolved.pageKey.kind !== pageKey.kind ||
		resolved.canonicalPath !== input.canonical ||
		input.url !== resolved.canonicalPath ||
		input.profileStatus !== resolved.profileStatus
	) {
		throw new Error("Content Gate input does not match the resolved page.");
	}
	const gate = evaluateContentGate(profile, input, now);
	if (gate.statusCode !== 200) {
		throw new Error(
			`Resolved page produced a non-page Content Gate status: ${gate.statusCode}.`,
		);
	}
	const discoverable =
		gate.indexing === "index" &&
		gate.following === "follow" &&
		gate.includeInSitemap &&
		gate.canonical === resolved.canonicalPath;
	return {
		...resolved,
		statusCode: 200,
		canonicalPath: gate.canonical,
		robots: { indexing: gate.indexing, following: gate.following },
		inSitemap: gate.includeInSitemap,
		indexNowEligible: discoverable,
		visibleInMenu: discoverable,
		visibleInInterlinks: discoverable,
		gate,
	};
}
