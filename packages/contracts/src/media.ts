export type MediaDTO = {
	kind: "external" | "managed";
	src: string;
	alt: string;
	width?: number;
	height?: number;
};
