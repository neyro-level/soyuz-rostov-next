function isProductionEnv(env: NodeJS.ProcessEnv): boolean {
	return env.NODE_ENV === "production";
}

/**
 * Exact origins allowed only for integration tests.
 * Production and unset flags always yield an empty list — no private-network bypass.
 */
export function parseTestApprovedOrigins(
	env: NodeJS.ProcessEnv = process.env,
): string[] {
	if (isProductionEnv(env)) return [];
	if (env.AMS_ALLOW_TEST_DESTINATIONS !== "true") return [];

	return (env.AMS_TEST_APPROVED_ORIGINS ?? "")
		.split(",")
		.map((item) => item.trim().toLowerCase())
		.filter((item) => /^https?:\/\/127\.0\.0\.1:\d+$/.test(item));
}
