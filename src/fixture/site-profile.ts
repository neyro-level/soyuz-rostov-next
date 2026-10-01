import type { SitePreset } from "../core/profile/index.ts";
import type { ProjectSiteProfileConfig } from "../project/site-profile.config.types.ts";
import {
	createPresetSiteProfileConfig,
	createProjectSiteProfile,
} from "../project/site-profile.ts";

function fixtureSeoFacets(
	geos: ProjectSiteProfileConfig["geos"],
): ProjectSiteProfileConfig["seoFacets"] {
	return {
		...(geos.primorsk
			? {
					vtorichka: {
						geo: "primorsk",
						category: "kvartiry" as const,
						filter: { key: "market", value: "secondary" },
					},
					dvukhkomnatnye: {
						geo: "primorsk",
						category: "kvartiry" as const,
						filter: { key: "rooms", value: [2] },
					},
				}
			: {}),
		...(geos.zarechnyy
			? {
					odnokomnatnye: {
						geo: "zarechnyy",
						category: "kvartiry" as const,
						filter: { key: "rooms", value: [1] },
					},
				}
			: {}),
	};
}

function createFixtureProfile(input: {
	preset: SitePreset;
	geoMode: ProjectSiteProfileConfig["geoMode"];
}) {
	const geos: ProjectSiteProfileConfig["geos"] = {
		primorsk: { published: true, hubStatus: "ACTIVE" },
		...(input.geoMode === "MULTI_GEO"
			? {
					zarechnyy: {
						published: true,
						hubStatus: "NOINDEX_AUTO" as const,
						agglomerationOf: "primorsk",
					},
				}
			: {}),
	};
	return createProjectSiteProfile(
		createPresetSiteProfileConfig({
			projectKind: "starter-demo",
			preset: input.preset,
			geoMode: input.geoMode,
			primaryGeo: "primorsk",
			geos,
			seoFacets: fixtureSeoFacets(geos),
		}),
	);
}

const threeCityGeos: ProjectSiteProfileConfig["geos"] = {
	primorsk: { published: true, hubStatus: "ACTIVE" },
	zarechnyy: {
		published: true,
		hubStatus: "PREPARED_OFF",
		agglomerationOf: "primorsk",
	},
	beregovoy: { published: false, hubStatus: "PREPARED_OFF" },
};

export const siteProfileFixtures = {
	singleGeo: createFixtureProfile({ preset: "MIXED", geoMode: "SINGLE_GEO" }),
	multiGeo: createFixtureProfile({ preset: "MIXED", geoMode: "MULTI_GEO" }),
	newbuildFirst: createFixtureProfile({
		preset: "NEWBUILD_FIRST",
		geoMode: "MULTI_GEO",
	}),
	secondaryFirst: createFixtureProfile({
		preset: "SECONDARY_FIRST",
		geoMode: "MULTI_GEO",
	}),
	singleGeoThreeCities: createProjectSiteProfile(
		createPresetSiteProfileConfig({
			projectKind: "starter-demo",
			preset: "MIXED",
			geoMode: "SINGLE_GEO",
			primaryGeo: "primorsk",
			geos: threeCityGeos,
			seoFacets: fixtureSeoFacets(threeCityGeos),
		}),
	),
} as const;
