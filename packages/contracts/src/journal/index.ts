export const journalContractState = "draft" as const;

export type JournalArticleCardDTO = {
	slug: string;
	href: string;
	title: string;
	excerpt: string;
	publishedAt: string;
};

export type JournalListDTO = {
	items: readonly JournalArticleCardDTO[];
	total: number;
};
