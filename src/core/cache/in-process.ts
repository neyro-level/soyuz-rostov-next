import "server-only";

type InProcessCacheTarget =
	| { type: "path"; path: string; routeType?: "page" | "layout" }
	| { type: "tag"; tag: string };

export async function invalidateInProcessCacheTargets(
	targets: InProcessCacheTarget[],
): Promise<void> {
	const { revalidatePath, revalidateTag } = await import("next/cache");

	for (const target of targets) {
		if (target.type === "path") {
			revalidatePath(target.path, target.routeType);
			continue;
		}
		revalidateTag(target.tag, "max");
	}
}
