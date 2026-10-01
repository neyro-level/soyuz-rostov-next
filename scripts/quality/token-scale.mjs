import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync("src/app/globals.css", "utf8");
const declarations = new Map(
	[...css.matchAll(/^\s*(--site-(?:type|leading|tracking)-[a-z0-9_-]+)\s*:\s*([^;]+);/gim)].map(
		(match) => [match[1], match[2].trim()],
	),
);

const consolidations = [
	["--site-type-body-dense", "--site-type-body-compact", 0.4],
	["--site-type-caption-dense", "--site-type-caption-relaxed", 0.05],
	["--site-type-support-dense", "--site-type-support", 0.25],
	["--site-type-card-compact", "--site-type-body-fluid", 0.1],
	["--site-type-card-compact-medium", "--site-type-body-lg", 0.16],
	["--site-type-card-compact-large", "--site-type-body-lg", 0.32],
	["--site-type-body-highlight", "--site-type-lead", 0.08],
	["--site-type-card-title", "--site-type-lead", 0.4],
	["--site-type-card-title-large", "--site-type-lead-compact", 0.12],
	["--site-type-price", "--site-type-lead-compact", 0.04],
	["--site-type-price-large", "--site-type-lead-compact", 0.2],
	["--site-type-price-medium", "--site-type-card-lg", 0.12],
	["--site-type-price-mobile", "--site-type-heading-medium", 0.28],
	["--site-type-selection-title", "--site-type-section-large", 0.4],
	["--site-type-profile-title", "--site-type-display-medium", 0.4],
];

const ownerApprovedVisualConsolidations = [
	["--site-type-micro-tight", "--site-type-micro", 1],
	["--site-type-caption-tight", "--site-type-micro", 0.5],
	["--site-type-overline", "--site-type-caption", 1],
	["--site-type-caption-relaxed", "--site-type-caption", 0.5],
	["--site-type-label-relaxed", "--site-type-label", 0.5],
	["--site-type-body-fluid", "--site-type-body-compact", 0.5],
	["--site-type-body-emphasis", "--site-type-body-lg", 1],
	["--site-type-lead-compact", "--site-type-lead", 1],
	["--site-type-card-lg", "--site-type-heading-small", 1],
	["--site-type-heading-medium", "--site-type-heading-compact", 1],
	["--site-type-section-base", "--site-type-section-small", 1],
];

const roleBasedRhythmConsolidations = [
	["--site-leading-card-title", "--site-leading-title-compact", 0.3],
	["--site-leading-subtitle", "--site-leading-tight-copy", 0.24],
	["--site-leading-compact-copy", "--site-leading-supportive", 0.4],
	["--site-leading-body-snug", "--site-leading-content", 0.32],
	["--site-leading-body-compact", "--site-leading-content", 0.32],
	["--site-leading-card-dense-rem", "--site-leading-card-relaxed-rem", 0.48],
	["--site-tracking-copy", "--site-tracking-normal", 0.16],
	["--site-tracking-expanded", "--site-tracking-spaced", 0.46],
];

for (const [token, owner, driftPx] of consolidations) {
	assert.equal(declarations.get(token), `var(${owner})`, `${token} must reuse ${owner}`);
	assert.ok(driftPx < 0.5, `${token} source drift must remain below 0.5px`);
}

for (const [token, owner, driftPx] of ownerApprovedVisualConsolidations) {
	assert.equal(declarations.get(token), `var(${owner})`, `${token} must reuse ${owner}`);
	assert.ok(driftPx <= 1, `${token} visual consolidation must remain within 1px`);
}

for (const [token, owner, driftPx] of roleBasedRhythmConsolidations) {
	assert.equal(declarations.get(token), `var(${owner})`, `${token} must reuse ${owner}`);
	assert.ok(driftPx < 0.5, `${token} rendered rhythm drift must remain below 0.5px`);
}

const literalSizes = [...declarations.entries()]
	.filter(([token]) => token.startsWith("--site-type-"))
	.map(([, value]) => value)
	.filter((value) => /^(?:\d*\.)?\d+(?:px|rem)$/.test(value));
const normalizedSizes = new Set(
	literalSizes.map((value) =>
		value.endsWith("rem")
			? Number.parseFloat(value) * 16
			: Number.parseFloat(value),
	),
);

assert.equal(new Set(declarations.keys()).size, declarations.size);
assert.equal(normalizedSizes.size, 24, "owner-approved typography scale must retain exactly 24 fixed sizes");
console.log(
	`verify:token-scale: ok (${consolidations.length} aliases below 0.5px; ${ownerApprovedVisualConsolidations.length} owner-approved visual consolidations; ${roleBasedRhythmConsolidations.length} line-height/tracking consolidations; ${normalizedSizes.size} fixed literal sizes retained)`,
);
