import { getPayload } from "payload";
import config from "../payload.config.ts";
import { createPayloadStarterFixtureSeedPort } from "../src/core/data-access/system/starter-fixture-port.ts";
import { requirePayloadRuntime } from "../src/project/env.ts";
import {
	type GeoSeedDataset,
	seedGeoDataset,
} from "../src/project/fixture-data/starter-seed.ts";
import { validateCloneBootstrap } from "./clone-preset.mjs";

const preposition = { в: "v", во: "vo", на: "na" } as const;
const bootstrap = validateCloneBootstrap(process.cwd());
const dataset: GeoSeedDataset = {
	snapshotAt: bootstrap.preparedAt,
	region: {
		slug: bootstrap.region.slug,
		title: bootstrap.region.name,
		morphology: {
			nominative: bootstrap.region.name,
			genitive: bootstrap.region.genitive,
			prepositional: bootstrap.region.locative,
		},
		shortName: bootstrap.region.shortName,
		sortOrder: 10,
	},
	cities: bootstrap.geos.map((geo, cityIndex) => ({
		slug: geo.slug,
		title: geo.title,
		morphology: {
			nominative: geo.morphology.nominative,
			genitive: geo.morphology.genitive,
			prepositional: geo.morphology.prepositional,
		},
		preposition:
			preposition[geo.morphology.preposition as keyof typeof preposition],
		cityType: "city",
		morphologyApproved: true,
		sortOrder: (cityIndex + 1) * 10,
		agglomerationOf: geo.agglomerationOf,
		districts: geo.districts.map((district, districtIndex) => {
			const common = {
				slug: district.slug,
				title: district.name,
				morphology: {
					nominative: district.name,
					genitive: district.name,
					prepositional: district.locative,
				},
				parent: district.parent,
				synonyms: district.synonyms.map((value: string) => ({ value })),
				preposition:
					preposition[district.preposition as keyof typeof preposition],
				morphologyApproved: true,
				sortOrder: (districtIndex + 1) * 10,
			};
			return district.type === "admin_district"
				? {
						...common,
						districtType: "admin_district" as const,
						adjLocative: district.adjLocative,
						adjGenitive: district.adjGenitive,
					}
				: {
						...common,
						districtType: "microdistrict" as const,
						locative: district.locative,
					};
		}),
	})),
};

requirePayloadRuntime();
const payload = await getPayload({ config });
try {
	const seedPort = createPayloadStarterFixtureSeedPort(payload);
	const result = await seedGeoDataset(
		seedPort,
		dataset,
	);
	const siteSettings = await seedPort.upsertSiteSettings({
		brandName: bootstrap.nap.brandName,
		phone: bootstrap.nap.phone,
		email: bootstrap.nap.email,
		address: bootstrap.nap.address,
		workingHours: bootstrap.nap.workingHours,
	});
	payload.logger.info(
		`clone geo seed: ${JSON.stringify({ ...result.report, siteSettings })}`,
	);
} finally {
	await payload.destroy();
}
