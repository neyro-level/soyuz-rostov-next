import type {
	AriaAttributes,
	ComponentType,
	CSSProperties,
	HTMLAttributeAnchorTarget,
	ImgHTMLAttributes,
	ReactNode,
} from "react";

export type SiteLinkRendererProps = {
	href: string;
	children: ReactNode;
	className?: string;
	title?: string;
	rel?: string;
	target?: HTMLAttributeAnchorTarget;
	ariaLabel?: string;
	ariaCurrent?: AriaAttributes["aria-current"];
	scroll?: boolean;
	onClick?: () => void;
};

export type SiteImageRendererProps = {
	src: string;
	alt: string;
	className?: string;
	style?: CSSProperties;
	width?: number;
	height?: number;
	sizes?: string;
	priority?: boolean;
	fill?: boolean;
	unoptimized?: boolean;
	quality?: number;
} & Pick<ImgHTMLAttributes<HTMLImageElement>, "loading">;

export type SiteLinkRenderer = ComponentType<SiteLinkRendererProps>;
export type SiteImageRenderer = ComponentType<SiteImageRendererProps>;
