function hostOf(value: string | undefined): string | undefined {
	if (!value?.trim()) {
		return undefined;
	}

	try {
		return new URL(value).host.toLowerCase();
	} catch {
		return value.trim().toLowerCase();
	}
}

export function isAlertChannelIndependent(input: {
	alertWebhookUrl?: string;
	leadChannelUrls?: Array<string | undefined>;
}): boolean {
	const alertHost = hostOf(input.alertWebhookUrl);
	if (!alertHost) {
		return false;
	}

	const leadHosts = (input.leadChannelUrls ?? [])
		.map(hostOf)
		.filter((host): host is string => Boolean(host));

	return !leadHosts.includes(alertHost);
}
