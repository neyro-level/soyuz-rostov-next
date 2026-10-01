export { decidePage, type PageDecision } from "./page-decision.ts";
export {
	createRouteResolver,
	type ResolverDataPort,
	type ResolverPageRecord,
	type ResolverPageResult,
	type ResolverRedirectRecord,
	type ResolverResult,
	type RouteDecision,
	type RouteResolver,
	resolveRouteDecision,
} from "./resolver.ts";
export {
	createUrlGrammar,
	type DevelopmentKind,
	isPlatformReservedRoot,
	type PageKey,
	type PropertySurfaceSlug,
	platformReservedRoots,
	propertySurfaceSlugs,
	transliterateToSlug,
	type UrlGrammar,
	type UrlGrammarInput,
} from "./url-grammar.ts";
