import {
	catalogSurfaceSlugs,
	defineSiteProfile,
	type CatalogSurfaceSlug,
	type SiteProfile,
} from "../core/profile/index.ts";
import { projectSiteProfileConfig } from "./site-profile.config.ts";
import type { ProjectSiteProfileConfig } from "./site-profile.config.types.ts";
import { validateProjectLegacyRouteTargets } from "./url-grammar.ts";

export { createPresetSiteProfileConfig } from "./site-profile-presets.ts";

export function createProjectSiteProfile(
	input: ProjectSiteProfileConfig,
): SiteProfile {
	const profile = defineSiteProfile(input);
	validateProjectLegacyRouteTargets(profile);
	return profile;
}

export function activeProjectGeoCategorySurfaces(
	profile: SiteProfile,
	geo: string,
): CatalogSurfaceSlug[] {
	return catalogSurfaceSlugs.filter((surface) => {
		const globalStatus = profile.categoryStatus[surface];
		const localStatus = profile.geoCategoryStatus[geo]?.[surface];
		return (
			(globalStatus === "ACTIVE" || globalStatus === "NOINDEX_AUTO") &&
			(localStatus === "ACTIVE" || localStatus === "NOINDEX_AUTO")
		);
	});
}

export const siteProfile = createProjectSiteProfile(projectSiteProfileConfig);
