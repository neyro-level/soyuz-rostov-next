const viewports = [
	{ name: "mobile", width: 390, height: 844 },
	{ name: "tablet", width: 768, height: 1024 },
	{ name: "desktop", width: 1280, height: 900 },
	{ name: "wide", width: 1440, height: 1000 },
];
const routes = ["/", "/kvartiry/", "/uslugi/"];

console.log(
	JSON.stringify(
		{
			baseUrl: process.env.STARTER_VISUAL_BASE_URL ?? null,
			viewports,
			routes,
			capturesInClone: false,
			manifest: "docs/proofs/epic-9/visual-manifest.json",
		},
		null,
		2,
	),
);
