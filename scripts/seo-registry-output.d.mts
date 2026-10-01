import type { SeoRegistryRow } from "../src/core/seo/registry.ts";
import type { ProjectSeoTemplateKey } from "../src/project/seo/templates.ts";
import type { ProjectDistrictRouteRegistry } from "../src/project/url-grammar.ts";

export const seoRegistryColumns: readonly string[];

export function renderSeoRegistryCsv(
	columns: readonly string[],
	rows: readonly SeoRegistryRow<ProjectSeoTemplateKey>[],
): string;
export function deterministicSeoRegistryValidationNow(
	rows: readonly SeoRegistryRow<ProjectSeoTemplateKey>[],
): string;
export function renderSeoRegistryModule(
	rows: readonly SeoRegistryRow<ProjectSeoTemplateKey>[],
	districtRegistry: ProjectDistrictRouteRegistry,
	validationNow?: string,
): string;
