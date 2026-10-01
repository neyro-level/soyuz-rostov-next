export type PropertyDerivedInput = {
	priceMinor?: number | null;
	totalArea?: number | null;
};

export type PropertyDerivedFields = {
	pricePerMeterMinor: number | null;
};

const maxSafeMinor = Number.MAX_SAFE_INTEGER;

export function bankersRoundToInteger(value: number): number {
	if (!Number.isFinite(value)) {
		throw new Error("bankersRoundToInteger requires a finite number.");
	}
	const floor = Math.floor(value);
	const fraction = value - floor;
	if (fraction > 0.5) return floor + 1;
	if (fraction < 0.5) return floor;
	return floor % 2 === 0 ? floor : floor + 1;
}

export function calculatePropertyDerivedFields({
	priceMinor,
	totalArea,
}: PropertyDerivedInput): PropertyDerivedFields {
	if (
		priceMinor == null ||
		totalArea == null ||
		!Number.isFinite(priceMinor) ||
		!Number.isFinite(totalArea) ||
		priceMinor < 0 ||
		totalArea <= 0
	) {
		return { pricePerMeterMinor: null };
	}

	const perMeter = bankersRoundToInteger(priceMinor / totalArea);
	if (!Number.isSafeInteger(perMeter) || perMeter < 0 || perMeter > maxSafeMinor) {
		return { pricePerMeterMinor: null };
	}

	return { pricePerMeterMinor: perMeter };
}

export function applyDerivedFieldsOnWrite(input: {
	origin?: string | null;
	ingestOwned: boolean;
	priceMinor?: number | null;
	totalArea?: number | null;
}): PropertyDerivedFields | null {
	if (input.ingestOwned) {
		return null;
	}
	return calculatePropertyDerivedFields({
		priceMinor: input.priceMinor,
		totalArea: input.totalArea,
	});
}
