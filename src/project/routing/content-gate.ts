import type {
	DeveloperCardDTO,
	DeveloperDetailsDTO,
	DevelopmentDetailsDTO,
	GeoHubDTO,
	ListingPageDTO,
	PropertyDetailsDTO,
} from "@ams/realtbase-contracts";
import type { EntityPageLifecycleState } from "@/core/lifecycle/entity-lifecycle";
import {
	decidePage as decideResolvedPage,
	type PageDecision,
	type ResolverPageResult,
} from "@/core/routing";
import type {
	ContentGateCommon,
	ContentGateInput,
} from "@/core/seo/content-gate";
import { projectSeoRegistrySeed } from "@/project/seo/registry-seed";
import { isSeoMetaMorphologyApproved } from "@/project/seo/templates";
import { siteProfile } from "@/project/site-profile";

export type RuntimeGateData =
	| { kind: "geoHub"; value: GeoHubDTO }
	| { kind: "listing"; value: ListingPageDTO }
	| {
			kind: "developers";
			value: readonly DeveloperCardDTO[];
			developersWithPassingDevelopment: number;
			intro: string;
	  }
	| {
			kind: "developer";
			value: DeveloperDetailsDTO;
			hasPassingDevelopment: boolean;
			descriptionSource: string | null;
			descriptionCheckedAt: string | null;
	  }
	| {
			kind: "development";
			value: DevelopmentDetailsDTO;
			gateFacts: Omit<
				Extract<ContentGateInput, { kind: "development" }>,
				keyof ContentGateCommon | "kind"
			>;
	  }
	| {
			kind: "property";
			value: PropertyDetailsDTO;
			districtRaw: string | null;
			gatePhotoCount: number;
	  };

function lifecycle(resolved: ResolverPageResult): EntityPageLifecycleState {
	return resolved.lifecycle === "archived"
		? { kind: "archived", statusCode: 200, robots: "noindex" }
		: { kind: "active", statusCode: 200 };
}

function registry(canonical: string) {
	return projectSeoRegistrySeed.find((row) => row.url === canonical) ?? null;
}

function inputFor(
	resolved: ResolverPageResult,
	data: RuntimeGateData,
): ContentGateInput {
	const common = {
		url: resolved.canonicalPath,
		canonical: resolved.canonicalPath,
		profileStatus: resolved.profileStatus,
		lifecycle: lifecycle(resolved),
	};
	if (data.kind === "geoHub") {
		return {
			...common,
			kind: "listing",
			registry: registry(resolved.canonicalPath),
			inventory: resolved.inventory,
			intro: data.value.intro,
			ssrLinkCount:
				data.value.categoryLinks.length +
				data.value.districtLinks.length +
				data.value.nearby.length +
				(data.value.developerLink ? 1 : 0),
		};
	}
	if (data.kind === "listing") {
		return {
			...common,
			kind: "listing",
			registry: registry(resolved.canonicalPath),
			inventory: data.value.total,
			intro: data.value.intro,
			ssrLinkCount:
				data.value.items.length +
				data.value.subLinks.length +
				data.value.nearby.length,
		};
	}
	if (data.kind === "developers") {
		return {
			...common,
			kind: "developerGeo",
			developersWithPassingDevelopment: data.developersWithPassingDevelopment,
			registry: registry(resolved.canonicalPath),
			intro: data.intro,
		};
	}
	if (data.kind === "developer") {
		return {
			...common,
			kind: "developer",
			hasPassingDevelopment: data.hasPassingDevelopment,
			description: data.value.description ?? "",
			descriptionSource: data.descriptionSource,
			descriptionCheckedAt: data.descriptionCheckedAt,
		};
	}
	if (data.kind === "development") {
		return {
			...common,
			kind: "development",
			...data.gateFacts,
		};
	}
	if (resolved.market === "newbuild") {
		return { ...common, kind: "newbuildLot" };
	}
	const details = data.value.categoryDetails;
	return {
		...common,
		kind: "secondary",
		priceMinor: data.value.price?.priceMinor ?? null,
		area: "totalArea" in details ? (details.totalArea ?? null) : null,
		category: data.value.category,
		rooms: "rooms" in details ? (details.rooms ?? null) : null,
		district: data.value.district ?? null,
		rawDistrictRef: data.districtRaw,
		ownedPhotoCount: data.gatePhotoCount,
		description: data.value.description,
	};
}

export function decidePage(
	resolved: ResolverPageResult,
	data: RuntimeGateData,
	now = new Date(),
): PageDecision {
	const decision = decideResolvedPage(
		siteProfile,
		resolved.pageKey,
		resolved,
		inputFor(resolved, data),
		now,
	);
	const seo =
		"value" in data &&
		data.value &&
		typeof data.value === "object" &&
		"seo" in data.value
			? data.value.seo
			: null;
	if (!seo || isSeoMetaMorphologyApproved(seo)) return decision;
	const gate = {
		...decision.gate,
		indexing: "noindex" as const,
		includeInSitemap: false,
		reasons: [...decision.gate.reasons, "runtime_morphology_unapproved"],
	};
	return {
		...decision,
		robots: { indexing: "noindex", following: "follow" },
		inSitemap: false,
		indexNowEligible: false,
		visibleInMenu: false,
		visibleInInterlinks: false,
		gate,
	};
}
