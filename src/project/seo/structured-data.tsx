import { serializeJsonLdSafely } from "../../core/seo/json-ld.ts";

export * from "./structured-data-builders.ts";

type JsonLd = Record<string, unknown>;

export function JsonLdScript({ data }: { data: JsonLd }) {
	return (
		<script
			type="application/ld+json"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: the canonical serializer escapes HTML-significant code points.
			dangerouslySetInnerHTML={{ __html: serializeJsonLdSafely(data) }}
		/>
	);
}
