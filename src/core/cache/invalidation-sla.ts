export type CacheInvalidationSlaState = {
	lastSuccessAt?: string;
	lastFailureAt?: string;
};

let state: CacheInvalidationSlaState = {};

export function resetCacheInvalidationSlaState(
	next: CacheInvalidationSlaState = {},
): void {
	state = { ...next };
}

export function recordCacheInvalidationOutcome(
	ok: boolean,
	nowIso = new Date().toISOString(),
): CacheInvalidationSlaState {
	if (ok) {
		state = { ...state, lastSuccessAt: nowIso };
	} else {
		state = { ...state, lastFailureAt: nowIso };
	}
	return { ...state };
}

export function isCacheInvalidationStaleBeyondSla(
	staleDataSlaMinutes: number,
	nowIso = new Date().toISOString(),
	current: CacheInvalidationSlaState = state,
): boolean {
	if (!current.lastFailureAt) {
		return false;
	}

	if (
		current.lastSuccessAt &&
		new Date(current.lastSuccessAt).getTime() >=
			new Date(current.lastFailureAt).getTime()
	) {
		return false;
	}

	return (
		new Date(nowIso).getTime() - new Date(current.lastFailureAt).getTime() >
		staleDataSlaMinutes * 60_000
	);
}
