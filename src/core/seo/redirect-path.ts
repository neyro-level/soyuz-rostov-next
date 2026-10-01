export function sanitizeExplicitRedirectPath(
	path: string | null | undefined,
): string | null {
	if (!path) return null;
	const trimmed = path.trim();
	if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
	const pathname = trimmed.split("?")[0]?.split("#")[0] ?? "";
	if (pathname === "/" || pathname === "") return null;
	if (pathname === "/home" || pathname === "/index") return null;
	return pathname;
}
