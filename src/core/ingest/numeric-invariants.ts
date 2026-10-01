const maxSafeMinor = Number.MAX_SAFE_INTEGER;
const maxAreaM2 = 99_999_999.99;
const areaFields = ["totalArea", "livingArea", "kitchenArea"] as const;
const moneyFields = ["priceMinor", "pricePerMeterMinor"] as const;

export type AreaPrecisionPolicy = "reject" | "round";

export function requireMoneyMinor(
	value: number | null | undefined,
	field = "moneyMinor",
): number | null | undefined {
	if (value == null) return value;
	if (!Number.isSafeInteger(value) || value < 0 || value > maxSafeMinor) {
		throw new Error(
			`${field} must be a non-negative safe integer in minor units.`,
		);
	}
	return value;
}

export function normalizeAreaM2(
	value: number | null | undefined,
	policy: AreaPrecisionPolicy = "reject",
	field = "areaM2",
): number | null | undefined {
	if (value == null) return value;
	if (!Number.isFinite(value) || value < 0 || value > maxAreaM2) {
		throw new Error(
			`${field} must be between 0 and ${maxAreaM2} square meters.`,
		);
	}

	const normalized = Number(value.toFixed(2));
	const tolerance = Number.EPSILON * Math.max(1, Math.abs(value)) * 4;
	if (policy === "reject" && Math.abs(value - normalized) > tolerance) {
		throw new Error(`${field} must have at most two decimal places.`);
	}
	return normalized;
}

export function normalizePropertyNumericWrite(
	data: Record<string, unknown>,
): void {
	for (const field of moneyFields) {
		if (field in data) {
			data[field] = requireMoneyMinor(
				data[field] as number | null | undefined,
				field,
			);
		}
	}
	for (const field of areaFields) {
		if (field in data) {
			data[field] = normalizeAreaM2(
				data[field] as number | null | undefined,
				"reject",
				field,
			);
		}
	}
}
