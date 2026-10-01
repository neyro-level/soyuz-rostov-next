import type { SeoMetaDTO } from "@ams/realtbase-contracts";
import type { GeoMode } from "../../core/profile/index.ts";
import {
	type ApprovedMorphology,
	formatRussianPlural,
	isApprovedMorphology,
	morphologyPhrase,
	type RenderedSeoTemplate,
	renderSeoDefinition,
	type SeoTemplateDefinition,
} from "../../core/seo/registry.ts";
import {
	projectSeoCategoryLabelsInput,
	projectSeoFacetLabelsInput,
	projectSeoTemplatesInput,
} from "./template-inputs.ts";

export const projectSeoTemplateKeys = [
	"homeSingleGeo",
	"homeMultiGeo",
	"geoHub",
	"categoryRoot",
	"categoryGeo",
	"categoryGeoDistrictAdmin",
	"categoryGeoDistrictMicro",
	"categoryGeoFacet",
	"geoDevelopers",
	"developerRoot",
	"developmentNormal",
	"developmentCollision",
	"developer",
	"property",
] as const;

export type ProjectSeoTemplateKey = (typeof projectSeoTemplateKeys)[number];
export type ProjectDistrictType = "admin_district" | "microdistrict";
export type ProjectSeoCategoryForms = {
	nominativePlural: string;
	nominativePluralLower: string;
	accusativeSingular: string;
	genitivePlural: string;
	dealVerb: string;
};

export type ProjectSeoTemplateContext = {
	brand: string;
	activeCategoriesList?: string;
	category?: ProjectSeoCategoryForms;
	city?: ApprovedMorphology;
	region?: ApprovedMorphology;
	district?: ApprovedMorphology;
	districtType?: ProjectDistrictType;
	districtAdjLocative?: string;
	districtAdjGenitive?: string;
	facet?: string;
	entityName?: string;
	inventory?: number;
	freshPrice?: { label: string; fresh: boolean };
};

const projectSeoFacetLabels: Readonly<Record<string, string>> =
	projectSeoFacetLabelsInput;

const projectSeoCategoryLabels: Readonly<
	Record<string, ProjectSeoCategoryForms>
> = projectSeoCategoryLabelsInput;

export function projectSeoCategoryForms(slug: string): ProjectSeoCategoryForms {
	const forms = projectSeoCategoryLabels[slug];
	if (!forms)
		throw new Error(`Project SEO category forms are missing: ${slug}.`);
	for (const [name, value] of Object.entries(forms)) {
		if (!value.trim()) {
			throw new Error(`Project SEO category form is missing: ${slug}.${name}.`);
		}
	}
	return forms;
}

export function projectSeoActiveCategoriesList(
	categories: readonly string[],
): string {
	const labels = categories.map(
		(category) => projectSeoCategoryForms(category).nominativePluralLower,
	);
	if (labels.length === 0) {
		throw new Error("Geo hub SEO requires at least one active category.");
	}
	if (labels.length === 1) return labels[0];
	if (labels.length === 2) return labels.join(" и ");
	return `${labels.slice(0, -1).join(", ")} и ${labels.at(-1)}`;
}

export function projectSeoFacetLabel(slug: string): string {
	const label = projectSeoFacetLabels[slug];
	if (!label) throw new Error(`Project SEO facet label is missing: ${slug}.`);
	return label;
}

const templates = projectSeoTemplatesInput satisfies Record<
	ProjectSeoTemplateKey,
	SeoTemplateDefinition
>;

const cityRequired = new Set<ProjectSeoTemplateKey>([
	"homeSingleGeo",
	"geoHub",
	"categoryGeo",
	"categoryGeoDistrictAdmin",
	"categoryGeoDistrictMicro",
	"categoryGeoFacet",
	"geoDevelopers",
	"developmentCollision",
]);

export function projectHomeSeoTemplateKey(
	geoMode: GeoMode,
): "homeSingleGeo" | "homeMultiGeo" {
	return geoMode === "MULTI_GEO" ? "homeMultiGeo" : "homeSingleGeo";
}

export function renderProjectSeoTemplate(
	templateKey: ProjectSeoTemplateKey,
	context: ProjectSeoTemplateContext,
): RenderedSeoTemplate {
	const geo = context.city ?? context.region;
	const definition = templates[templateKey];
	const inventory =
		context.inventory === undefined
			? undefined
			: formatRussianPlural(context.inventory, [
					"объект",
					"объекта",
					"объектов",
				]);
	const freshPrice = context.freshPrice?.fresh
		? context.freshPrice.label.trim()
		: undefined;
	const requiresCity = cityRequired.has(templateKey);
	const requiresDistrict =
		templateKey === "categoryGeoDistrictAdmin" ||
		templateKey === "categoryGeoDistrictMicro";
	const morphologyApproved =
		(!requiresCity || isApprovedMorphology(geo)) &&
		(!requiresDistrict || isApprovedMorphology(context.district)) &&
		(templateKey !== "categoryGeoDistrictAdmin" ||
			Boolean(
				context.districtAdjLocative?.trim() &&
					context.districtAdjGenitive?.trim(),
			));

	return renderSeoDefinition(
		definition,
		{
			brand: context.brand,
			activeCategoriesList: context.activeCategoriesList?.trim(),
			category: context.category?.nominativePlural,
			categoryLower: context.category?.nominativePluralLower,
			categoryNominativePlural: context.category?.nominativePlural,
			categoryAccusative: context.category?.accusativeSingular,
			categoryGenitivePlural: context.category?.genitivePlural,
			dealVerb: context.category?.dealVerb,
			cityPhrase: morphologyPhrase(geo, "prepositional", true),
			cityGenitive: morphologyPhrase(geo, "genitive"),
			geoGenitive: morphologyPhrase(geo, "genitive"),
			districtPhrase: morphologyPhrase(context.district, "prepositional", true),
			districtAdjLocative: context.districtAdjLocative?.trim(),
			facet: context.facet,
			entityName: context.entityName,
			inventory,
			freshPrice,
		},
		morphologyApproved,
	);
}

export function projectSeoMeta(
	templateKey: ProjectSeoTemplateKey,
	context: ProjectSeoTemplateContext,
	canonicalPath: string,
): SeoMetaDTO & { morphologyApproved: boolean } {
	const rendered = renderProjectSeoTemplate(templateKey, context);
	return {
		title: rendered.title,
		description: rendered.description,
		canonicalPath,
		indexing: "noindex",
		following: "follow",
		morphologyApproved: rendered.morphologyApproved,
	};
}

export function isFreshPriceCheckedAt(
	checkedAt: string | null | undefined,
	maxAgeDays: number,
	now = new Date(),
): boolean {
	if (!checkedAt || !Number.isFinite(maxAgeDays) || maxAgeDays < 0)
		return false;
	const checked = new Date(checkedAt);
	if (Number.isNaN(checked.getTime()) || checked.getTime() > now.getTime()) {
		return false;
	}
	return now.getTime() - checked.getTime() <= maxAgeDays * 86_400_000;
}

export function isSeoMetaMorphologyApproved(seo: SeoMetaDTO): boolean {
	return (
		(seo as SeoMetaDTO & { morphologyApproved?: boolean })
			.morphologyApproved !== false
	);
}
