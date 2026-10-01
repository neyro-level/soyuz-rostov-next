import type { PageLinkDTO } from "@ams/realtbase-contracts";

export function GeoSwitcherView({
	mode,
	activeGeo,
	options,
}: {
	mode: "SINGLE_GEO" | "MULTI_GEO";
	activeGeo?: string;
	options: readonly PageLinkDTO[];
}) {
	if (mode === "SINGLE_GEO" || options.length < 2) return null;
	return (
		<nav
			aria-label="Выбор города"
			className="flex flex-wrap items-center gap-2"
		>
			<span className="text-label font-semibold text-content-default">
				Город:
			</span>
			{options.map((option) => {
				const active =
					option.pageKey.kind === "geoHub" && option.pageKey.geo === activeGeo;
				return (
					<a
						key={option.href}
						href={option.href}
						aria-current={active ? "page" : undefined}
						className={`inline-flex min-h-11 items-center rounded-md border px-4 font-semibold transition-colors hover:border-action-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary ${active ? "border-action-primary bg-surface-subtle text-action-primary" : "border-border"}`}
					>
						{option.label}
					</a>
				);
			})}
		</nav>
	);
}
