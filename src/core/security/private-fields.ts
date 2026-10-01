export const privatePropertyFields = [
	"unitNumber",
	"cadastralNumber",
	"internalComment",
	"ownerContact",
] as const;

export type PrivatePropertyField = (typeof privatePropertyFields)[number];
