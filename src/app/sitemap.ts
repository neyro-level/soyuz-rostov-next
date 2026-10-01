import type { MetadataRoute } from "next";
import { getRuntimeDiscoveryShards } from "@/project/seo/discovery-runtime";

export const revalidate = 3600;

async function loadRuntimeDiscoveryShards() {
	try {
		return await getRuntimeDiscoveryShards();
	} catch (error) {
		console.error("Sitemap discovery failed", {
			kind: error instanceof Error ? error.name : "unknown",
		});
		throw error;
	}
}

export async function generateSitemaps() {
	const shards = await loadRuntimeDiscoveryShards();
	return shards.length ? shards.map((shard) => ({ id: shard.id })) : [{ id: "empty" }];
}

export default async function sitemap(props: {
	id: Promise<string> | string;
}): Promise<MetadataRoute.Sitemap> {
	const rawId = typeof props.id === "string" ? props.id : await props.id;
	const shard = (await loadRuntimeDiscoveryShards()).find(
		(candidate) => candidate.id === rawId,
	);
	return (
		shard?.entries.map((entry) => ({
			url: entry.url,
			lastModified: new Date(entry.lastModified),
		})) ?? []
	);
}

