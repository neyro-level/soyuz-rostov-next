export type ProjectKind = "starter-demo" | "client";

export type SiteConfig = {
	locale: string;
	currency: string;
	projectKind: ProjectKind;
};

export const siteConfig = {
	locale: "ru-RU",
	currency: "RUB",
	projectKind: "starter-demo",
} as const satisfies SiteConfig;
