import type {
	BreadcrumbDTO,
	DevelopmentDetailsDTO,
	HomePageDTO,
	NapDTO,
	PropertyDetailsDTO,
	PropertyListDTO,
} from "@ams/realtbase-contracts";
import { siteProfile } from "../site-profile.ts";
import { absoluteUrl } from "./site.ts";

export type JsonLd = Record<string, unknown>;

export function buildOrganizationJsonLd(nap: NapDTO): JsonLd {
	const organization: JsonLd = {
		"@context": "https://schema.org",
		"@type": "RealEstateAgent",
		name: nap.brandName,
		url: absoluteUrl("/"),
		telephone: nap.phone.label,
	};
	if (nap.legalName) organization.legalName = nap.legalName;
	if (nap.email) organization.email = nap.email.label;
	if (nap.address) organization.address = nap.address;
	if (nap.coordinates) {
		organization.geo = {
			"@type": "GeoCoordinates",
			latitude: nap.coordinates.latitude,
			longitude: nap.coordinates.longitude,
		};
	}
	const sameAs = nap.socialLinks.map((link) => link.href);
	if (sameAs.length) organization.sameAs = sameAs;
	return organization;
}

export function buildWebsiteJsonLd(home: HomePageDTO, nap: NapDTO): JsonLd {
	return {
		"@context": "https://schema.org",
		"@type": "WebSite",
		name: nap.brandName,
		url: absoluteUrl("/"),
		description: home.seo.description,
	};
}

export function buildCatalogItemListJsonLd(list: PropertyListDTO): JsonLd {
	return {
		"@context": "https://schema.org",
		"@type": "ItemList",
		itemListElement: list.items.map((item, index) => ({
			"@type": "ListItem",
			position: index + 1,
			url: absoluteUrl(item.href),
			name: item.title,
		})),
	};
}

export function buildPropertyJsonLd(property: PropertyDetailsDTO): JsonLd {
	const offer: JsonLd = {
		"@context": "https://schema.org",
		"@type": "Offer",
		url: absoluteUrl(property.href),
		name: property.title,
		description: property.description,
		itemOffered: {
			"@type": "Residence",
			name: property.title,
			address: property.address,
		},
	};
	if (property.price) {
		offer.price = property.price.priceMinor / 100;
		offer.priceCurrency = property.price.currency;
	}
	const area = property.summary.find((item) => item.key === "area")?.value;
	if (area) (offer.itemOffered as JsonLd).floorSize = area;
	return offer;
}

function freshDevelopmentPrices(development: DevelopmentDetailsDTO, now: Date) {
	const maximumAge = siteProfile.gate.priceStaleDays * 86_400_000;
	return development.priceByRooms.filter((row) => {
		const checkedAt = new Date(row.priceCheckedAt).getTime();
		return (
			Number.isFinite(checkedAt) &&
			checkedAt <= now.getTime() &&
			now.getTime() - checkedAt <= maximumAge
		);
	});
}

export function buildDevelopmentJsonLd(
	development: DevelopmentDetailsDTO,
	now = new Date(),
): JsonLd {
	const prices = freshDevelopmentPrices(development, now);
	const complex: JsonLd = {
		"@context": "https://schema.org",
		"@type": "ApartmentComplex",
		name: development.name,
		url: absoluteUrl(development.href),
		address: development.address ?? development.cityName,
	};
	if (development.description) complex.description = development.description;
	if (development.coordinates) {
		complex.geo = {
			"@type": "GeoCoordinates",
			latitude: development.coordinates.latitude,
			longitude: development.coordinates.longitude,
		};
	}
	if (prices.length) {
		const values = prices.flatMap((row) => [
			row.priceFrom.priceMinor / 100,
			...(row.priceTo ? [row.priceTo.priceMinor / 100] : []),
		]);
		complex.offers = {
			"@type": "AggregateOffer",
			priceCurrency: "RUB",
			lowPrice: Math.min(...values),
			highPrice: Math.max(...values),
			offerCount: prices.reduce(
				(total, row) => total + (row.lotsAvailable ?? 1),
				0,
			),
		};
	}
	return complex;
}

export function buildFaqJsonLd(
	visibleItems: readonly { question: string; answer: string }[],
): JsonLd | null {
	if (!visibleItems.length) return null;
	return {
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: visibleItems.map((item) => ({
			"@type": "Question",
			name: item.question,
			acceptedAnswer: { "@type": "Answer", text: item.answer },
		})),
	};
}

export function buildBreadcrumbJsonLd(
	items: BreadcrumbDTO["items"],
	currentPath: string,
): JsonLd {
	return {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: items.map((item, index) => ({
			"@type": "ListItem",
			position: index + 1,
			name: item.label,
			item: absoluteUrl(item.href ?? currentPath),
		})),
	};
}
