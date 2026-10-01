import {
	type PropertyCategory,
	propertyCategorySurface,
} from "../../core/property/taxonomy.ts";
import type { DevelopmentKind } from "../../core/routing/index.ts";
import { siteProfile } from "../site-profile.ts";
import { createProjectUrlGrammar } from "../url-grammar.ts";

const grammar = createProjectUrlGrammar(siteProfile);

export type LifecycleCanonicalDocument = {
	slug?: string | null;
	publicUrlId?: number | null;
	category?: string | null;
	kind?: string | null;
};

export function buildLifecycleCanonicalPath(
	entityType: "property" | "development" | "developer",
	doc: LifecycleCanonicalDocument,
): string {
	const slug = doc.slug?.trim();
	if (!slug) throw new Error("Lifecycle transition requires a canonical slug.");
	if (entityType === "developer") {
		return grammar.buildUrl({ kind: "developer", slug });
	}
	if (entityType === "development") {
		if (doc.kind !== "residential_complex" && doc.kind !== "cottage_village") {
			throw new Error("Development lifecycle requires a supported kind.");
		}
		return grammar.buildUrl({
			kind: "development",
			developmentKind: doc.kind as DevelopmentKind,
			slug,
		});
	}
	if (
		!doc.category ||
		!(doc.category in propertyCategorySurface) ||
		!Number.isSafeInteger(doc.publicUrlId) ||
		Number(doc.publicUrlId) <= 0
	) {
		throw new Error(
			"Property lifecycle requires category and positive publicUrlId.",
		);
	}
	return grammar.buildUrl({
		kind: "property",
		category: propertyCategorySurface[doc.category as PropertyCategory],
		semantic: slug,
		publicUrlId: Number(doc.publicUrlId),
	});
}
