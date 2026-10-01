import type { BreadcrumbDTO } from "@ams/realtbase-contracts";

export function BreadcrumbsView({
	breadcrumbs,
}: {
	breadcrumbs: BreadcrumbDTO;
}) {
	return (
		<nav
			aria-label="Хлебные крошки"
			className="text-caption text-content-default"
		>
			<ol className="flex flex-wrap items-center gap-2">
				{breadcrumbs.items.map((item, index) => (
					<li key={item.href ?? item.label} className="flex items-center gap-2">
						{index > 0 ? <span aria-hidden>/</span> : null}
						{item.href ? (
							<a
								className="underline-offset-4 hover:underline"
								href={item.href}
							>
								{item.label}
							</a>
						) : (
							<span
								aria-current={
									index === breadcrumbs.items.length - 1 ? "page" : undefined
								}
							>
								{item.label}
							</span>
						)}
					</li>
				))}
			</ol>
		</nav>
	);
}
