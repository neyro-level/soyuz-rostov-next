import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, statfsSync } from "node:fs";
import path from "node:path";
import { runtimeEnv } from "@/project/env";

const SAFE_NAME = /[^a-zA-Z0-9._-]+/g;

export function getMediaDirectory(): string {
	const configured = runtimeEnv.MEDIA_DIR?.trim();
	return configured && configured.length > 0
		? configured
		: path.resolve(process.cwd(), "media");
}

export function ensureMediaDirectory(): string {
	const directory = getMediaDirectory();
	if (!existsSync(directory)) {
		mkdirSync(directory, { recursive: true });
	}
	return directory;
}

export function isLocalMediaReady(): boolean {
	try {
		ensureMediaDirectory();
		return true;
	} catch {
		return false;
	}
}

export const mediaOverwriteDisabled = true;

export function uniqueMediaFilename(originalName: string): string {
	const base = path.basename(originalName).replace(SAFE_NAME, "-");
	const ext = path.extname(base);
	const stem = path.basename(base, ext) || "file";
	return `${stem}-${randomUUID()}${ext.toLowerCase()}`;
}

export function mediaFileExists(filename: string): boolean {
	return existsSync(path.join(getMediaDirectory(), path.basename(filename)));
}

export function readDataVolumeFreeRatio(directory = getMediaDirectory()): number | null {
	try {
		const stats = statfsSync(directory);
		const blocks = Number(stats.blocks);
		if (!Number.isFinite(blocks) || blocks <= 0) {
			return null;
		}
		return Number(stats.bavail) / blocks;
	} catch {
		return null;
	}
}
