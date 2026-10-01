export async function register() {
	if (process.env.NEXT_RUNTIME !== "nodejs") {
		return;
	}

	const { assertRuntimeEnvOrThrow } = await import(
		"./src/project/env.ts"
	);
	assertRuntimeEnvOrThrow();
}
