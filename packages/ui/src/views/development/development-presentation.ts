import type { DevelopmentDetailsDTO } from "@ams/realtbase-contracts";

export const DEVELOPMENT_PRICE_FRESHNESS_MS = 45 * 86_400_000;

export function developmentSalesEnded(
	development: DevelopmentDetailsDTO,
): boolean {
	return development.salesStatus === "sales_finished";
}

export function developmentPricesForPresentation(
	development: DevelopmentDetailsDTO,
	referenceDate: string | number = Date.now(),
) {
	if (developmentSalesEnded(development)) return [];
	const referenceTime =
		typeof referenceDate === "number"
			? referenceDate
			: Date.parse(referenceDate);
	if (!Number.isFinite(referenceTime)) return [];
	return development.priceByRooms.filter((row) => {
		const checkedAt = Date.parse(row.priceCheckedAt);
		return (
			Number.isFinite(checkedAt) &&
			checkedAt <= referenceTime &&
			referenceTime - checkedAt <= DEVELOPMENT_PRICE_FRESHNESS_MS
		);
	});
}
