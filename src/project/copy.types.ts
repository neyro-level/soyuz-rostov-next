export type ProjectCopy = {
	notFound: {
		code: string;
		title: string;
		body: string;
		homeLabel: string;
		catalogLabel: string;
		catalogHref: `/${string}/`;
	};
	catalog: {
		filteredSummary: string;
	};
	entityGone: {
		title: string;
		bodyPrefix: string;
		bodySuffix: string;
		catalogLabel: string;
		catalogHref: `/${string}/`;
	};
};
