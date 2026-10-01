const callPattern =
	/\b(?:req\.)?payload\.(find|findByID|count|create|update|delete)\s*\(\s*\{/g;
const explicitMode =
	/overrideAccess\s*:|\.\.\.\s*(?:systemOverrideAccess|publicGatewayReadAccess)\s*\(|\.\.\.\s*(?:access|requestAccess)\b|\.\.\.\s*[A-Za-z][\w]*Access\b|\.\.\.\s*publicGatewayPolicy\b/;

function readObjectLiteral(source, start) {
	let depth = 0;
	let quote = null;
	let escaped = false;
	for (let index = start; index < source.length; index += 1) {
		const char = source[index];
		if (quote) {
			if (escaped) escaped = false;
			else if (char === "\\") escaped = true;
			else if (char === quote) quote = null;
			continue;
		}
		if (char === '"' || char === "'" || char === "`") {
			quote = char;
			continue;
		}
		if (char === "{") depth += 1;
		if (char === "}" && --depth === 0) return source.slice(start, index + 1);
	}
	return source.slice(start);
}

export function findMissingLocalApiModes(source, file = "fixture.ts") {
	const findings = [];
	for (const match of source.matchAll(callPattern)) {
		const start = source.indexOf("{", match.index);
		const object = readObjectLiteral(source, start);
		if (explicitMode.test(object)) continue;
		findings.push({
			file,
			line: source.slice(0, match.index).split(/\r?\n/).length,
			operation: match[1],
		});
	}
	return findings;
}
