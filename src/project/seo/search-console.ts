import type { Metadata } from "next";

type SearchConsoleConfig = {
	yandex: string | null;
	google: string | null;
};

export function searchConsoleVerificationMetadata(
	searchConsole: SearchConsoleConfig,
): Metadata["verification"] | undefined {
	const verification: NonNullable<Metadata["verification"]> = {};
	if (searchConsole.yandex !== null) verification.yandex = searchConsole.yandex;
	if (searchConsole.google !== null) verification.google = searchConsole.google;
	return Object.keys(verification).length > 0 ? verification : undefined;
}
