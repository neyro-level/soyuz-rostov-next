import { Card } from "../../components/ui/card";
import type { CorporateArticlePreviewDTO } from "../../view-models/content";
import type { SiteLinkRenderer } from "../../lib/adapters";

export function CorporateRelatedArticlesView({
	articles,
	linkRenderer: LinkRenderer,
}: {
	articles: readonly CorporateArticlePreviewDTO[];
	linkRenderer: SiteLinkRenderer;
}) {
	if (!articles.length) return null;
	return (
		<section
			className="bg-[var(--surface-subtle)] py-10 lg:py-14"
			aria-labelledby="related-articles-title"
		>
			<div className="mx-auto max-w-site-frame px-5">
				<h2
					id="related-articles-title"
					className="text-section-title font-extrabold leading-section-title text-[var(--text-primary)]"
				>
					Полезные материалы
				</h2>
				<div className="mt-6 grid gap-4 md:grid-cols-3">
					{articles.slice(0, 3).map((article) => (
						<Card
							key={article.slug}
							className="rounded-lg border-[var(--border)] bg-[var(--surface-card)] p-5 shadow-none"
						>
							<h3 className="text-body-emphasis font-extrabold leading-card text-[var(--text-primary)]">
								<LinkRenderer
									href={`/journal/${article.slug}`}
									className="transition hover:text-[var(--accent)]"
								>
									{article.title}
								</LinkRenderer>
							</h3>
							<p className="mt-3 line-clamp-3 text-body leading-body text-[var(--text-secondary)]">
								{article.excerpt}
							</p>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}
