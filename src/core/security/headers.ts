export type AnalyticsProvider = "yandex-metrika";

type HeaderOptions = {
	imageCspSrc: string;
	analyticsProvider?: string;
	hstsPreload?: boolean;
};

const yandexMetrikaSources = ["https://mc.yandex.ru", "https://yastatic.net"];

function cspDirective(name: string, sources: readonly string[]): string {
	return [name, ...sources].join(" ");
}

export function buildSecurityHeaders({
	imageCspSrc,
	analyticsProvider,
	hstsPreload = false,
}: HeaderOptions) {
	const analyticsSources =
		analyticsProvider === "yandex-metrika" ? yandexMetrikaSources : [];
	const hsts = [
		"max-age=63072000",
		"includeSubDomains",
		...(hstsPreload ? ["preload"] : []),
	].join("; ");
	const baseSecurityHeaders = [
		{ key: "X-Content-Type-Options", value: "nosniff" },
		{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
		{ key: "X-Frame-Options", value: "SAMEORIGIN" },
		{
			key: "Permissions-Policy",
			value: "camera=(), microphone=(), geolocation=()",
		},
		{ key: "Strict-Transport-Security", value: hsts },
	] as const;
	const publicCsp = [
		"default-src 'self'",
		"base-uri 'self'",
		"form-action 'self'",
		"frame-ancestors 'self'",
		"object-src 'none'",
		cspDirective("script-src", [
			"'self'",
			"'unsafe-inline'",
			...analyticsSources,
		]),
		"style-src 'self' 'unsafe-inline'",
		cspDirective("img-src", [imageCspSrc, ...analyticsSources]),
		"font-src 'self' data:",
		cspDirective("connect-src", ["'self'", ...analyticsSources]),
		...(analyticsSources.length > 0
			? [cspDirective("frame-src", ["'self'", ...analyticsSources])]
			: []),
	].join("; ");
	const adminCsp = [
		"default-src 'self'",
		"base-uri 'self'",
		"form-action 'self'",
		"frame-ancestors 'self'",
		"object-src 'none'",
		"script-src 'self' 'unsafe-inline' 'unsafe-eval'",
		"style-src 'self' 'unsafe-inline'",
		`img-src ${imageCspSrc}`,
		"font-src 'self' data:",
		"connect-src 'self' blob:",
	].join("; ");

	return { baseSecurityHeaders, publicCsp, adminCsp };
}
