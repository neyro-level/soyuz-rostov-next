import {
	type CacheTarget,
	cacheInvalidationRequestSchema,
} from "./revalidation-contract.ts";

const allowedPathPrefixes = [
	"/",
	"/kvartiry",
	"/doma",
	"/uchastki",
	"/kommercheskaya-nedvizhimost",
	"/komnaty",
	"/garazhi",
	"/novostroyki",
	"/kottedzhnye-poselki",
	"/zastroyshchiki",
	"/obekty",
	"/uslugi",
	"/o-kompanii",
	"/ipoteka",
	"/prodat",
	"/sdat",
	"/kontakty",
] as const;
const allowedTags = new Set([
	"site",
	"properties",
	"property",
	"developments",
	"developers",
	"media",
	"registry",
]);
const allowedEntityTag = /^(geo|district|development|developer|property):[a-z0-9_-]+$/;
const allowedGeoSurfaceTag = /^geo-surface:[a-z0-9_-]+:[a-z0-9_-]+$/;

export type InternalRevalidationResult = {
	status: 200 | 400 | 403 | 404;
	body:
		| { revalidated: true; count: number }
		| { error: "not_found" | "invalid_payload" | "target_not_allowed" };
	deniedTargets?: CacheTarget[];
};

function allowedTarget(target: CacheTarget): boolean {
	if (target.type === "tag") {
		return (
			allowedTags.has(target.tag) ||
			allowedEntityTag.test(target.tag) ||
			allowedGeoSurfaceTag.test(target.tag)
		);
	}
	return allowedPathPrefixes.some(
		(prefix) => target.path === prefix || target.path.startsWith(`${prefix}/`),
	);
}

export async function executeInternalRevalidation(input: {
	expectedSecret?: string;
	providedSecret?: string | null;
	body: unknown;
	invalidate: (targets: CacheTarget[]) => Promise<void>;
}): Promise<InternalRevalidationResult> {
	if (
		!input.expectedSecret ||
		!input.providedSecret ||
		input.providedSecret !== input.expectedSecret
	) {
		return { status: 404, body: { error: "not_found" } };
	}

	const payload = cacheInvalidationRequestSchema.safeParse(input.body);
	if (!payload.success) {
		return { status: 400, body: { error: "invalid_payload" } };
	}

	const deniedTargets = payload.data.targets.filter(
		(target) => !allowedTarget(target),
	);
	if (deniedTargets.length > 0) {
		return {
			status: 403,
			body: { error: "target_not_allowed" },
			deniedTargets,
		};
	}

	await input.invalidate(payload.data.targets);
	return {
		status: 200,
		body: { revalidated: true, count: payload.data.targets.length },
	};
}
