import "server-only";

import type { NapDTO } from "@ams/realtbase-contracts";
import type { Payload } from "payload";
import { fixtureSiteSettingsData } from "@/fixture/site-settings";
import { publicGatewayReadAccess } from "./access-mode.ts";

type SiteSettingsRecord = {
	brandName?: string | null;
	legalName?: string | null;
	logo?:
		| number
		| {
				url?: string | null;
				alt?: string | null;
				width?: number | null;
				height?: number | null;
		  }
		| null;
	phone?: string | null;
	email?: string | null;
	address?: string | null;
	workingHours?: string | null;
	telegram?: string | null;
	whatsapp?: string | null;
	socialLinks?: { label: string; url: string }[] | null;
	requisites?: {
		inn?: string | null;
		kpp?: string | null;
		ogrn?: string | null;
		legalAddress?: string | null;
	} | null;
	coordinates?: { latitude?: number | null; longitude?: number | null } | null;
};

function optional(value?: string | null) {
	const normalized = value?.trim();
	return normalized ? normalized : undefined;
}

function required(value: string | null | undefined, fallback: string): string {
	return optional(value) ?? fallback;
}

function phoneHref(phone: string): `tel:${string}` {
	const normalized = phone.trim().replace(/[^+\d]/g, "");
	return `tel:${normalized}`;
}

export function toNapDTO(settings: SiteSettingsRecord): NapDTO {
	const brandName = required(
		settings.brandName,
		fixtureSiteSettingsData.brandName,
	);
	const phoneLabel = required(settings.phone, fixtureSiteSettingsData.phone);
	const email = optional(settings.email);
	const legalName = optional(settings.legalName);
	const address = optional(settings.address);
	const workingHours = optional(settings.workingHours);
	const telegram = optional(settings.telegram);
	const whatsapp = optional(settings.whatsapp);
	const coordinates = settings.coordinates;
	const latitude = coordinates?.latitude;
	const longitude = coordinates?.longitude;
	const requisites = settings.requisites
		? {
				inn: optional(settings.requisites.inn),
				kpp: optional(settings.requisites.kpp),
				ogrn: optional(settings.requisites.ogrn),
				legalAddress: optional(settings.requisites.legalAddress),
			}
		: undefined;
	const hasRequisites =
		requisites &&
		Object.values(requisites).some((value) => value !== undefined);
	const logo =
		typeof settings.logo === "object" && settings.logo?.url
			? {
					kind: "managed" as const,
					src: settings.logo.url,
					alt: settings.logo.alt || brandName,
					width: settings.logo.width ?? undefined,
					height: settings.logo.height ?? undefined,
				}
			: undefined;

	return {
		brandName,
		...(legalName ? { legalName } : {}),
		...(logo ? { logo } : {}),
		phone: { label: phoneLabel, href: phoneHref(phoneLabel) },
		...(email
			? { email: { label: email, href: `mailto:${email}` as const } }
			: {}),
		...(address ? { address } : {}),
		...(workingHours ? { workingHours } : {}),
		...(telegram ? { telegram } : {}),
		...(whatsapp ? { whatsapp } : {}),
		socialLinks: (settings.socialLinks ?? []).map((link) => ({
			label: link.label,
			href: link.url,
		})),
		...(hasRequisites ? { requisites } : {}),
		...(typeof latitude === "number" && typeof longitude === "number"
			? { coordinates: { latitude, longitude } }
			: {}),
	};
}

export async function findPublicNap(payload: Payload): Promise<NapDTO> {
	const settings = await payload.findGlobal({
		slug: "site-settings",
		depth: 1,
		...publicGatewayReadAccess(),
	});
	return toNapDTO(settings as SiteSettingsRecord);
}
