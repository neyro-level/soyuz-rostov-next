import type { Payload } from "payload";
import { systemOverrideAccess } from "./overrides.ts";

type FixtureCollection =
	| "regions"
	| "cities"
	| "districts"
	| "developers"
	| "developments"
	| "properties";

function projectForComparison(actual: unknown, expected: unknown): unknown {
	if (Array.isArray(expected)) {
		const values = Array.isArray(actual) ? actual : [];
		return expected.map((item, index) =>
			projectForComparison(values[index], item),
		);
	}
	if (expected && typeof expected === "object") {
		const source =
			actual && typeof actual === "object"
				? (actual as Record<string, unknown>)
				: {};
		return Object.fromEntries(
			Object.entries(expected)
				.filter(([, value]) => value !== undefined)
				.map(([key, value]) => [key, projectForComparison(source[key], value)]),
		);
	}
	if (actual && typeof actual === "object" && "id" in actual) {
		return (actual as { id: unknown }).id;
	}
	return actual;
}

function matchesSeedData(
	actual: unknown,
	expected: Record<string, unknown>,
): boolean {
	return (
		JSON.stringify(projectForComparison(actual, expected)) ===
		JSON.stringify(expected)
	);
}

export function createPayloadStarterFixtureSeedPort(payload: Payload) {
	const access = systemOverrideAccess("controlled-maintenance");
	return {
		async upsertSiteSettings(data: {
			brandName: string;
			phone: string;
			email?: string;
			address?: string;
			workingHours?: string;
		}) {
			const existing = await payload.findGlobal({
				slug: "site-settings",
				depth: 0,
				...access,
			} as never);
			if (matchesSeedData(existing, data)) {
				return { state: "unchanged" as const };
			}
			await payload.updateGlobal({
				slug: "site-settings",
				data,
				...access,
			} as never);
			return { state: "updated" as const };
		},
		async upsert({
			collection,
			identity,
			data,
		}: {
			collection: FixtureCollection;
			identity:
				| { field: string; value: string }
				| { fields: Record<string, string | number> };
			data: Record<string, unknown>;
		}) {
			const where =
				"fields" in identity
					? {
							and: Object.entries(identity.fields).map(([field, value]) => ({
								[field]: { equals: value },
							})),
						}
					: { [identity.field]: { equals: identity.value } };
			const result = await payload.find({
				collection,
				depth: 0,
				limit: 1,
				where,
				...access,
			} as never);
			const existing = result.docs[0];
			if (!existing) {
				const created = await payload.create({
					collection,
					data,
					...access,
				} as never);
				return { id: created.id, state: "created" as const };
			}
			if (matchesSeedData(existing, data)) {
				return { id: existing.id, state: "unchanged" as const };
			}
			await payload.update({
				collection,
				id: existing.id,
				data,
				...access,
			} as never);
			return { id: existing.id, state: "updated" as const };
		},
	};
}

export function createPayloadStarterFixtureResetPort(payload: Payload) {
	const access = systemOverrideAccess("controlled-maintenance");
	return {
		async deleteOwned({
			collection,
			identity,
			ownership,
		}: {
			collection: "properties" | "developments" | "developers";
			identity: { field: string; value: string };
			ownership: { field: string; value: string };
		}): Promise<"deleted" | "missing"> {
			const result = await payload.find({
				collection,
				depth: 0,
				limit: 2,
				where: { [identity.field]: { equals: identity.value } },
				...access,
			} as never);
			if (result.docs.length === 0) return "missing";
			if (result.docs.length !== 1) {
				throw new Error(
					`Starter fixture reset found ambiguous ${collection} identity.`,
				);
			}
			const existing = result.docs[0] as unknown as Record<string, unknown>;
			if (existing[ownership.field] !== ownership.value) {
				throw new Error(
					`Starter fixture reset refused non-owned ${collection} record.`,
				);
			}
			await payload.delete({
				collection,
				id: existing.id as never,
				...access,
			} as never);
			return "deleted";
		},
	};
}
