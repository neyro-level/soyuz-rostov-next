export function createMemoryFeedRepository() {
	const properties = new Map();
	const issues = [];
	let ids = 1;

	return {
		properties,
		issues,
		async findFeedProperty({ feedSourceId, externalId }) {
			return [...properties.values()].find(
				(row) => row.feedSource === feedSourceId && row.externalId === externalId,
			);
		},
		async createFeedProperty(data) {
			const record = { ...data, id: String(ids++), slug: data.slug ?? data.externalId };
			properties.set(record.id, record);
			return record;
		},
		async updateFeedProperty(id, data) {
			const current = properties.get(id);
			const next = { ...current, ...data };
			properties.set(id, next);
			return next;
		},
		async createImportIssue(issue) {
			issues.push(issue);
		},
		async touchLastSeenAt({ feedSourceId, externalIds, nowIso }) {
			for (const row of properties.values()) {
				if (row.feedSource === feedSourceId && externalIds.includes(row.externalId)) {
					row.lastSeenAt = nowIso;
				}
			}
		},
		async countMissingActive({ feedSourceId, seenBeforeIso }) {
			return [...properties.values()].filter(
				(row) =>
					row.feedSource === feedSourceId &&
					row.status === "active" &&
					row.lastSeenAt < seenBeforeIso,
			).length;
		},
		async deactivateMissing({ feedSourceId, seenBeforeIso, nowIso }) {
			let count = 0;
			for (const row of properties.values()) {
				if (
					row.feedSource === feedSourceId &&
					row.status === "active" &&
					row.lastSeenAt < seenBeforeIso
				) {
					row.status = "archived";
					row.lastSeenAt = nowIso;
					count += 1;
				}
			}
			return count;
		},
	};
}
