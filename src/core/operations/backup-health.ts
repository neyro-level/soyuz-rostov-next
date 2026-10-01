import { readFileSync } from "node:fs";

export type BackupCopyHealth = {
	lastSuccessAt?: string | null;
	integrityOk?: boolean;
	offsiteCopyPresent?: boolean;
};

export type BackupHealthSnapshot = {
	db?: BackupCopyHealth;
	media?: BackupCopyHealth;
	statusKnown?: boolean;
	nowIso?: string;
	maxAgeHours?: number;
};

function isStale(
	lastSuccessAt: string | null | undefined,
	nowMs: number,
	maxAgeHours: number,
): boolean {
	if (!lastSuccessAt) {
		return true;
	}

	const successMs = new Date(lastSuccessAt).getTime();
	if (!Number.isFinite(successMs)) {
		return true;
	}

	return nowMs - successMs > maxAgeHours * 60 * 60_000;
}

export function evaluateBackupFailures(snapshot: BackupHealthSnapshot): {
	dbBackupFailed: boolean;
	mediaBackupFailed: boolean;
} {
	if (snapshot.statusKnown === false) {
		return { dbBackupFailed: true, mediaBackupFailed: true };
	}

	const nowMs = new Date(snapshot.nowIso ?? new Date().toISOString()).getTime();
	const maxAgeHours = snapshot.maxAgeHours ?? 36;

	const copyFailed = (copy?: BackupCopyHealth) =>
		!copy ||
		copy.integrityOk === false ||
		copy.offsiteCopyPresent === false ||
		isStale(copy.lastSuccessAt, nowMs, maxAgeHours);

	return {
		dbBackupFailed: copyFailed(snapshot.db),
		mediaBackupFailed: copyFailed(snapshot.media),
	};
}

export function readBackupHealthSnapshot(path?: string): BackupHealthSnapshot {
	if (!path) {
		return { statusKnown: false };
	}

	try {
		const parsed = JSON.parse(readFileSync(path, "utf8")) as BackupHealthSnapshot;
		return { ...parsed, statusKnown: true };
	} catch {
		return { statusKnown: false };
	}
}
