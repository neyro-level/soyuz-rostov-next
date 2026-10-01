import type { SeoTemplateDefinition } from "../../core/seo/registry.ts";

export const projectSeoClaimTerms = {
	verified: /проверенн/iu,
	best: /лучший/iu,
	reliable: /надёжн/iu,
	numberOne: /№\s*1/iu,
	official: /официальн/iu,
} as const;

export type ProjectSeoClaimTerm = keyof typeof projectSeoClaimTerms;
export type ProjectSeoClaimSource = { decision: string };

export function assertProjectSeoTemplateClaimsAreSourced(
	templates: Readonly<Record<string, SeoTemplateDefinition>>,
	sources: Partial<Record<ProjectSeoClaimTerm, ProjectSeoClaimSource>>,
): void {
	const content = Object.values(templates)
		.flatMap((template) => [template.title, template.h1, template.description])
		.join("\n");
	for (const [term, pattern] of Object.entries(projectSeoClaimTerms) as [
		ProjectSeoClaimTerm,
		RegExp,
	][]) {
		if (!pattern.test(content)) continue;
		if (!sources[term]?.decision.trim()) {
			throw new Error(
				`SEO template claim requires a sourced project decision: ${term}.`,
			);
		}
	}
}
