const numberFormatter = new Intl.NumberFormat("ru-RU", {
	maximumFractionDigits: 1,
});
const integerFormatter = new Intl.NumberFormat("ru-RU", {
	maximumFractionDigits: 0,
});
const rubleFormatter = new Intl.NumberFormat("ru-RU", {
	style: "currency",
	currency: "RUB",
	maximumFractionDigits: 0,
});

export function formatRealtyNumber(value: number) {
	return numberFormatter.format(value);
}

export function formatRublePrice(
	value: number | null | undefined,
	fallback = "Цена по запросу",
) {
	return value === null || value === undefined
		? fallback
		: rubleFormatter.format(value);
}

export function formatCompactRublePrice(
	value: number | null | undefined,
	fallback = "Цена уточняется",
) {
	if (value === null || value === undefined) return fallback;
	if (Math.abs(value) >= 1_000_000)
		return `${numberFormatter.format(value / 1_000_000)} млн ₽`;
	return `${integerFormatter.format(value)} ₽`;
}

export function formatArea(
	value: number | null | undefined,
	fallback = "не указана",
) {
	return value === null || value === undefined
		? fallback
		: `${numberFormatter.format(value)} м²`;
}

export function pluralizeRussian(
	count: number,
	forms: readonly [string, string, string],
) {
	const absolute = Math.abs(Math.trunc(count));
	const lastTwo = absolute % 100;
	const last = absolute % 10;
	if (lastTwo >= 11 && lastTwo <= 14) return forms[2];
	if (last === 1) return forms[0];
	if (last >= 2 && last <= 4) return forms[1];
	return forms[2];
}

export function formatRussianCount(
	count: number,
	forms: readonly [string, string, string],
) {
	return `${integerFormatter.format(count)} ${pluralizeRussian(count, forms)}`;
}

export function formatFloorLabel(
	value: string | null | undefined,
	fallback = "Уточняется",
) {
	if (!value) return fallback;
	if (/этаж/i.test(value)) return value;
	const numbers = value.match(/\d+/g);
	const lastNumber = Number(numbers?.at(-1) ?? 0);
	return `${value} ${pluralizeRussian(lastNumber, ["этаж", "этажа", "этажей"])}`;
}
