export function isLiveFuturePayloadJob(
	job:
		| {
				waitUntil?: string | null;
				completedAt?: string | null;
				processing?: boolean | null;
		  }
		| null
		| undefined,
	now: Date,
): boolean {
	if (!job) {
		return false;
	}
	if (job.waitUntil && new Date(job.waitUntil).getTime() > now.getTime()) {
		return true;
	}
	if (job.processing) {
		return true;
	}
	return !job.completedAt;
}
