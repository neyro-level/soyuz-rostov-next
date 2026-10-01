import "server-only";

import type { Payload, PayloadRequest } from "payload";
import type { RedirectEdge } from "../../lifecycle/redirect-graph.ts";
import { systemOverrideAccess } from "./overrides.ts";

export async function findRedirectGraphNeighbors(input: {
	payload: Payload;
	req: PayloadRequest;
	from: string;
	to: string;
}): Promise<Array<RedirectEdge & { id: string | number }>> {
	const result = await input.payload.find({
		collection: "redirects",
		where: {
			or: [{ from: { equals: input.to } }, { to: { equals: input.from } }],
		},
		limit: 3,
		depth: 0,
		req: input.req,
		select: { from: true, to: true },
		...systemOverrideAccess("redirect-graph-guard"),
	});
	return result.docs.map((row) => ({ id: row.id, from: row.from, to: row.to }));
}
