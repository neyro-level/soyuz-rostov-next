export type Clock = {
	now(): Date;
	nowIso(): string;
};

export const systemClock: Clock = {
	now: () => new Date(),
	nowIso: () => new Date().toISOString(),
};

let runtimeClock: Clock = systemClock;

export function getRuntimeClock(): Clock {
	return runtimeClock;
}

export function installRuntimeClock(clock: Clock): void {
	runtimeClock = clock;
}

export function resetRuntimeClock(): void {
	runtimeClock = systemClock;
}

export function createControllableClock(initialIso: string): Clock & {
	setIso(iso: string): void;
	addMs(deltaMs: number): void;
} {
	let currentMs = Date.parse(initialIso);
	if (!Number.isFinite(currentMs)) {
		throw new Error("Controllable clock requires a valid ISO timestamp.");
	}

	return {
		now: () => new Date(currentMs),
		nowIso: () => new Date(currentMs).toISOString(),
		setIso(iso: string) {
			const next = Date.parse(iso);
			if (!Number.isFinite(next)) {
				throw new Error("Controllable clock requires a valid ISO timestamp.");
			}
			currentMs = next;
		},
		addMs(deltaMs: number) {
			currentMs += deltaMs;
		},
	};
}
