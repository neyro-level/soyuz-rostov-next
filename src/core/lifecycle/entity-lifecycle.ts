import { sanitizeExplicitRedirectPath } from "../seo/redirect-path.ts";

export type LifecycleEntityType = "property" | "development" | "developer";
export type LifecyclePublicationStatus =
	| "active"
	| "published"
	| "archived"
	| "draft";

export type EntityPageLifecycleState =
	| { kind: "missing"; statusCode: 404 }
	| { kind: "active"; statusCode: 200 }
	| { kind: "archived"; statusCode: 200; robots: "noindex" }
	| { kind: "redirect"; statusCode: 301; destination: string }
	| { kind: "gone"; statusCode: 410; robots: "noindex" };

export function resolveEntityPageLifecycle(
	input:
		| { found: false }
		| {
				found: true;
				status: LifecyclePublicationStatus;
				publishedAt?: string | null;
				contentPurgedAt?: string | null;
				explicitRedirectPath?: string | null;
		  },
): EntityPageLifecycleState {
	if (!input.found || !input.publishedAt || input.status === "draft") {
		return { kind: "missing", statusCode: 404 };
	}

	if (input.contentPurgedAt) {
		const destination = sanitizeExplicitRedirectPath(input.explicitRedirectPath);
		return destination
			? { kind: "redirect", statusCode: 301, destination }
			: { kind: "gone", statusCode: 410, robots: "noindex" };
	}

	return input.status === "archived"
		? { kind: "archived", statusCode: 200, robots: "noindex" }
		: { kind: "active", statusCode: 200 };
}
