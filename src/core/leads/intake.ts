import { createHash, createHmac } from "node:crypto";
import { z } from "zod";

export type LeadFormKind =
	| "property_request"
	| "callback"
	| "consultation"
	| "generic"
	| "legal"
	| "development_price"
	| "quiz";

export type LeadEntityContext = {
	geo?: string;
	surface?:
		| "apartments"
		| "new-buildings"
		| "houses"
		| "plots"
		| "commercial"
		| "garages";
	district?: string;
	propertyUrlId?: string;
	development?: string;
	developer?: string;
};

export type LeadIntakeAccepted = {
	accepted: true;
	lead: {
		name: string;
		phoneRaw: string;
		phoneE164: string;
		email?: string;
		message?: string;
		formKind: LeadFormKind;
		sourcePage: string;
		referrer?: string;
		property?: string;
		context?: LeadEntityContext;
		utm?: {
			source?: string;
			medium?: string;
			campaign?: string;
			content?: string;
			term?: string;
		};
		consent: {
			accepted: true;
			version: string;
			consentedAt: string;
		};
		idempotencyKey: string;
		retentionUntil?: string;
		fraudFingerprint?: string;
	};
	safeDiagnostics: LeadIntakeDiagnostics;
};

export type LeadIntakeRejected = {
	accepted: false;
	status: 400 | 429;
	code:
		| "lead.invalid_payload"
		| "lead.invalid_phone"
		| "lead.consent_required"
		| "lead.consent_version_mismatch"
		| "lead.source_page_invalid"
		| "lead.honeypot"
		| "lead.fill_time_invalid"
		| "lead.rate_limited";
	safeDiagnostics: LeadIntakeDiagnostics;
};

export type LeadIntakeResult = LeadIntakeAccepted | LeadIntakeRejected;

export type LeadIntakeDiagnostics = {
	code: string;
	formKind?: LeadFormKind;
	sourcePage?: string;
	reason: string;
	rawPiiIncluded: false;
};

export type LeadRateLimitInput = {
	windowHits: number;
	limit: number;
};

const minimumFillTimeMs = 2500;
const maximumFillTimeMs = 24 * 60 * 60 * 1000;

const leadIntakeSchema = z.object({
	name: z.string().trim().min(2).max(120),
	phone: z.string().trim().min(5).max(40),
	email: z.string().trim().email().max(160).optional().or(z.literal("")),
	message: z.string().trim().max(2000).optional().or(z.literal("")),
	formKind: z.enum([
		"property_request",
		"callback",
		"consultation",
		"generic",
		"legal",
		"development_price",
		"quiz",
	]),
	sourcePage: z.string().trim().min(1).max(512),
	referrer: z.string().trim().max(512).optional().or(z.literal("")),
	property: z.string().trim().max(128).optional().or(z.literal("")),
	context: z
		.object({
			geo: normalizedContextKey().optional(),
			surface: z
				.enum([
					"apartments",
					"new-buildings",
					"houses",
					"plots",
					"commercial",
					"garages",
				])
				.optional(),
			district: normalizedContextKey().optional(),
			propertyUrlId: z.string().regex(/^[1-9]\d{0,18}$/).optional(),
			development: normalizedContextKey().optional(),
			developer: normalizedContextKey().optional(),
		})
		.strict()
		.optional(),
	utm: z
		.object({
			source: z.string().trim().max(120).optional().or(z.literal("")),
			medium: z.string().trim().max(120).optional().or(z.literal("")),
			campaign: z.string().trim().max(160).optional().or(z.literal("")),
			content: z.string().trim().max(160).optional().or(z.literal("")),
			term: z.string().trim().max(160).optional().or(z.literal("")),
		})
		.optional(),
	consentAccepted: z.literal(true),
	consentVersion: z.string().trim().min(1).max(120),
	honeypot: z.string().trim().max(200).optional().or(z.literal("")),
	renderedAt: z.string().datetime(),
	submittedAt: z.string().datetime(),
	requestAttemptId: z.string().uuid(),
});

export function prepareLeadIntake(
	input: unknown,
	options?: {
		fraudHmacKey?: string;
		nowIso?: string;
		currentConsentVersion?: string;
		leadRetentionDays?: number | null;
	},
): LeadIntakeResult {
	const parsed = leadIntakeSchema.safeParse(input);
	if (!parsed.success) {
		return reject("lead.invalid_payload", "Payload failed validation.");
	}

	const payload = parsed.data;
	const currentConsentVersion = options?.currentConsentVersion;
	if (!currentConsentVersion) {
		return reject(
			"lead.consent_version_mismatch",
			"Current consent version was not supplied by project composition.",
			payload,
		);
	}
	if (payload.consentVersion !== currentConsentVersion) {
		return reject(
			"lead.consent_version_mismatch",
			"Displayed consent version is not current.",
			payload,
		);
	}

	const sourcePage = normalizeCanonicalSourcePage(payload.sourcePage);
	if (!sourcePage) {
		return reject(
			"lead.source_page_invalid",
			"Source page is not an internal canonical pathname.",
			payload,
		);
	}
	if (payload.honeypot) {
		return reject(
			"lead.honeypot",
			"Anti-spam honeypot field is not empty.",
			payload,
		);
	}

	if (!isFillTimeAcceptable(payload.renderedAt, payload.submittedAt)) {
		return reject(
			"lead.fill_time_invalid",
			"Lead form fill time is outside allowed bounds.",
			payload,
		);
	}

	const phoneE164 = normalizePhoneToE164(payload.phone);
	if (!phoneE164) {
		return reject(
			"lead.invalid_phone",
			"Phone cannot be normalized to E.164.",
			payload,
		);
	}

	const consentedAt = options?.nowIso ?? new Date().toISOString();
	return {
		accepted: true,
		lead: {
			name: payload.name,
			phoneRaw: payload.phone,
			phoneE164,
			email: emptyToUndefined(payload.email),
			message: emptyToUndefined(payload.message),
			formKind: payload.formKind,
			sourcePage,
			referrer: emptyToUndefined(payload.referrer),
			property:
				payload.formKind === "property_request"
					? emptyToUndefined(payload.property)
					: undefined,
			context: normalizeLeadContext(payload.context),
			utm: normalizeUtm(payload.utm),
			consent: {
				accepted: true,
				version: currentConsentVersion,
				consentedAt,
			},
			idempotencyKey: buildLeadIdempotencyKey(payload.requestAttemptId),
			retentionUntil: retentionUntil(consentedAt, options?.leadRetentionDays),
			fraudFingerprint: buildFraudFingerprint(
				{
					phoneE164,
					sourcePage,
					submittedAt: payload.submittedAt,
				},
				options?.fraudHmacKey,
			),
		},
		safeDiagnostics: diagnostics(
			"lead.accepted",
			"Lead intake accepted.",
			payload,
		),
	};
}

export function evaluateLeadRateLimit({
	windowHits,
	limit,
}: LeadRateLimitInput): LeadIntakeRejected | undefined {
	if (windowHits < limit) {
		return undefined;
	}

	return reject(
		"lead.rate_limited",
		"Lead intake rate limit exceeded.",
		undefined,
		429,
	);
}

export function normalizePhoneToE164(value: string): string | undefined {
	const compact = value.replace(/[^\d+]/g, "");
	if (!compact) {
		return undefined;
	}

	if (compact.startsWith("+")) {
		const digits = compact.slice(1);
		return /^\d{10,15}$/.test(digits) ? `+${digits}` : undefined;
	}

	const digits = compact.replace(/\D/g, "");
	if (/^8\d{10}$/.test(digits)) {
		return `+7${digits.slice(1)}`;
	}
	if (/^7\d{10}$/.test(digits)) {
		return `+${digits}`;
	}
	if (/^9\d{9}$/.test(digits)) {
		return `+7${digits}`;
	}
	return /^\d{10,15}$/.test(digits) ? `+${digits}` : undefined;
}

export function buildLeadIdempotencyKey(requestAttemptId: string): string {
	return `lead:${requestAttemptId.toLowerCase()}`;
}

function retentionUntil(
	nowIso: string,
	days?: number | null,
): string | undefined {
	if (!Number.isInteger(days) || !days || days <= 0) return undefined;
	return new Date(new Date(nowIso).getTime() + days * 86_400_000).toISOString();
}

export function normalizeCanonicalSourcePage(
	value: string,
): string | undefined {
	if (
		!value.startsWith("/") ||
		value.startsWith("//") ||
		value.includes("\\")
	) {
		return undefined;
	}
	try {
		const url = new URL(value, "https://internal.invalid");
		if (
			url.origin !== "https://internal.invalid" ||
			url.search ||
			url.hash ||
			url.pathname !== value
		) {
			return undefined;
		}
		return value !== "/" && value.endsWith("/") ? value.slice(0, -1) : value;
	} catch {
		return undefined;
	}
}

export function buildFraudFingerprint(
	input: {
		phoneE164: string;
		sourcePage: string;
		submittedAt: string;
	},
	hmacKey?: string,
): string {
	const submittedDate = input.submittedAt.slice(0, 10);
	const material = [input.phoneE164, input.sourcePage, submittedDate];
	const digest = hmacKey?.trim()
		? createHmac("sha256", hmacKey).update(material.join("\0")).digest("hex")
		: hashSafe(material);
	return `lead-fraud:${digest}`;
}

function isFillTimeAcceptable(
	renderedAt: string,
	submittedAt: string,
): boolean {
	const rendered = new Date(renderedAt).getTime();
	const submitted = new Date(submittedAt).getTime();
	const duration = submitted - rendered;
	return duration >= minimumFillTimeMs && duration <= maximumFillTimeMs;
}

function reject(
	code: LeadIntakeRejected["code"],
	reason: string,
	payload?: z.output<typeof leadIntakeSchema>,
	status: 400 | 429 = 400,
): LeadIntakeRejected {
	return {
		accepted: false,
		status,
		code,
		safeDiagnostics: diagnostics(code, reason, payload),
	};
}

function diagnostics(
	code: string,
	reason: string,
	payload?: Pick<z.output<typeof leadIntakeSchema>, "formKind" | "sourcePage">,
): LeadIntakeDiagnostics {
	return {
		code,
		formKind: payload?.formKind,
		sourcePage: payload?.sourcePage,
		reason,
		rawPiiIncluded: false,
	};
}

function normalizeUtm(input: z.output<typeof leadIntakeSchema>["utm"]) {
	if (!input) {
		return undefined;
	}
	const utm = {
		source: emptyToUndefined(input.source),
		medium: emptyToUndefined(input.medium),
		campaign: emptyToUndefined(input.campaign),
		content: emptyToUndefined(input.content),
		term: emptyToUndefined(input.term),
	};
	return Object.values(utm).some(Boolean) ? utm : undefined;
}

function emptyToUndefined(value: string | undefined): string | undefined {
	const trimmed = value?.trim();
	return trimmed ? trimmed : undefined;
}

function normalizedContextKey() {
	return z
		.string()
		.trim()
		.toLowerCase()
		.regex(/^[a-z0-9][a-z0-9-]{0,119}$/);
}

function normalizeLeadContext(
	context: z.output<typeof leadIntakeSchema>["context"],
): LeadEntityContext | undefined {
	if (!context || !Object.values(context).some(Boolean)) return undefined;
	return context;
}

function hashSafe(parts: string[]): string {
	return createHash("sha256").update(parts.join("\0")).digest("hex");
}
