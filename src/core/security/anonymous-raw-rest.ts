import rawRestBoundary from "../../../config/raw-rest-boundary.json" with {
	type: "json",
};

const anonymousDenyCollections = new Set(
	rawRestBoundary.anonymousDenyCollections.map((collection) => collection.toLowerCase()),
);
const systemOnlyCollections = new Set(
	Object.entries(rawRestBoundary.classifiedCollections)
		.filter(([, classification]) => classification === "system-only")
		.map(([collection]) => collection.toLowerCase()),
);
const anonymousAuthAllowPaths = new Set(rawRestBoundary.anonymousAuthAllowPaths);

export function isAnonymousDeniedRawRestPath(pathname: string): boolean {
	const [, api, collection] = pathname.split("/");

	if (api !== "api" || !collection) return false;
	const slug = collection.toLowerCase();
	const denied =
		anonymousDenyCollections.has(slug) || systemOnlyCollections.has(slug);
	if (!denied) return false;
	if (anonymousAuthAllowPaths.has(pathname)) return false;

	return true;
}

export function hasPayloadSessionToken(token: string | undefined): boolean {
	if (!token) return false;
	const parts = token.split(".").filter(Boolean);
	return parts.length === 3 && parts.every((part) => part.length > 8);
}

export function anonymousRawRestEdgeDecision(
	pathname: string,
	sessionToken: string | undefined,
): { status: 404; body: { error: "notFound" } } | null {
	if (isAnonymousDeniedRawRestPath(pathname) && !hasPayloadSessionToken(sessionToken)) {
		return { status: 404, body: { error: "notFound" } };
	}

	return null;
}
