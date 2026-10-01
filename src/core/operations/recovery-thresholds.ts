const minuteInMs = 60_000;
const hourInMs = 60 * minuteInMs;

export function importStaleThresholdMs(
	observedSuccessfulDurationMs?: number,
): number {
	const floor = 15 * minuteInMs;
	const observed =
		typeof observedSuccessfulDurationMs === "number" &&
		observedSuccessfulDurationMs > 0
			? 3 * observedSuccessfulDurationMs
			: floor;
	return Math.max(floor, observed);
}

export function queuedImportOrphanThresholdMs(
	dispatcherIntervalMinutes: number,
): number {
	return Math.max(15 * minuteInMs, 3 * dispatcherIntervalMinutes * minuteInMs);
}

export function pendingDeliveryOrphanThresholdMs(
	maintenanceIntervalMinutes: number,
): number {
	return Math.max(5 * minuteInMs, 2 * maintenanceIntervalMinutes * minuteInMs);
}

export function feedOverdueExternalThresholdMs(
	refreshIntervalMinutes: number,
): number {
	return Math.max(2 * hourInMs, 3 * refreshIntervalMinutes * minuteInMs);
}

export function observedSuccessfulDurationMs(
	runs: Array<{ startedAt?: string | null; finishedAt?: string | null }>,
): number | undefined {
	let longest: number | undefined;
	for (const run of runs) {
		if (!run.startedAt || !run.finishedAt) continue;
		const duration =
			new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime();
		if (duration <= 0) continue;
		longest = longest === undefined ? duration : Math.max(longest, duration);
	}
	return longest;
}
