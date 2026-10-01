export type RedirectEdge = Readonly<{ from: string; to: string }>;

export function assertDirectRedirect(
	candidate: RedirectEdge,
	existing: readonly RedirectEdge[],
): void {
	if (candidate.from === candidate.to) {
		throw new Error("Redirect must not form a self-loop.");
	}

	for (const edge of existing) {
		if (edge.from === candidate.from) continue;
		if (edge.from === candidate.to) {
			throw new Error("Redirect destination must be canonical, not another redirect source.");
		}
		if (edge.to === candidate.from) {
			throw new Error("Redirect source must not extend an existing redirect chain.");
		}
	}
}
