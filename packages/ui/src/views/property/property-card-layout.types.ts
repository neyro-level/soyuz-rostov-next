import type {
	Dispatch,
	MouseEventHandler,
	SetStateAction,
	TouchEventHandler,
} from "react";

import type { SiteImageRenderer, SiteLinkRenderer } from "../../lib/adapters";
import type { PropertyCardViewProps } from "./property-card.types";

export type PropertyCardLayoutProps = Pick<
	PropertyCardViewProps,
	| "cityName"
	| "imageBadge"
	| "listing"
	| "listTitle"
	| "phone"
	| "phoneHref"
	| "priority"
	| "renderCollectionAction"
	| "shouldOptimizeImage"
	| "title"
> & {
	ImageRenderer: SiteImageRenderer;
	LinkRenderer: SiteLinkRenderer;
	activeImage: number;
	addressParts: NonNullable<PropertyCardViewProps["addressParts"]>;
	currentImage?: string;
	images: string[];
	isList: boolean;
	isNewBuildingCard: boolean;
	isXmlCatalogCard: boolean;
	listDescription: string | null;
	listingDate: string | null;
	onGalleryTouchEnd: TouchEventHandler<HTMLDivElement>;
	onGalleryTouchStart: TouchEventHandler<HTMLDivElement>;
	openPropertyChat: MouseEventHandler<HTMLElement>;
	path: string;
	phoneVisible: boolean;
	priceLabel: string;
	setPhoneVisible: Dispatch<SetStateAction<boolean>>;
	showExclusiveBadge: boolean;
	showNext: MouseEventHandler<HTMLButtonElement>;
	showPrevious: MouseEventHandler<HTMLButtonElement>;
	stop: MouseEventHandler<HTMLElement>;
};
