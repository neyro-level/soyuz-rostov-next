import type { CSSProperties } from "react";
import type { SiteImageRendererProps } from "./adapters";
import { cn } from "./utils";

export function StarterFeedImage({
	src,
	alt,
	className,
	style,
	width,
	height,
	sizes,
	priority,
	fill,
	loading,
}: SiteImageRendererProps) {
	const fillStyle: CSSProperties | undefined = fill
		? {
				position: "absolute",
				inset: 0,
				width: "100%",
				height: "100%",
				objectFit: "cover",
				...style,
			}
		: style;

	return (
		<img
			src={src}
			alt={alt}
			className={cn(className)}
			style={fillStyle}
			width={fill ? undefined : (width ?? 1200)}
			height={fill ? undefined : (height ?? 800)}
			sizes={sizes}
			loading={priority ? "eager" : (loading ?? "lazy")}
			fetchPriority={priority ? "high" : "auto"}
			decoding="async"
		/>
	);
}
