export function hasValidNextDueAt(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0 && !Number.isNaN(Date.parse(value));
}

export function normalizeEnabledFeedNextDueAt(input: {
	enabled: boolean;
	nextDueAt: string | null | undefined;
	nowIso: string;
}): string | null {
	if (!input.enabled) {
		return hasValidNextDueAt(input.nextDueAt) ? input.nextDueAt : null;
	}
	if (hasValidNextDueAt(input.nextDueAt)) {
		return input.nextDueAt;
	}
	return input.nowIso;
}

export function isEnabledFeedDue(input: {
	enabled: boolean;
	nextDueAt: string | null | undefined;
	nowIso: string;
}): boolean {
	if (!input.enabled) return false;
	if (!hasValidNextDueAt(input.nextDueAt)) return true;
	return input.nextDueAt <= input.nowIso;
}

export function computeScheduleAfterClaim(input: {
	now: Date;
	previousNextDueAt?: string | null;
	refreshIntervalMinutes: number;
}): string {
	const intervalMs = input.refreshIntervalMinutes * 60_000;
	const fromNow = new Date(input.now.getTime() + intervalMs);
	const previous = hasValidNextDueAt(input.previousNextDueAt)
		? new Date(input.previousNextDueAt)
		: undefined;
	const fromPrevious = previous
		? new Date(previous.getTime() + intervalMs)
		: undefined;
	if (fromPrevious && fromPrevious > fromNow) {
		return fromPrevious.toISOString();
	}
	return fromNow.toISOString();
}
