import {
	type SeoTierMetric,
	type SiteProfile,
	seoTierMetrics,
} from "../profile/index.ts";
import type { PageKey } from "../routing/url-grammar.ts";

export const seoEvidenceSources = [
	"wordstat",
	"broad39",
	"searchDemand",
	"webmaster",
	"fallback_no_data",
] as const;

export const seoTiers = ["P1", "P2", "TEST", "NONE"] as const;
export const seoRobots = ["index,follow", "noindex,follow"] as const;
export const seoRegistryStatuses = ["draft", "approved", "retired"] as const;

export type SeoEvidenceSource = (typeof seoEvidenceSources)[number];
export type SeoTier = (typeof seoTiers)[number];
export type SeoRobots = (typeof seoRobots)[number];
export type SeoRegistryStatus = (typeof seoRegistryStatuses)[number];

export function deriveSeoTier(
	value: number | null,
	config: SiteProfile["seoTiers"],
): SeoTier {
	if (value === null) return config.unmeasuredPolicy;
	if (!Number.isFinite(value) || value < 0) {
		throw new Error("SEO tier value must be a non-negative number or null.");
	}
	if (value >= config.bands.P1) return "P1";
	if (value >= config.bands.P2) return "P2";
	if (value >= config.bands.TEST) return "TEST";
	return "NONE";
}

export type ApprovedMorphology = {
	approved: boolean;
	nominative: string;
	genitive?: string;
	prepositional?: string;
	preposition?: "в" | "во" | "на";
};

export type SeoTemplateDefinition = {
	title: string;
	h1: string;
	description: string;
};

export type RenderedSeoTemplate = {
	title: string;
	h1: string;
	description: string;
	morphologyApproved: boolean;
};

export type SeoRegistryRow<TemplateKey extends string = string> = {
	pageKey: PageKey;
	url: string;
	canonical: string;
	entityRef: string | null;
	targetPhrases: readonly string[];
	metric: SeoTierMetric;
	value: number | null;
	source: SeoEvidenceSource;
	snapshotDate: string;
	synthetic: boolean;
	tier: SeoTier;
	minimumObjects: number;
	defaultRobots: SeoRobots;
	templateKey: TemplateKey;
	title: string;
	h1: string;
	description: string;
	status: SeoRegistryStatus;
	morphologyApproved: boolean;
	release: string;
	contentGateRule: string;
};

export type SeoRegistryGuardInput = {
	rows: readonly SeoRegistryRow[];
	buildUrl: (pageKey: PageKey) => string;
	now?: Date;
};

type TemplateValues = Readonly<
	Record<string, string | number | null | undefined>
>;

function normalizeRenderedText(value: string): string {
	return value
		.replace(/\s+/g, " ")
		.replace(/\s+([,.;:!?])/g, "$1")
		.trim();
}

function interpolate(pattern: string, values: TemplateValues): string {
	const withoutMissingOptionals = pattern.replace(/\[(.*?)\]/g, (_, part) => {
		const names = [...part.matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map(
			(match) => match[1],
		);
		return names.every(
			(name) =>
				values[name] !== null &&
				values[name] !== undefined &&
				String(values[name]).trim(),
		)
			? part
			: "";
	});
	return normalizeRenderedText(
		withoutMissingOptionals.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, name) => {
			const value = values[name];
			if (value === null || value === undefined || !String(value).trim()) {
				throw new Error(`SEO template requires ${name}.`);
			}
			return String(value).trim();
		}),
	);
}

export function renderSeoDefinition(
	definition: SeoTemplateDefinition,
	values: TemplateValues,
	morphologyApproved: boolean,
): RenderedSeoTemplate {
	return {
		title: interpolate(definition.title, values),
		h1: interpolate(definition.h1, values),
		description: interpolate(definition.description, values),
		morphologyApproved,
	};
}

export function morphologyPhrase(
	value: ApprovedMorphology | undefined,
	form: "nominative" | "genitive" | "prepositional",
	withPreposition = false,
): string | undefined {
	if (!value) return undefined;
	const inflected = value[form]?.trim();
	if (!inflected) return undefined;
	if (!withPreposition) return inflected;
	const preposition = value.preposition?.trim();
	return preposition ? `${preposition} ${inflected}` : undefined;
}

export function isApprovedMorphology(
	...values: readonly (ApprovedMorphology | undefined)[]
): boolean {
	return values.every((value) =>
		Boolean(value?.approved && value.preposition?.trim()),
	);
}

export function formatRussianPlural(
	value: number,
	forms: readonly [string, string, string],
): string {
	if (!Number.isSafeInteger(value) || value < 0) {
		throw new Error("Plural value must be a non-negative safe integer.");
	}
	const mod100 = value % 100;
	const mod10 = value % 10;
	const form =
		mod100 >= 11 && mod100 <= 14
			? forms[2]
			: mod10 === 1
				? forms[0]
				: mod10 >= 2 && mod10 <= 4
					? forms[1]
					: forms[2];
	return `${value} ${form}`;
}

function normalizeIntent(phrase: string): string {
	return phrase.trim().toLocaleLowerCase("ru-RU").replace(/\s+/g, " ");
}

function assertSnapshotDate(value: string, now: Date): void {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		throw new Error(`SEO snapshot date must use YYYY-MM-DD: ${value}`);
	}
	const parsed = new Date(`${value}T00:00:00.000Z`);
	if (
		Number.isNaN(parsed.getTime()) ||
		parsed.toISOString().slice(0, 10) !== value
	) {
		throw new Error(`SEO snapshot date is invalid: ${value}`);
	}
	if (parsed.getTime() > now.getTime()) {
		throw new Error(`SEO snapshot date cannot be in the future: ${value}`);
	}
}

export function assertSeoRegistry(input: SeoRegistryGuardInput): void {
	const urls = new Set<string>();
	const canonicals = new Set<string>();
	const intents = new Set<string>();
	const now = input.now ?? new Date();

	for (const row of input.rows) {
		if (!(seoTierMetrics as readonly string[]).includes(row.metric)) {
			throw new Error(`Unsupported SEO tier metric: ${row.metric}`);
		}
		if (!(seoEvidenceSources as readonly string[]).includes(row.source)) {
			throw new Error(`Unsupported SEO evidence source: ${row.source}`);
		}
		if (!(seoTiers as readonly string[]).includes(row.tier)) {
			throw new Error(`Unsupported SEO tier: ${row.tier}`);
		}
		if (!(seoRobots as readonly string[]).includes(row.defaultRobots)) {
			throw new Error(`Unsupported SEO robots directive: ${row.defaultRobots}`);
		}
		if (!(seoRegistryStatuses as readonly string[]).includes(row.status)) {
			throw new Error(`Unsupported SEO registry status: ${row.status}`);
		}
		const expectedUrl = input.buildUrl(row.pageKey);
		if (row.url !== expectedUrl) {
			throw new Error(`SEO URL differs from buildUrl(PageKey): ${row.url}`);
		}
		if (row.canonical !== expectedUrl) {
			throw new Error(
				`SEO canonical differs from buildUrl(PageKey): ${row.canonical}`,
			);
		}
		if (urls.has(row.url)) throw new Error(`Duplicate SEO URL: ${row.url}`);
		if (canonicals.has(row.canonical)) {
			throw new Error(`Duplicate SEO canonical: ${row.canonical}`);
		}
		urls.add(row.url);
		canonicals.add(row.canonical);

		if (!row.targetPhrases.length) {
			throw new Error(`SEO target phrases are empty: ${row.url}`);
		}
		for (const phrase of row.targetPhrases) {
			const intent = normalizeIntent(phrase);
			if (!intent) throw new Error(`SEO target phrase is blank: ${row.url}`);
			if (intents.has(intent))
				throw new Error(`Duplicate SEO intent: ${intent}`);
			intents.add(intent);
		}

		assertSnapshotDate(row.snapshotDate, now);
		if (row.source === "fallback_no_data") {
			if (row.value !== null) {
				throw new Error(`fallback_no_data must keep value null: ${row.url}`);
			}
		} else if (
			row.value === null ||
			!Number.isFinite(row.value) ||
			row.value < 0
		) {
			throw new Error(
				`Measured SEO evidence needs a non-negative value: ${row.url}`,
			);
		}
		if (!Number.isSafeInteger(row.minimumObjects) || row.minimumObjects < 0) {
			throw new Error(`SEO minimumObjects is invalid: ${row.url}`);
		}
		if (!row.morphologyApproved && row.defaultRobots === "index,follow") {
			throw new Error(`Unapproved morphology cannot be indexable: ${row.url}`);
		}
		if (
			row.synthetic &&
			(row.status === "approved" || row.defaultRobots === "index,follow")
		) {
			throw new Error(
				`Synthetic SEO row cannot be approved or indexable: ${row.url}`,
			);
		}
		for (const [field, value] of [
			["title", row.title],
			["h1", row.h1],
			["description", row.description],
		] as const) {
			if (!value.trim()) throw new Error(`SEO ${field} is empty: ${row.url}`);
		}
	}
}
