import type {
	PageKey,
	ResolverDataPort,
	ResolverPageRecord,
	UrlGrammar,
} from "../core/routing/index.ts";

export function createFixtureResolverDataPort(input: {
	grammar: UrlGrammar;
	pages: readonly {
		pageKey: PageKey;
		record: ResolverPageRecord;
		inventory: number;
	}[];
	redirects?: Readonly<Record<string, string>>;
}): ResolverDataPort {
	const records = new Map(
		input.pages.map((item) => [
			input.grammar.buildUrl(item.pageKey),
			item.record,
		]),
	);
	const inventory = new Map(
		input.pages.map((item) => [
			input.grammar.buildUrl(item.pageKey),
			item.inventory,
		]),
	);
	const redirects = new Map(Object.entries(input.redirects ?? {}));

	return {
		async lookupPage(pageKey) {
			return records.get(input.grammar.buildUrl(pageKey)) ?? null;
		},
		async findRedirect(path) {
			const destinationPath = redirects.get(path);
			return destinationPath
				? { destinationPath, statusCode: 301 as const }
				: null;
		},
		async countInventory(pageKey) {
			return inventory.get(input.grammar.buildUrl(pageKey)) ?? 0;
		},
	};
}
