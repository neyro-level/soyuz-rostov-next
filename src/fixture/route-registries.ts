import type { SiteProfile } from "../core/profile/index.ts";
import type { ProjectDistrictRouteRegistry } from "../project/url-grammar.ts";

/** Test/demo-only registry. Production/client runtime reads published districts from Payload. */
export const fixtureDistrictRouteRegistry = {
	primorsk: {
		kvartiry: ["severnyy"],
	},
	zarechnyy: {
		kvartiry: ["tsentralnyy"],
	},
} as const satisfies ProjectDistrictRouteRegistry;

export function fixtureDistrictRouteRegistryFor(
	profile: SiteProfile,
): ProjectDistrictRouteRegistry {
	return Object.fromEntries(
		Object.keys(profile.geos).flatMap((geo) => {
			const byCategory =
				fixtureDistrictRouteRegistry[
					geo as keyof typeof fixtureDistrictRouteRegistry
				];
			return byCategory ? [[geo, byCategory]] : [];
		}),
	);
}
