import type { ReactNode } from "react";
import type { PropertyCardDto } from "../../view-models/property";
import type { SiteImageRenderer, SiteLinkRenderer } from "../../lib/adapters";

export type PropertyCardCollectionActionProps = {
	kind: "favorites" | "compare";
	className: string;
	activeClassName?: string;
	inactiveClassName?: string;
};

export type CatalogView = "grid" | "list" | "map";

export type PropertyCardViewProps = {
	listing: PropertyCardDto;
	variant?: CatalogView;
	priority?: boolean;
	href: string;
	imageBadge?: string;
	cardKind?: "property" | "new-building" | "construction";
	cityName?: string;
	phone: string;
	phoneHref: string;
	addressParts?: {
		visiblePrefix: string | null;
		hiddenHousePart: string | null;
	};
	title: string;
	listTitle: string;
	renderCollectionAction?: (
		props: PropertyCardCollectionActionProps,
	) => ReactNode;
	imageRenderer: SiteImageRenderer;
	linkRenderer: SiteLinkRenderer;
	shouldOptimizeImage?: (src: string) => boolean;
	onOpenChat?: () => void;
};
