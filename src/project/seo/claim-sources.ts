import type {
	ProjectSeoClaimSource,
	ProjectSeoClaimTerm,
} from "./claim-guard.ts";

/** Project-owned opt-in only: each evaluative SEO claim requires its source decision. */
export const projectSeoClaimSourcesInput = {} as const satisfies Partial<
	Record<ProjectSeoClaimTerm, ProjectSeoClaimSource>
>;
