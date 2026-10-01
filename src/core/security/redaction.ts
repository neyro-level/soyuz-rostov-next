import "server-only";

const sensitiveKeyPattern =
	/(password|secret|token|authorization|cookie|credential|api[_-]?key|database[_-]?uri|dsn)/i;

export function redactValue(value: unknown): unknown {
	if (typeof value === "string") {
		return value.length > 0 ? "[REDACTED]" : value;
	}
	if (Array.isArray(value)) return value.map(redactValue);
	if (value && typeof value === "object") return redactRecord(value as Record<string, unknown>);
	return value;
}

export function redactRecord(record: Record<string, unknown>): Record<string, unknown> {
	return Object.fromEntries(
		Object.entries(record).map(([key, value]) => [
			key,
			sensitiveKeyPattern.test(key) ? redactValue(value) : value,
		]),
	);
}
