import * as migration_20260916_062222 from "./20260916_062222";
import * as migration_20260916_084953 from "./20260916_084953";
import * as migration_20260916_090228 from "./20260916_090228";
import * as migration_20260916_091500 from "./20260916_091500";
import * as migration_20260918_101800 from "./20260918_101800";
import * as migration_20260918_193000 from "./20260918_193000";
import * as migration_20260919_120900 from "./20260919_120900";
import * as migration_20260919_140536_add_payload_jobs from "./20260919_140536_add_payload_jobs";
import * as migration_20260919_151000 from "./20260919_151000";
import * as migration_20260921_185354_add_reset_password_requested_at from "./20260921_185354_add_reset_password_requested_at";
import * as migration_20260924_111534 from "./20260924_111534";
import * as migration_20260924_134500_geo_hierarchy from "./20260924_134500_geo_hierarchy";
import * as migration_20260924_151000_property_geo_refs from "./20260924_151000_property_geo_refs";
import * as migration_20260924_170000_property_taxonomy_identity from "./20260924_170000_property_taxonomy_identity";
import * as migration_20260924_180000_developments from "./20260924_180000_developments";
import * as migration_20260924_203000_lifecycle_cache from "./20260924_203000_lifecycle_cache";
import * as migration_20260924_213000_feed_media_mirror from "./20260924_213000_feed_media_mirror";
import * as migration_20260924_223000_development_excel from "./20260924_223000_development_excel";
import * as migration_20260924_233000_lead_context from "./20260924_233000_lead_context";
import * as migration_20260925_140000_district_route_categories from "./20260925_140000_district_route_categories";
import * as migration_20260925_230000_development_model_v2 from "./20260925_230000_development_model_v2";
import * as migration_20260926_092324_plan9_s10b_indexnow_jobs from "./20260926_092324_plan9_s10b_indexnow_jobs";
import * as migration_20260927_010000_geo_taxonomy_v3 from "./20260927_010000_geo_taxonomy_v3";
import * as migration_20260927_110000_district_morphology from "./20260927_110000_district_morphology";
import * as migration_20260928_163000_development_external_media from "./20260928_163000_development_external_media";

export const migrations = [
	{
		up: migration_20260916_062222.up,
		down: migration_20260916_062222.down,
		name: "20260916_062222",
	},
	{
		up: migration_20260916_084953.up,
		down: migration_20260916_084953.down,
		name: "20260916_084953",
	},
	{
		up: migration_20260916_090228.up,
		down: migration_20260916_090228.down,
		name: "20260916_090228",
	},
	{
		up: migration_20260916_091500.up,
		down: migration_20260916_091500.down,
		name: "20260916_091500",
	},
	{
		up: migration_20260918_101800.up,
		down: migration_20260918_101800.down,
		name: "20260918_101800",
	},
	{
		up: migration_20260918_193000.up,
		down: migration_20260918_193000.down,
		name: "20260918_193000",
	},
	{
		up: migration_20260919_120900.up,
		down: migration_20260919_120900.down,
		name: "20260919_120900",
	},
	{
		up: migration_20260919_140536_add_payload_jobs.up,
		down: migration_20260919_140536_add_payload_jobs.down,
		name: "20260919_140536_add_payload_jobs",
	},
	{
		up: migration_20260919_151000.up,
		down: migration_20260919_151000.down,
		name: "20260919_151000",
	},
	{
		up: migration_20260921_185354_add_reset_password_requested_at.up,
		down: migration_20260921_185354_add_reset_password_requested_at.down,
		name: "20260921_185354_add_reset_password_requested_at",
	},
	{
		up: migration_20260924_111534.up,
		down: migration_20260924_111534.down,
		name: "20260924_111534",
	},
	{
		up: migration_20260924_134500_geo_hierarchy.up,
		down: migration_20260924_134500_geo_hierarchy.down,
		name: "20260924_134500_geo_hierarchy",
	},
	{
		up: migration_20260924_151000_property_geo_refs.up,
		down: migration_20260924_151000_property_geo_refs.down,
		name: "20260924_151000_property_geo_refs",
	},
	{
		up: migration_20260924_170000_property_taxonomy_identity.up,
		down: migration_20260924_170000_property_taxonomy_identity.down,
		name: "20260924_170000_property_taxonomy_identity",
	},
	{
		up: migration_20260924_180000_developments.up,
		down: migration_20260924_180000_developments.down,
		name: "20260924_180000_developments",
	},
	{
		up: migration_20260924_203000_lifecycle_cache.up,
		down: migration_20260924_203000_lifecycle_cache.down,
		name: "20260924_203000_lifecycle_cache",
	},
	{
		up: migration_20260924_213000_feed_media_mirror.up,
		down: migration_20260924_213000_feed_media_mirror.down,
		name: "20260924_213000_feed_media_mirror",
	},
	{
		up: migration_20260924_223000_development_excel.up,
		down: migration_20260924_223000_development_excel.down,
		name: "20260924_223000_development_excel",
	},
	{
		up: migration_20260924_233000_lead_context.up,
		down: migration_20260924_233000_lead_context.down,
		name: "20260924_233000_lead_context",
	},
	{
		up: migration_20260925_140000_district_route_categories.up,
		down: migration_20260925_140000_district_route_categories.down,
		name: "20260925_140000_district_route_categories",
	},
	{
		up: migration_20260925_230000_development_model_v2.up,
		down: migration_20260925_230000_development_model_v2.down,
		name: "20260925_230000_development_model_v2",
	},
	{
		up: migration_20260926_092324_plan9_s10b_indexnow_jobs.up,
		down: migration_20260926_092324_plan9_s10b_indexnow_jobs.down,
		name: "20260926_092324_plan9_s10b_indexnow_jobs",
	},
	{
		up: migration_20260927_010000_geo_taxonomy_v3.up,
		down: migration_20260927_010000_geo_taxonomy_v3.down,
		name: "20260927_010000_geo_taxonomy_v3",
	},
	{
		up: migration_20260927_110000_district_morphology.up,
		down: migration_20260927_110000_district_morphology.down,
		name: "20260927_110000_district_morphology",
	},
	{
		up: migration_20260928_163000_development_external_media.up,
		down: migration_20260928_163000_development_external_media.down,
		name: "20260928_163000_development_external_media",
	},
];
