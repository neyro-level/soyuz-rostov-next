"use client";

import {
	type MouseEvent,
	type TouchEvent,
	useMemo,
	useRef,
	useState,
} from "react";
import { PropertyCardGridLayout } from "./PropertyCardGridLayout";
import { PropertyCardListLayout } from "./PropertyCardListLayout";
import type { PropertyCardViewProps } from "./property-card.types";
import {
	cleanListingDescription,
	formatCardPrice,
	formatListingDate,
} from "./property-card-support";

export type {
	CatalogView,
	PropertyCardCollectionActionProps,
	PropertyCardViewProps,
} from "./property-card.types";

export function PropertyCardView({
	listing,
	variant = "grid",
	priority = false,
	href: path,
	imageBadge,
	cardKind = listing.categoryKey === "construction"
		? "construction"
		: "property",
	cityName,
	phone,
	phoneHref,
	addressParts: suppliedAddressParts,
	title,
	listTitle,
	renderCollectionAction,
	imageRenderer: ImageRenderer,
	linkRenderer: LinkRenderer,
	shouldOptimizeImage = () => false,
	onOpenChat,
}: PropertyCardViewProps) {
	const images = useMemo(() => {
		const list = listing.images.length
			? listing.images
			: listing.image
				? [listing.image]
				: [];
		return [...new Set(list)].filter(Boolean);
	}, [listing.image, listing.images]);
	const [activeImage, setActiveImage] = useState(0);
	const [phoneVisible, setPhoneVisible] = useState(false);
	const touchStartRef = useRef<{ x: number; y: number } | null>(null);
	const currentImage = images[activeImage];
	/** Exclusive badge comes from XML overlay membership or a manual exclusive contract. */
	const showExclusiveBadge = Boolean(listing.isExclusive);
	const addressParts = suppliedAddressParts ?? {
		visiblePrefix: listing.address,
		hiddenHousePart: null,
	};
	const priceLabel = formatCardPrice(listing, cardKind);
	const isList = variant === "list";
	const listingDate = formatListingDate(listing.lastModified);
	const objectCode = listing.objectCode?.trim() || null;
	const isNewBuildingCard = cardKind === "new-building";
	const isXmlCatalogCard = cardKind === "property";
	const listDescription = cleanListingDescription(
		listing.description,
		objectCode ?? listing.id,
	);
	function stop(event: MouseEvent<HTMLElement>) {
		event.stopPropagation();
	}

	function openPropertyChat(event: MouseEvent<HTMLElement>) {
		stop(event);
		onOpenChat?.();
	}

	function showPrevious(event: MouseEvent<HTMLButtonElement>) {
		stop(event);
		setActiveImage((current) =>
			current === 0 ? images.length - 1 : current - 1,
		);
	}

	function showNext(event: MouseEvent<HTMLButtonElement>) {
		stop(event);
		setActiveImage((current) => (current + 1) % images.length);
	}

	function onGalleryTouchStart(event: TouchEvent<HTMLDivElement>) {
		const touch = event.touches[0];
		if (!touch) return;
		touchStartRef.current = { x: touch.clientX, y: touch.clientY };
	}

	function onGalleryTouchEnd(event: TouchEvent<HTMLDivElement>) {
		const touchStart = touchStartRef.current;
		const touch = event.changedTouches[0];
		touchStartRef.current = null;
		if (!touchStart || !touch) return;

		const deltaX = touch.clientX - touchStart.x;
		const deltaY = touch.clientY - touchStart.y;

		if (Math.abs(deltaX) < 28 || Math.abs(deltaX) <= Math.abs(deltaY)) return;

		if (deltaX < 0) {
			setActiveImage((current) => (current + 1) % images.length);
			return;
		}

		setActiveImage((current) =>
			current === 0 ? images.length - 1 : current - 1,
		);
	}
	const layoutProps = {
		ImageRenderer,
		LinkRenderer,
		activeImage,
		addressParts,
		cityName,
		currentImage,
		imageBadge,
		images,
		isList,
		isNewBuildingCard,
		isXmlCatalogCard,
		listDescription,
		listing,
		listingDate,
		listTitle,
		onGalleryTouchEnd,
		onGalleryTouchStart,
		openPropertyChat,
		path,
		phone,
		phoneHref,
		phoneVisible,
		priceLabel,
		priority,
		renderCollectionAction,
		setPhoneVisible,
		shouldOptimizeImage,
		showExclusiveBadge,
		showNext,
		showPrevious,
		stop,
		title,
	};

	if (isList) return <PropertyCardListLayout {...layoutProps} />;
	return <PropertyCardGridLayout {...layoutProps} />;
}
