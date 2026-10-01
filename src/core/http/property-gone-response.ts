const goneCacheHeaders = {
	"Content-Type": "text/html; charset=utf-8",
	"X-Robots-Tag": "noindex, follow",
	"Cache-Control": "public, max-age=300, must-revalidate",
} as const;

export type EntityGoneCopy = {
	title: string;
	bodyPrefix: string;
	bodySuffix: string;
	catalogLabel: string;
	catalogHref: string;
};

export function renderEntityGoneHtml(
	slug: string,
	copy: EntityGoneCopy,
): string {
	const safeSlug = slug.replaceAll(/[^a-z0-9_-]/gi, "");
	return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>${copy.title}</title>
<meta name="robots" content="noindex, follow">
</head>
<body>
<main>
<p>410</p>
<h1>${copy.title}</h1>
<p>${copy.bodyPrefix} ${safeSlug} ${copy.bodySuffix}</p>
<p><a href="${copy.catalogHref}">${copy.catalogLabel}</a></p>
</main>
</body>
</html>`;
}

export function createEntityGoneResponse(
	slug: string,
	copy: EntityGoneCopy,
): Response {
	return new Response(renderEntityGoneHtml(slug, copy), {
		status: 410,
		headers: goneCacheHeaders,
	});
}
