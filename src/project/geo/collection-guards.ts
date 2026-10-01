import type { PayloadRequest } from "payload";
import {
	type AgglomerationNode,
	assertAgglomerationGraph,
	assertCanonicalGeoSlug,
	assertGeoMorphology,
	assertPublishedGeoSlugImmutable,
	assertSlugOutsideNamespace,
	type GeoPublicationStatus,
	normalizeGeoPublication,
} from "../../core/geo/hierarchy.ts";
import { catalogSurfaceSlugs } from "../../core/profile/index.ts";
import {
	isPlatformReservedRoot,
	platformReservedRoots,
} from "../../core/routing/url-grammar.ts";
import { legacyRouteRoots } from "../routing/legacy-route-manifest.ts";
import { siteProfile } from "../site-profile.ts";
import { projectStaticRoutes } from "../static-routes.ts";
import { geoValidationContext } from "./access.ts";

type GeoData = Record<string, unknown>;

const relationId = (value: unknown): string | null => {
	if (typeof value === "string" || typeof value === "number")
		return String(value);
	if (value && typeof value === "object" && "id" in value) {
		const id = (value as { id?: unknown }).id;
		return typeof id === "string" || typeof id === "number" ? String(id) : null;
	}
	return null;
};

const staticRoots = projectStaticRoutes.flatMap((route) => {
	const root = route.path.split("/").filter(Boolean)[0];
	return root ? [root] : [];
});
const configuredReservedRoots = Object.values(siteProfile.modules).flatMap(
	(module) => module.reservedRoots,
);

export const reservedGeoRootSlugs = new Set<string>([
	...platformReservedRoots,
	...catalogSurfaceSlugs,
	"zastroyshchiki",
	...staticRoots,
	...legacyRouteRoots,
	...configuredReservedRoots,
]);

export const reservedDistrictSlugs = new Set<string>(reservedGeoRootSlugs);

function mergedValue(
	data: GeoData,
	originalDoc: GeoData | undefined,
	key: string,
) {
	return data[key] === undefined ? originalDoc?.[key] : data[key];
}

export function assertDistrictMorphologyForms(
	data: GeoData,
	originalDoc?: GeoData,
): void {
	const districtType = String(
		mergedValue(data, originalDoc, "districtType") ?? "",
	);
	const requiredForm = (key: string) => {
		const value = mergedValue(data, originalDoc, key);
		return typeof value === "string" && value.trim() !== "";
	};
	if (
		districtType === "admin_district" &&
		(!requiredForm("adjLocative") || !requiredForm("adjGenitive"))
	) {
		throw new Error(
			"Administrative district requires explicit adjLocative and adjGenitive.",
		);
	}
	if (districtType === "microdistrict") {
		if (!requiredForm("locative") || !requiredForm("preposition")) {
			throw new Error(
				"Microdistrict requires explicit locative and preposition.",
			);
		}
		if (requiredForm("adjLocative") || requiredForm("adjGenitive")) {
			throw new Error(
				"Microdistrict cannot own administrative adjective forms.",
			);
		}
	}
}

export function normalizeGeoWrite(
	data: GeoData,
	originalDoc?: GeoData,
	label = "Geo",
): GeoData {
	const slug = assertCanonicalGeoSlug(
		mergedValue(data, originalDoc, "slug"),
		label,
	);
	const status = (mergedValue(data, originalDoc, "status") ??
		"draft") as GeoPublicationStatus;
	if (!(["draft", "published", "archived"] as const).includes(status)) {
		throw new Error(`${label} has invalid publication status.`);
	}
	const morphology = assertGeoMorphology(
		mergedValue(data, originalDoc, "morphology"),
	);
	assertPublishedGeoSlugImmutable({
		nextSlug: slug,
		originalSlug:
			typeof originalDoc?.slug === "string" ? originalDoc.slug : undefined,
		originalStatus: originalDoc?.status as GeoPublicationStatus | undefined,
		originalPublishedAt:
			typeof originalDoc?.publishedAt === "string"
				? originalDoc.publishedAt
				: undefined,
	});
	const publication = normalizeGeoPublication({
		status,
		publishedAt:
			typeof mergedValue(data, originalDoc, "publishedAt") === "string"
				? (mergedValue(data, originalDoc, "publishedAt") as string)
				: null,
		nowIso: new Date().toISOString(),
	});
	data.slug = slug;
	data.morphology = morphology;
	data.status = publication.status;
	data.publishedAt = publication.publishedAt;
	return data;
}

async function rootSlugExists(
	req: PayloadRequest,
	slug: string,
	currentCollection: "regions" | "cities",
	currentId?: string,
): Promise<boolean> {
	for (const collection of ["regions", "cities"] as const) {
		const result = await req.payload.find({
			collection,
			where: { slug: { equals: slug } },
			limit: 2,
			depth: 0,
			overrideAccess: false,
			req,
			context: geoValidationContext(req),
		});
		if (
			result.docs.some(
				(doc) =>
					collection !== currentCollection || String(doc.id) !== currentId,
			)
		) {
			return true;
		}
	}
	return false;
}

export async function validateRootGeoWrite(input: {
	data: GeoData;
	originalDoc?: GeoData;
	req: PayloadRequest;
	collection: "regions" | "cities";
	label: string;
}): Promise<GeoData> {
	normalizeGeoWrite(input.data, input.originalDoc, input.label);
	const slug = String(input.data.slug);
	if (isPlatformReservedRoot(slug)) {
		throw new Error(
			`${input.label} slug is reserved by the platform: ${slug}.`,
		);
	}
	assertSlugOutsideNamespace(slug, reservedGeoRootSlugs, input.label);
	if (
		await rootSlugExists(
			input.req,
			slug,
			input.collection,
			input.originalDoc?.id == null ? undefined : String(input.originalDoc.id),
		)
	) {
		throw new Error(`Geo root slug is already owned: ${slug}.`);
	}
	return input.data;
}

export async function validateCityHierarchy(input: {
	data: GeoData;
	originalDoc?: GeoData;
	req: PayloadRequest;
}): Promise<void> {
	const id =
		input.originalDoc?.id == null ? null : String(input.originalDoc.id);
	const regionId = relationId(
		mergedValue(input.data, input.originalDoc, "region"),
	);
	const agglomerationOfId = relationId(
		mergedValue(input.data, input.originalDoc, "agglomerationOf"),
	);
	if (!regionId) throw new Error("City region is required.");
	if (id && agglomerationOfId === id) {
		throw new Error("City cannot be its own agglomeration parent.");
	}
	const result = await input.req.payload.find({
		collection: "cities",
		limit: 1000,
		pagination: false,
		depth: 0,
		overrideAccess: false,
		req: input.req,
		context: geoValidationContext(input.req),
	});
	const nodes: AgglomerationNode[] = result.docs
		.filter((doc) => String(doc.id) !== id)
		.map((doc) => ({
			id: String(doc.id),
			regionId: relationId(doc.region) ?? "",
			agglomerationOfId: relationId(doc.agglomerationOf),
		}));
	const candidateId = id ?? "__new_city__";
	nodes.push({ id: candidateId, regionId, agglomerationOfId });
	assertAgglomerationGraph(nodes);
}

export async function validateDistrictWrite(input: {
	data: GeoData;
	originalDoc?: GeoData;
	req: PayloadRequest;
}): Promise<GeoData> {
	normalizeGeoWrite(input.data, input.originalDoc, "District");
	assertDistrictMorphologyForms(input.data, input.originalDoc);
	const slug = String(input.data.slug);
	assertSlugOutsideNamespace(slug, reservedDistrictSlugs, "District");
	const cityId = relationId(mergedValue(input.data, input.originalDoc, "city"));
	if (!cityId) throw new Error("District city is required.");
	const categories = mergedValue(input.data, input.originalDoc, "categories");
	if (
		!Array.isArray(categories) ||
		categories.length === 0 ||
		categories.some(
			(category) =>
				typeof category !== "string" ||
				!(catalogSurfaceSlugs as readonly string[]).includes(category),
		)
	) {
		throw new Error(
			"District categories must contain configured catalog surfaces.",
		);
	}
	const city = await input.req.payload.findByID({
		collection: "cities",
		id: cityId,
		depth: 0,
		overrideAccess: false,
		req: input.req,
		context: geoValidationContext(input.req),
	});
	const facetCollision = Object.entries(siteProfile.seoFacets).find(
		([facetSlug, facet]) =>
			facetSlug === slug &&
			facet.geo === city.slug &&
			categories.includes(facet.category),
	);
	if (facetCollision) {
		throw new Error(
			`District slug collides with an SEO facet in this geo/category: ${slug}.`,
		);
	}
	const currentId =
		input.originalDoc?.id == null ? null : String(input.originalDoc.id);
	const parentId = relationId(
		mergedValue(input.data, input.originalDoc, "parent"),
	);
	if (currentId && parentId === currentId) {
		throw new Error("District cannot be its own parent.");
	}
	const hierarchy = await input.req.payload.find({
		collection: "districts",
		limit: 1000,
		pagination: false,
		depth: 0,
		overrideAccess: false,
		req: input.req,
		context: geoValidationContext(input.req),
	});
	const hierarchyById = new Map(
		hierarchy.docs
			.filter((doc) => String(doc.id) !== currentId)
			.map((doc) => [
				String(doc.id),
				{
					cityId: relationId(doc.city),
					parentId: relationId(doc.parent),
				},
			]),
	);
	if (parentId) {
		const parent = hierarchyById.get(parentId);
		if (!parent || parent.cityId !== cityId) {
			throw new Error("District parent must belong to the same city.");
		}
		const visited = new Set<string>([currentId ?? "__new_district__"]);
		let cursor: string | null = parentId;
		while (cursor) {
			if (visited.has(cursor)) {
				throw new Error("District hierarchy contains a cycle.");
			}
			visited.add(cursor);
			cursor = hierarchyById.get(cursor)?.parentId ?? null;
		}
	}
	const result = await input.req.payload.find({
		collection: "districts",
		where: { and: [{ city: { equals: cityId } }, { slug: { equals: slug } }] },
		limit: 2,
		depth: 0,
		overrideAccess: false,
		req: input.req,
		context: geoValidationContext(input.req),
	});
	if (result.docs.some((doc) => String(doc.id) !== currentId)) {
		throw new Error(`District slug is already owned in this city: ${slug}.`);
	}
	return input.data;
}
