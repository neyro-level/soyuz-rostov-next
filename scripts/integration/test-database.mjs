import { execFileSync } from "node:child_process";
import { leadDeliveryRelationalContractUpSql } from "../../migrations/20260919_151000.ts";
import {
	payloadAuthSecurityDownSql,
	payloadAuthSecurityUpSql,
} from "../../migrations/20260921_185354_add_reset_password_requested_at.ts";
import {
	siteSettingsDownSql,
	siteSettingsUpSql,
} from "../../migrations/20260924_111534.ts";
import {
	geoHierarchyDownSql,
	geoHierarchyUpSql,
} from "../../migrations/20260924_134500_geo_hierarchy.ts";
import {
	propertyGeoRefsDownSql,
	propertyGeoRefsUpSql,
} from "../../migrations/20260924_151000_property_geo_refs.ts";
import { propertyIdentityUpSql } from "../../migrations/20260924_170000_property_taxonomy_identity.ts";
import {
	developmentsDownSql,
	developmentsUpSql,
} from "../../migrations/20260924_180000_developments.ts";
import {
	leadContextDownSql,
	leadContextUpSql,
} from "../../migrations/20260924_233000_lead_context.ts";
import {
	districtRouteCategoriesDownSql,
	districtRouteCategoriesUpSql,
} from "../../migrations/20260925_140000_district_route_categories.ts";
import {
	developmentModelV2DownSql,
	developmentModelV2UpSql,
} from "../../migrations/20260925_230000_development_model_v2.ts";
import {
	geoTaxonomyV3DownSql,
	geoTaxonomyV3UpSql,
} from "../../migrations/20260927_010000_geo_taxonomy_v3.ts";
import {
	districtMorphologyDownSql,
	districtMorphologyUpSql,
} from "../../migrations/20260927_110000_district_morphology.ts";
import { propertyNumericInvariantsUpSql } from "../../src/core/data-access/system/sql/property-numeric-invariants.ts";
import { assertLocalTestDatabaseUri } from "./env.mjs";

function psql(uri, sql) {
	try {
		return execFileSync(
			"psql",
			["-X", "-v", "ON_ERROR_STOP=1", "-d", uri, "-t", "-A"],
			{
				stdio: "pipe",
				encoding: "utf8",
				input: sql,
				env: { ...process.env, PGPASSWORD: process.env.PGPASSWORD ?? "" },
			},
		).trim();
	} catch (error) {
		const stderr = error.stderr?.toString("utf8")?.trim();
		throw new Error(stderr || "psql command failed");
	}
}

function expectPsqlFailure(uri, sql, expectedPattern) {
	try {
		psql(uri, sql);
	} catch (error) {
		if (!expectedPattern.test(String(error))) throw error;
		return;
	}
	throw new Error(`Expected PostgreSQL failure matching ${expectedPattern}.`);
}

function adminUri(uri) {
	const parsed = new URL(uri);
	parsed.pathname = "/postgres";
	return parsed.toString();
}

function adminUriFrom(uri) {
	return adminUri(uri);
}

export async function prepareIntegrationDatabase(preferredUri) {
	const { database } = assertLocalTestDatabaseUri(preferredUri);
	const admin = adminUriFrom(preferredUri);
	const exists = psql(
		admin,
		`SELECT 1 FROM pg_database WHERE datname = '${database.replace(/'/g, "''")}'`,
	);
	if (!exists) {
		psql(admin, `CREATE DATABASE ${database}`);
	}

	const ownsPublicSchema = psql(
		preferredUri,
		"SELECT pg_get_userbyid(nspowner) = current_user FROM pg_namespace WHERE nspname = 'public'",
	);
	const isSuperuser = psql(
		preferredUri,
		"SELECT current_setting('is_superuser') = 'on'",
	);
	if (ownsPublicSchema === "t" || isSuperuser === "t") {
		psql(preferredUri, "DROP SCHEMA IF EXISTS public CASCADE");
		psql(preferredUri, "CREATE SCHEMA public");
		psql(preferredUri, "GRANT ALL ON SCHEMA public TO PUBLIC");
	} else {
		// PostgreSQL 15+ databases can retain a public schema owned by the bootstrap
		// administrator. The isolated test role still owns every Payload object, so
		// remove only that role's disposable objects without requiring superuser.
		psql(preferredUri, "DROP OWNED BY CURRENT_USER CASCADE");
	}
	return { uri: preferredUri, fromZero: true };
}

export function runPayloadMigrations(env) {
	execFileSync("pnpm", ["exec", "payload", "migrate"], {
		stdio: "pipe",
		env: {
			...env,
			NODE_OPTIONS: [env.NODE_OPTIONS, "--conditions=react-server"]
				.filter(Boolean)
				.join(" "),
		},
		encoding: "utf8",
		shell: process.platform === "win32",
	});
}

export function provePropertyNumericMigration(testUri) {
	const createPreviousTable = `
		CREATE TABLE properties (
			id serial PRIMARY KEY,
			price_minor numeric,
			price_per_meter_minor numeric,
			total_area numeric,
			living_area numeric,
			kitchen_area numeric
		);
	`;

	psql(testUri, createPreviousTable);
	psql(
		testUri,
		"INSERT INTO properties (price_minor, total_area) VALUES (10.5, 42.25)",
	);
	expectPsqlFailure(
		testUri,
		propertyNumericInvariantsUpSql,
		/properties_price_minor_invariant/i,
	);
	const constraintsAfterFailure = psql(
		testUri,
		"SELECT count(*) FROM pg_constraint WHERE conrelid = 'properties'::regclass AND conname LIKE 'properties_%_invariant'",
	);
	if (constraintsAfterFailure !== "0") {
		throw new Error(
			"Failed numeric migration must not leave partial constraints.",
		);
	}

	psql(testUri, "DROP TABLE properties");
	psql(testUri, createPreviousTable);
	psql(
		testUri,
		"INSERT INTO properties (price_minor, price_per_meter_minor, total_area, living_area, kitchen_area) VALUES (123400, 10000, 12.34, 10.25, 2.09)",
	);
	psql(testUri, propertyNumericInvariantsUpSql);
	const preserved = psql(
		testUri,
		"SELECT price_minor || '|' || price_per_meter_minor || '|' || total_area || '|' || living_area || '|' || kitchen_area FROM properties",
	);
	if (preserved !== "123400|10000|12.34|10.25|2.09") {
		throw new Error(
			`Numeric migration changed valid previous data: ${preserved}`,
		);
	}
	expectPsqlFailure(
		testUri,
		"UPDATE properties SET price_minor = 1.5",
		/properties_price_minor_invariant/i,
	);
	expectPsqlFailure(
		testUri,
		"UPDATE properties SET total_area = 1.234",
		/properties_total_area_invariant/i,
	);
}

export function proveLeadDeliveryRelationalMigration(testUri) {
	psql(
		testUri,
		`
		CREATE TABLE leads (id serial PRIMARY KEY);
		CREATE TABLE lead_deliveries (
			id serial PRIMARY KEY,
			lead_id integer,
			CONSTRAINT lead_deliveries_lead_id_leads_id_fk
				FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL
		);
		INSERT INTO leads DEFAULT VALUES;
		INSERT INTO lead_deliveries (lead_id) VALUES (1);
		INSERT INTO lead_deliveries (lead_id) VALUES (NULL);
	`,
	);
	expectPsqlFailure(
		testUri,
		leadDeliveryRelationalContractUpSql,
		/relational retention migration stopped/i,
	);
	const relationAfterFailure = psql(
		testUri,
		"SELECT confdeltype FROM pg_constraint WHERE conname = 'lead_deliveries_lead_id_leads_id_fk'",
	);
	if (relationAfterFailure !== "n") {
		throw new Error("Rejected relational migration changed the previous FK.");
	}

	psql(testUri, "DELETE FROM lead_deliveries WHERE lead_id IS NULL");
	psql(testUri, leadDeliveryRelationalContractUpSql);
	const contract = psql(
		testUri,
		`SELECT constraint_row.confdeltype::text || '|' || column_row.attnotnull::text
		 FROM pg_constraint constraint_row
		 JOIN pg_attribute column_row
		 ON column_row.attrelid = constraint_row.conrelid
		 AND column_row.attnum = ANY (constraint_row.conkey)
		 WHERE constraint_row.conname = 'lead_deliveries_lead_id_leads_id_fk'
		 AND column_row.attname = 'lead_id'`,
	);
	if (contract !== "c|true") {
		throw new Error(
			`Relational migration did not install cascade/not-null: ${contract}`,
		);
	}
	psql(testUri, "DELETE FROM leads WHERE id = 1");
	if (psql(testUri, "SELECT count(*) FROM lead_deliveries") !== "0") {
		throw new Error(
			"Lead delete did not cascade on the previous non-empty fixture.",
		);
	}
}

export function provePayloadAuthSecurityMigration(testUri) {
	psql(
		testUri,
		`
		CREATE TABLE users (
			id serial PRIMARY KEY,
			reset_password_token varchar,
			reset_password_expiration timestamp(3) with time zone
		);
		CREATE TABLE media (id serial PRIMARY KEY);
		CREATE TABLE properties_images (
			id serial PRIMARY KEY,
			media_id integer,
			CONSTRAINT properties_images_media_id_media_id_fk
				FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE set null
		);
	`,
	);
	psql(testUri, payloadAuthSecurityUpSql);
	if (
		psql(
			testUri,
			"SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='reset_password_requested_at'",
		) !== "1"
	) {
		throw new Error(
			"Payload auth migration did not add reset request timestamp.",
		);
	}
	psql(testUri, payloadAuthSecurityDownSql);
	if (
		psql(
			testUri,
			"SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='reset_password_requested_at'",
		) !== "0"
	) {
		throw new Error(
			"Payload auth migration down did not remove the new field.",
		);
	}
	psql(testUri, payloadAuthSecurityUpSql);
}

export function proveSiteSettingsMigration(testUri) {
	psql(
		testUri,
		`CREATE TABLE media (id serial PRIMARY KEY);
		 CREATE TABLE p8_05_migration_sentinel (id integer PRIMARY KEY, note text NOT NULL);
		 INSERT INTO p8_05_migration_sentinel (id, note) VALUES (1, 'preserve-me');`,
	);
	psql(testUri, siteSettingsUpSql);
	if (
		psql(
			testUri,
			"SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('site_settings','site_settings_social_links')",
		) !== "2"
	) {
		throw new Error("Site settings migration did not create both tables.");
	}
	psql(
		testUri,
		"INSERT INTO site_settings (brand_name, phone) VALUES ('Fixture Agency', '+70000000000')",
	);
	psql(testUri, siteSettingsDownSql);
	if (
		psql(
			testUri,
			"SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('site_settings','site_settings_social_links')",
		) !== "0"
	) {
		throw new Error("Site settings migration down did not remove its tables.");
	}
	if (
		psql(testUri, "SELECT note FROM p8_05_migration_sentinel WHERE id = 1") !==
		"preserve-me"
	) {
		throw new Error("Site settings migration down changed unrelated data.");
	}
	psql(testUri, siteSettingsUpSql);
}

export function proveGeoHierarchyMigration(testUri) {
	psql(
		testUri,
		`CREATE TABLE p8_06_migration_sentinel (id integer PRIMARY KEY, note text NOT NULL);
		 CREATE TABLE payload_locked_documents_rels (id serial PRIMARY KEY);
		 INSERT INTO p8_06_migration_sentinel (id, note) VALUES (1, 'preserve-me');`,
	);
	psql(testUri, geoHierarchyUpSql);
	if (
		psql(
			testUri,
			"SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('regions','cities','districts')",
		) !== "3"
	) {
		throw new Error("Geo hierarchy migration did not create all three tables.");
	}
	psql(
		testUri,
		`INSERT INTO regions (slug, title, morphology_nominative, morphology_genitive, morphology_prepositional, short_name, sort_order, status, published_at, updated_at, created_at)
		 VALUES ('primorskiy-kray', 'Fixture Region', 'Fixture Region', 'Fixture Region genitive', 'Fixture Region prepositional', 'Fixture', 10, 'published', now(), now(), now());
		 INSERT INTO cities (slug, title, morphology_nominative, morphology_genitive, morphology_prepositional, preposition, city_type, region_id, morphology_approved, sort_order, status, published_at, updated_at, created_at)
		 VALUES ('primorsk', 'Fixture Primary City', 'Fixture Primary City', 'Fixture Primary City genitive', 'Fixture Primary City prepositional', 'v', 'city', 1, true, 10, 'published', now(), now(), now());
		 INSERT INTO cities (slug, title, morphology_nominative, morphology_genitive, morphology_prepositional, preposition, city_type, region_id, agglomeration_of_id, morphology_approved, sort_order, status, published_at, updated_at, created_at)
		 VALUES ('zarechnyy', 'Fixture Nearby City', 'Fixture Nearby City', 'Fixture Nearby City genitive', 'Fixture Nearby City prepositional', 'v', 'city', 1, 1, true, 20, 'published', now(), now(), now());
		 INSERT INTO districts (slug, title, morphology_nominative, morphology_genitive, morphology_prepositional, district_type, city_id, preposition, morphology_approved, sort_order, status, published_at, updated_at, created_at)
		 VALUES ('severnyy', 'Fixture District', 'Fixture District', 'Fixture District genitive', 'Fixture District prepositional', 'microdistrict', 1, 'na', true, 10, 'published', now(), now(), now());
		 INSERT INTO districts (slug, title, morphology_nominative, morphology_genitive, morphology_prepositional, district_type, city_id, parent_id, preposition, morphology_approved, sort_order, status, updated_at, created_at)
		 VALUES ('yuzhnyy', 'Fixture Child District', 'Fixture Child District', 'Fixture Child District genitive', 'Fixture Child District prepositional', 'administrative', 1, 1, 'v', true, 20, 'draft', now(), now());`,
	);
	expectPsqlFailure(
		testUri,
		"INSERT INTO regions (slug,title,morphology_nominative,morphology_genitive,morphology_prepositional,short_name,sort_order,status,updated_at,created_at) VALUES ('primorsk','Collision','Collision','Collision','Collision','Collision',0,'draft',now(),now())",
		/already owned by a city/i,
	);
	expectPsqlFailure(
		testUri,
		"INSERT INTO cities (slug,title,morphology_nominative,morphology_genitive,morphology_prepositional,preposition,city_type,region_id,morphology_approved,sort_order,status,updated_at,created_at) VALUES ('novostroyki','Reserved','Reserved','Reserved','Reserved','v','city',1,true,0,'draft',now(),now())",
		/reserved namespace/i,
	);
	expectPsqlFailure(
		testUri,
		"INSERT INTO districts (slug,title,morphology_nominative,morphology_genitive,morphology_prepositional,district_type,city_id,preposition,morphology_approved,sort_order,status,updated_at,created_at) VALUES ('severnyy','Duplicate','Duplicate','Duplicate','Duplicate','microdistrict',1,'na',true,0,'draft',now(),now())",
		/districts_city_slug_unique_idx/i,
	);
	expectPsqlFailure(
		testUri,
		"INSERT INTO districts (slug,title,morphology_nominative,morphology_genitive,morphology_prepositional,district_type,city_id,preposition,morphology_approved,sort_order,status,updated_at,created_at) VALUES ('dvukhkomnatnye','Facet collision','Facet collision','Facet collision','Facet collision','microdistrict',1,'na',true,0,'draft',now(),now())",
		/reserved facet namespace/i,
	);
	expectPsqlFailure(
		testUri,
		"UPDATE cities SET agglomeration_of_id = 2 WHERE id = 1",
		/agglomeration hierarchy contains a cycle/i,
	);
	expectPsqlFailure(
		testUri,
		"UPDATE cities SET slug = 'primorsk-renamed' WHERE id = 1",
		/published geo slug is immutable/i,
	);
	expectPsqlFailure(
		testUri,
		"UPDATE districts SET parent_id = 2 WHERE id = 1",
		/district hierarchy contains a cycle/i,
	);
	psql(testUri, geoHierarchyDownSql);
	if (
		psql(
			testUri,
			"SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('regions','cities','districts')",
		) !== "0"
	) {
		throw new Error("Geo hierarchy down migration left geo tables behind.");
	}
	if (
		psql(testUri, "SELECT note FROM p8_06_migration_sentinel WHERE id = 1") !==
		"preserve-me"
	) {
		throw new Error("Geo hierarchy down migration changed unrelated data.");
	}
	psql(testUri, geoHierarchyUpSql);
}

export function provePropertyGeoRefsMigration(testUri) {
	psql(
		testUri,
		`CREATE TABLE regions (id serial PRIMARY KEY);
		 CREATE TABLE cities (id serial PRIMARY KEY);
		 CREATE TABLE districts (id serial PRIMARY KEY);
		 CREATE TABLE properties (id serial PRIMARY KEY, region varchar, locality varchar, district varchar);
		 CREATE TABLE p8_07_migration_sentinel (id integer PRIMARY KEY, note text NOT NULL);
		 INSERT INTO regions DEFAULT VALUES;
		 INSERT INTO cities DEFAULT VALUES;
		 INSERT INTO districts DEFAULT VALUES;
		 INSERT INTO properties (region, locality, district) VALUES ('raw-region', 'raw-city', 'raw-district');
		 INSERT INTO p8_07_migration_sentinel (id, note) VALUES (1, 'preserve-me');`,
	);
	psql(testUri, propertyGeoRefsUpSql);
	psql(
		testUri,
		"UPDATE properties SET region_ref_id=1, city_ref_id=1, district_ref_id=1 WHERE id=1",
	);
	psql(testUri, propertyGeoRefsDownSql);
	if (
		psql(
			testUri,
			"SELECT region || '|' || locality || '|' || district FROM properties WHERE id=1",
		) !== "raw-region|raw-city|raw-district"
	) {
		throw new Error("Property geo refs down migration changed legacy raw geo.");
	}
	if (
		psql(testUri, "SELECT note FROM p8_07_migration_sentinel WHERE id=1") !==
		"preserve-me"
	) {
		throw new Error("Property geo refs down migration changed unrelated data.");
	}
	psql(testUri, propertyGeoRefsUpSql);
}

export function provePropertyIdentityMigration(testUri) {
	psql(
		testUri,
		`CREATE TYPE enum_properties_category AS ENUM ('apartment', 'house', 'land', 'commercial');
		 CREATE TABLE properties (id serial PRIMARY KEY, slug varchar NOT NULL);
		 INSERT INTO properties (slug) VALUES ('existing-a'), ('existing-b');`,
	);
	psql(testUri, propertyIdentityUpSql);
	const existingIds = psql(
		testUri,
		"SELECT string_agg(public_url_id::text, ',' ORDER BY id) FROM properties",
	);
	if (existingIds !== "1,2") {
		throw new Error(
			`Identity migration did not deterministically retain assigned IDs: ${existingIds}`,
		);
	}
	psql(testUri, "INSERT INTO properties (slug) VALUES ('new-c'), ('new-d')");
	if (
		psql(testUri, "SELECT count(DISTINCT public_url_id) FROM properties") !==
		"4"
	) {
		throw new Error("Identity sequence reused a public URL ID.");
	}
	expectPsqlFailure(
		testUri,
		"UPDATE properties SET public_url_id = 999 WHERE slug = 'existing-a'",
		/immutable/i,
	);
	if (
		psql(
			testUri,
			"SELECT public_url_id FROM properties WHERE slug='existing-a'",
		) !== "1"
	) {
		throw new Error("Rejected identity update changed an assigned ID.");
	}
}

export function proveDevelopmentsMigration(testUri) {
	psql(
		testUri,
		`CREATE TABLE media (id serial PRIMARY KEY);
		 CREATE TABLE regions (id serial PRIMARY KEY);
		 CREATE TABLE cities (id serial PRIMARY KEY);
		 CREATE TABLE districts (id serial PRIMARY KEY);
		 CREATE TABLE properties (id serial PRIMARY KEY);
		 CREATE TABLE payload_locked_documents_rels (id serial PRIMARY KEY);
		 CREATE TABLE p8_09_migration_sentinel (id integer PRIMARY KEY, note text NOT NULL);
		 INSERT INTO media DEFAULT VALUES;
		 INSERT INTO regions DEFAULT VALUES;
		 INSERT INTO cities DEFAULT VALUES;
		 INSERT INTO districts DEFAULT VALUES;
		 INSERT INTO properties DEFAULT VALUES;
		 INSERT INTO p8_09_migration_sentinel VALUES (1, 'preserve-me');`,
	);
	psql(testUri, developmentsUpSql);
	psql(
		testUri,
		`INSERT INTO developers (name, slug, source, checked_at) VALUES ('Fixture Developer', 'fixture-developer', 'fixture', now());
		 INSERT INTO developments (name, slug, kind, region_id, city_id, developer_id, source, checked_at)
		 VALUES ('Fixture RC', 'fixture', 'residential_complex', 1, 1, 1, 'fixture', now());
		 INSERT INTO developments (name, slug, kind, region_id, city_id, developer_id, source, checked_at, plots_count)
		 VALUES ('Fixture Village', 'fixture-village', 'cottage_village', 1, 1, 1, 'fixture', now(), 12);
		 UPDATE properties SET development_id=1 WHERE id=1;`,
	);
	expectPsqlFailure(
		testUri,
		`INSERT INTO developments (name, slug, kind, region_id, city_id, developer_id, source, checked_at, plots_count)
		 VALUES ('Polluted RC', 'polluted', 'residential_complex', 1, 1, 1, 'fixture', now(), 5)`,
		/developments_kind_fields_guard/i,
	);
	psql(testUri, developmentsDownSql);
	if (
		psql(testUri, "SELECT note FROM p8_09_migration_sentinel WHERE id=1") !==
		"preserve-me"
	) {
		throw new Error("Developments down migration changed unrelated data.");
	}
	if (
		psql(
			testUri,
			"SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('developers','developments')",
		) !== "0"
	) {
		throw new Error("Developments down migration left domain tables behind.");
	}
	psql(testUri, developmentsUpSql);
	psql(
		testUri,
		`INSERT INTO developers (name, slug, source, checked_at) VALUES ('Upgrade Developer', 'upgrade-developer', 'fixture', now());
		 INSERT INTO developments (name, slug, kind, region_id, city_id, developer_id, source, checked_at, sales_status, availability)
		 VALUES
		   ('Upgrade Available', 'upgrade-available', 'residential_complex', 1, 1, 1, 'fixture', now(), 'available', 'legacy'),
		   ('Upgrade Limited', 'upgrade-limited', 'residential_complex', 1, 1, 1, 'fixture', now(), 'limited', 'legacy'),
		   ('Upgrade Sold Out', 'upgrade-sold-out', 'residential_complex', 1, 1, 1, 'fixture', now(), 'sold_out', 'legacy'),
		   ('Upgrade Paused', 'upgrade-paused', 'residential_complex', 1, 1, 1, 'fixture', now(), 'paused', 'legacy');
		 INSERT INTO developments_prices (_order, _parent_id, id, label, amount_minor, currency, source, checked_at)
		 VALUES (1, 1, 'legacy-price', '2-room', 900000000, 'RUB', 'fixture', now());
		 INSERT INTO developments_media_items (_order, _parent_id, id, media_id, media_type, rights, source, checked_at)
		 VALUES (1, 1, 'legacy-media', 1, 'image', 'fixture-rights', 'fixture', now());`,
	);
	psql(testUri, developmentModelV2UpSql);
	if (
		psql(
			testUri,
			`SELECT count(*) FROM developments WHERE
			  (slug='upgrade-available' AND sales_status='on_sale' AND sales_availability='confirmed') OR
			  (slug='upgrade-limited' AND sales_status='on_sale' AND sales_availability='in_inventory') OR
			  (slug='upgrade-sold-out' AND sales_status='sales_finished' AND sales_availability='none') OR
			  (slug='upgrade-paused' AND sales_status='sales_finished' AND sales_availability='none')`,
		) !== "4"
	) {
		throw new Error(
			"Development v2 migration did not map legacy sales values.",
		);
	}
	if (
		psql(
			testUri,
			"SELECT rooms_label || ':' || price_from_minor::text || ':' || price_to_minor::text FROM developments_price_by_rooms WHERE id='legacy-price'",
		) !== "2-room:900000000:900000000"
	) {
		throw new Error("Development v2 migration did not preserve legacy prices.");
	}
	if (
		psql(
			testUri,
			"SELECT media_type::text FROM developments_media_items WHERE id='legacy-media'",
		) !== "gallery"
	) {
		throw new Error("Development v2 migration did not map legacy media types.");
	}
	if (
		Number(
			psql(
				testUri,
				"SELECT completeness_score FROM developments WHERE slug='upgrade-available'",
			),
		) <= 0
	) {
		throw new Error(
			"Development v2 migration did not compute completenessScore.",
		);
	}
	psql(testUri, developmentModelV2DownSql);
	if (
		psql(
			testUri,
			"SELECT sales_status::text FROM developments WHERE slug='upgrade-available'",
		) !== "available"
	) {
		throw new Error(
			"Development v2 down migration did not apply the documented fallback mapping.",
		);
	}
	psql(testUri, developmentModelV2UpSql);
}

export function proveLeadContextMigration(testUri) {
	psql(
		testUri,
		`CREATE TYPE enum_leads_form_kind AS ENUM ('property_request', 'callback', 'consultation', 'generic');
		 CREATE TABLE leads (id serial PRIMARY KEY, form_kind enum_leads_form_kind NOT NULL);
		 CREATE TABLE p8_19_migration_sentinel (id integer PRIMARY KEY, note text NOT NULL);
		 INSERT INTO leads (form_kind) VALUES ('callback');
		 INSERT INTO p8_19_migration_sentinel VALUES (1, 'preserve-me');`,
	);
	psql(testUri, leadContextUpSql);
	if (
		psql(
			testUri,
			"SELECT count(*) FROM information_schema.columns WHERE table_name='leads' AND column_name LIKE 'context_%'",
		) !== "6"
	) {
		throw new Error("Lead context migration did not add all context columns.");
	}
	psql(testUri, leadContextDownSql);
	if (
		psql(testUri, "SELECT note FROM p8_19_migration_sentinel WHERE id=1") !==
		"preserve-me"
	) {
		throw new Error("Lead context down migration changed unrelated data.");
	}
	psql(testUri, leadContextUpSql);
	psql(
		testUri,
		"INSERT INTO leads (form_kind, context_geo) VALUES ('legal', 'rostov-na-donu')",
	);
	expectPsqlFailure(
		testUri,
		leadContextDownSql,
		/extended lead context exists/i,
	);
	if (
		psql(testUri, "SELECT count(*) FROM leads WHERE form_kind='legal'") !== "1"
	) {
		throw new Error(
			"Rejected lead context down migration changed retained leads.",
		);
	}
}

export function proveDistrictRouteCategoriesMigration(testUri) {
	psql(
		testUri,
		`CREATE TABLE districts (id serial PRIMARY KEY, slug varchar NOT NULL);
		 CREATE TABLE p9_s2_migration_sentinel (id integer PRIMARY KEY, note text NOT NULL);
		 CREATE OR REPLACE FUNCTION district_slug_guard() RETURNS trigger AS $$
		 BEGIN RETURN NEW; END;
		 $$ LANGUAGE plpgsql;
		 CREATE TRIGGER districts_slug_guard BEFORE INSERT OR UPDATE OF slug ON districts
		 FOR EACH ROW EXECUTE FUNCTION district_slug_guard();
		 INSERT INTO districts (slug) VALUES ('severnyy'), ('tsentralnyy');
		 INSERT INTO p9_s2_migration_sentinel VALUES (1, 'preserve-me');`,
	);
	psql(testUri, districtRouteCategoriesUpSql);
	if (psql(testUri, "SELECT count(*) FROM districts_categories") !== "18") {
		throw new Error(
			"District category migration did not backfill all existing rows.",
		);
	}
	expectPsqlFailure(
		testUri,
		"INSERT INTO districts_categories (\"order\", parent_id, value) VALUES (0, 1, 'kvartiry')",
		/districts_categories_parent_value_unique_idx/i,
	);
	expectPsqlFailure(
		testUri,
		"INSERT INTO districts (slug) VALUES ('api')",
		/reserved public subslug/i,
	);
	psql(testUri, districtRouteCategoriesDownSql);
	if (
		psql(testUri, "SELECT note FROM p9_s2_migration_sentinel WHERE id=1") !==
		"preserve-me"
	) {
		throw new Error("District category down migration changed unrelated data.");
	}
	if (
		psql(
			testUri,
			"SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='districts_categories'",
		) !== "0"
	) {
		throw new Error(
			"District category down migration left its join table behind.",
		);
	}
	psql(testUri, districtRouteCategoriesUpSql);
}

export function proveGeoTaxonomyV3Migration(testUri) {
	psql(
		testUri,
		`CREATE TYPE enum_cities_preposition AS ENUM('v', 'na');
		 CREATE TYPE enum_districts_district_type AS ENUM('administrative', 'microdistrict');
		 CREATE TYPE enum_districts_preposition AS ENUM('v', 'na');
		 CREATE TABLE cities (id serial PRIMARY KEY, preposition enum_cities_preposition NOT NULL);
		 CREATE TABLE districts (id serial PRIMARY KEY, district_type enum_districts_district_type NOT NULL, preposition enum_districts_preposition NOT NULL);
		 INSERT INTO cities (preposition) VALUES ('v');
		 INSERT INTO districts (district_type, preposition) VALUES ('administrative', 'v');`,
	);
	psql(testUri, geoTaxonomyV3UpSql);
	if (
		psql(
			testUri,
			"SELECT district_type::text || ':' || preposition::text FROM districts WHERE id=1",
		) !== "admin_district:v"
	) {
		throw new Error(
			"Geo taxonomy v3 did not migrate the non-empty district fixture.",
		);
	}
	psql(
		testUri,
		"INSERT INTO cities (preposition) VALUES ('vo'); INSERT INTO districts (district_type, preposition) VALUES ('microdistrict', 'vo');",
	);
	psql(testUri, geoTaxonomyV3DownSql);
	if (
		psql(
			testUri,
			"SELECT string_agg(preposition::text, ',' ORDER BY id) FROM cities",
		) !== "v,v"
	) {
		throw new Error("Geo taxonomy v3 down did not map vo back to v.");
	}
	psql(testUri, geoTaxonomyV3UpSql);
}

export function proveDistrictMorphologyMigration(testUri) {
	const previousSchema = `
		CREATE TYPE enum_districts_district_type AS ENUM('admin_district', 'microdistrict');
		CREATE TABLE cities (id serial PRIMARY KEY, slug varchar NOT NULL UNIQUE);
		CREATE TABLE districts (
			id serial PRIMARY KEY,
			city_id integer NOT NULL REFERENCES cities(id),
			slug varchar NOT NULL,
			district_type enum_districts_district_type NOT NULL,
			morphology_genitive varchar NOT NULL,
			morphology_prepositional varchar NOT NULL,
			preposition varchar NOT NULL
		);`;
	psql(testUri, previousSchema);
	psql(testUri, districtMorphologyUpSql);
	if (
		psql(
			testUri,
			"SELECT count(*) FROM information_schema.columns WHERE table_name='districts' AND column_name IN ('adj_locative','adj_genitive','locative')",
		) !== "3"
	) {
		throw new Error("Clean district morphology migration missed new columns.");
	}
	psql(testUri, districtMorphologyDownSql);
	psql(
		testUri,
		`INSERT INTO cities (slug) VALUES ('primorsk'), ('zarechnyy'), ('rostov-na-donu');
		 INSERT INTO districts (city_id, slug, district_type, morphology_genitive, morphology_prepositional, preposition)
		 SELECT city.id, fixture.slug, fixture.kind::enum_districts_district_type,
		   fixture.genitive, fixture.prepositional, fixture.preposition
		 FROM cities city
		 JOIN (VALUES
		   ('primorsk', 'yuzhnyy', 'admin_district', 'Южного района', 'Южном районе', 'v'),
		   ('primorsk', 'severnyy', 'microdistrict', 'Северного района', 'Северном районе', 'na'),
		   ('zarechnyy', 'tsentralnyy', 'admin_district', 'Центрального района', 'Центральном районе', 'v'),
		   ('rostov-na-donu', 'leninskiy', 'admin_district', 'Ленинского', 'Ленинском', 'v'),
		   ('rostov-na-donu', 'voroshilovskiy', 'admin_district', 'Ворошиловского', 'Ворошиловском', 'v'),
		   ('rostov-na-donu', 'tsentr', 'microdistrict', 'Центра', 'Центре', 'v')
		 ) AS fixture(city_slug, slug, kind, genitive, prepositional, preposition)
		 ON fixture.city_slug = city.slug;`,
	);
	psql(testUri, districtMorphologyUpSql);
	const mapped = psql(
		testUri,
		`SELECT string_agg(
		  city.slug || '/' || district.slug || ':' ||
		  coalesce(district.adj_locative, district.locative) || ':' ||
		  coalesce(district.adj_genitive, '-'),
		  ',' ORDER BY city.slug, district.slug)
		 FROM districts district JOIN cities city ON city.id=district.city_id`,
	);
	if (
		mapped !==
		"primorsk/severnyy:Северном районе:-,primorsk/yuzhnyy:Южном:Южного,rostov-na-donu/leninskiy:Ленинском:Ленинского,rostov-na-donu/tsentr:Центре:-,rostov-na-donu/voroshilovskiy:Ворошиловском:Ворошиловского,zarechnyy/tsentralnyy:Центральном:Центрального"
	) {
		throw new Error(
			`District morphology migration mapped unexpected data: ${mapped}`,
		);
	}
	psql(testUri, districtMorphologyDownSql);
	psql(
		testUri,
		`INSERT INTO districts (city_id, slug, district_type, morphology_genitive, morphology_prepositional, preposition)
		 SELECT id, 'unknown-admin', 'admin_district', 'Unknown', 'Unknown', 'v'
		 FROM cities WHERE slug='primorsk';`,
	);
	expectPsqlFailure(
		testUri,
		`BEGIN;\n${districtMorphologyUpSql}\nCOMMIT;`,
		/explicit admin district mapping/i,
	);
	if (
		psql(
			testUri,
			"SELECT count(*) FROM information_schema.columns WHERE table_name='districts' AND column_name='adj_locative'",
		) !== "0"
	) {
		throw new Error(
			"Rejected district morphology migration left partial schema.",
		);
	}
}

export function psqlOnTest(testUri, sql) {
	return psql(testUri, sql);
}
