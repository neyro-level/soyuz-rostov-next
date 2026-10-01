import type { NapDTO } from "@ams/realtbase-contracts";
import type { SiteSetting } from "../project/payload-types";

export const fixtureSiteSettingsData = {
	brandName: "AMS Realty Baza Starter",
	phone: "+7 (000) 000-00-00",
	email: "hello@example.test",
	address: "Демо-город, демонстрационный адрес",
	workingHours: "Ежедневно, 09:00–18:00",
	socialLinks: [],
} satisfies Partial<SiteSetting>;

export const fixtureNap: NapDTO = {
	brandName: "AMS Realty Baza Starter",
	phone: { label: "+7 (000) 000-00-00", href: "tel:+70000000000" },
	email: { label: "hello@example.test", href: "mailto:hello@example.test" },
	address: "Демо-город, демонстрационный адрес",
	workingHours: "Ежедневно, 09:00–18:00",
	socialLinks: [],
};
