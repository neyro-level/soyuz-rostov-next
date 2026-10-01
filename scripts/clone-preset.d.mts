export type CloneBootstrap = {
	preparedAt: string;
	nap: {
		brandName: string;
		phone: string;
		email: string;
		address: string;
		workingHours: string;
	};
	region: {
		slug: string;
		name: string;
		genitive: string;
		locative: string;
		shortName: string;
	};
	geos: Array<{
		slug: string;
		title: string;
		agglomerationOf?: string;
		morphology: {
			nominative: string;
			genitive: string;
			prepositional: string;
			preposition: "в" | "во" | "на";
		};
		districts: Array<
			{
				slug: string;
				name: string;
				locative: string;
				preposition: "в" | "во" | "на";
				synonyms: string[];
				parent: string | null;
			} & (
				| {
						type: "admin_district";
						adjLocative: string;
						adjGenitive: string;
				  }
				| {
						type: "microdistrict";
						adjLocative?: never;
						adjGenitive?: never;
				  }
			)
		>;
	}>;
};

export function validateCloneBootstrap(root: string): CloneBootstrap;
