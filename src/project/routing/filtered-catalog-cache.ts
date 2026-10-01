export const FILTERED_CATALOG_CACHE_MAX_ENTRIES = 64;
export const FILTERED_CATALOG_CACHE_TTL_MS = 20_000;
export const FILTERED_CATALOG_CACHE_MAX_ENTRY_BYTES = 64 * 1024;
export const FILTERED_CATALOG_CACHE_MAX_TOTAL_BYTES = 2 * 1024 * 1024;

type CacheEntry<T> = {
	expiresAt: number;
	promise: Promise<T>;
	bytes: number;
};

type CacheStats = {
	entries: number;
	bytes: number;
};

function serializedSize(value: unknown): number {
	return Buffer.byteLength(JSON.stringify(value), "utf8");
}

class FilteredCatalogCache {
	private readonly entries = new Map<string, CacheEntry<unknown>>();
	private totalBytes = 0;

	private evictExpired(now: number) {
		for (const [key, entry] of this.entries) {
			if (entry.expiresAt > now) continue;
			this.entries.delete(key);
			this.totalBytes -= entry.bytes;
		}
	}

	private evictOldest() {
		const oldest = this.entries.entries().next();
		if (oldest.done) return;
		const [key, entry] = oldest.value;
		this.entries.delete(key);
		this.totalBytes -= entry.bytes;
	}

	async getOrLoad<T>(key: string, load: () => Promise<T>): Promise<T> {
		const now = Date.now();
		this.evictExpired(now);
		const existing = this.entries.get(key) as CacheEntry<T> | undefined;
		if (existing) {
			this.entries.delete(key);
			this.entries.set(key, existing);
			return existing.promise;
		}

		while (this.entries.size >= FILTERED_CATALOG_CACHE_MAX_ENTRIES) {
			this.evictOldest();
		}

		const entry: CacheEntry<T> = {
			expiresAt: now + FILTERED_CATALOG_CACHE_TTL_MS,
			bytes: 0,
			promise: Promise.resolve().then(load),
		};
		this.entries.set(key, entry as CacheEntry<unknown>);

		try {
			const value = await entry.promise;
			if (this.entries.get(key) !== entry) return value;
			const bytes = serializedSize(value);
			if (bytes > FILTERED_CATALOG_CACHE_MAX_ENTRY_BYTES) {
				this.entries.delete(key);
				return value;
			}
			entry.bytes = bytes;
			this.totalBytes += bytes;
			while (this.totalBytes > FILTERED_CATALOG_CACHE_MAX_TOTAL_BYTES) {
				this.evictOldest();
			}
			return value;
		} catch (error) {
			this.entries.delete(key);
			throw error;
		}
	}

	stats(): CacheStats {
		return { entries: this.entries.size, bytes: this.totalBytes };
	}

	clear() {
		this.entries.clear();
		this.totalBytes = 0;
	}
}

const filteredCatalogCache = new FilteredCatalogCache();

export function getCachedFilteredCatalogRoute<T>(
	key: string,
	load: () => Promise<T>,
): Promise<T> {
	return filteredCatalogCache.getOrLoad(key, load);
}

export function getFilteredCatalogCacheStats(): CacheStats {
	return filteredCatalogCache.stats();
}

export function clearFilteredCatalogCacheForTest() {
	filteredCatalogCache.clear();
}
