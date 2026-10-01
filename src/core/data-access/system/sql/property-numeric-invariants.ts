export const propertyNumericInvariantsUpSql = `
ALTER TABLE "properties"
	ADD CONSTRAINT "properties_price_minor_invariant"
	CHECK (
		"price_minor" IS NULL OR (
			"price_minor" >= 0
			AND "price_minor" <= 9007199254740991
			AND trunc("price_minor") = "price_minor"
		)
	),
	ADD CONSTRAINT "properties_price_per_meter_minor_invariant"
	CHECK (
		"price_per_meter_minor" IS NULL OR (
			"price_per_meter_minor" >= 0
			AND "price_per_meter_minor" <= 9007199254740991
			AND trunc("price_per_meter_minor") = "price_per_meter_minor"
		)
	),
	ADD CONSTRAINT "properties_total_area_invariant"
	CHECK (
		"total_area" IS NULL OR (
			"total_area" >= 0
			AND "total_area" <= 99999999.99
			AND trunc("total_area" * 100) = "total_area" * 100
		)
	),
	ADD CONSTRAINT "properties_living_area_invariant"
	CHECK (
		"living_area" IS NULL OR (
			"living_area" >= 0
			AND "living_area" <= 99999999.99
			AND trunc("living_area" * 100) = "living_area" * 100
		)
	),
	ADD CONSTRAINT "properties_kitchen_area_invariant"
	CHECK (
		"kitchen_area" IS NULL OR (
			"kitchen_area" >= 0
			AND "kitchen_area" <= 99999999.99
			AND trunc("kitchen_area" * 100) = "kitchen_area" * 100
		)
	);
`;

export const propertyNumericInvariantsDownSql = `
ALTER TABLE "properties"
	DROP CONSTRAINT IF EXISTS "properties_kitchen_area_invariant",
	DROP CONSTRAINT IF EXISTS "properties_living_area_invariant",
	DROP CONSTRAINT IF EXISTS "properties_total_area_invariant",
	DROP CONSTRAINT IF EXISTS "properties_price_per_meter_minor_invariant",
	DROP CONSTRAINT IF EXISTS "properties_price_minor_invariant";
`;
