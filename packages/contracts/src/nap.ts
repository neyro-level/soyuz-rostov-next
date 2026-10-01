import type { MediaDTO } from "./media";

export type NapDTO = {
	brandName: string;
	legalName?: string;
	logo?: MediaDTO;
	phone: {
		label: string;
		href: `tel:${string}`;
	};
	email?: {
		label: string;
		href: `mailto:${string}`;
	};
	address?: string;
	workingHours?: string;
	telegram?: string;
	whatsapp?: string;
	socialLinks: readonly {
		label: string;
		href: string;
	}[];
	requisites?: {
		inn?: string;
		kpp?: string;
		ogrn?: string;
		legalAddress?: string;
	};
	coordinates?: {
		latitude: number;
		longitude: number;
	};
};
