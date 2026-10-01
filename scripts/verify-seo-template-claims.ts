import { assertProjectSeoTemplateClaimsAreSourced } from "../src/project/seo/claim-guard.ts";
import { projectSeoClaimSourcesInput } from "../src/project/seo/claim-sources.ts";
import { projectSeoTemplatesInput } from "../src/project/seo/template-inputs.ts";

assertProjectSeoTemplateClaimsAreSourced(
	projectSeoTemplatesInput,
	projectSeoClaimSourcesInput,
);

console.log("SEO template claims guard passed");
