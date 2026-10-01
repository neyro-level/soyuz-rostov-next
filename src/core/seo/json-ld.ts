const jsonLdEscapePattern = /[<>&\u2028\u2029]/g;
const jsonLdEscapes: Record<string, string> = {
	"<": "\\u003c",
	">": "\\u003e",
	"&": "\\u0026",
	"\u2028": "\\u2028",
	"\u2029": "\\u2029",
};

export function serializeJsonLdSafely(data: Record<string, unknown>): string {
	return JSON.stringify(data).replace(
		jsonLdEscapePattern,
		(character) => jsonLdEscapes[character] ?? character,
	);
}
