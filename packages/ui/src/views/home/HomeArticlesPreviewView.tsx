import { ArrowRight, CalendarDays } from "lucide-react";
import type { ReactNode } from "react";
import type {
	JournalArticleCardDTO,
	JournalCategoryLinkDTO,
} from "../../view-models/content";
import type { SiteImageRenderer, SiteLinkRenderer } from "../../lib/adapters";
import "../../styles/home-articles.css";

export function HomeArticlesPreviewView({
	articles,
	categories,
	linkRenderer: LinkRenderer,
	imageRenderer: ImageRenderer,
	scrollHint,
	journalHref,
}: {
	articles: readonly JournalArticleCardDTO[];
	categories: readonly JournalCategoryLinkDTO[];
	linkRenderer: SiteLinkRenderer;
	imageRenderer: SiteImageRenderer;
	scrollHint?: ReactNode;
	journalHref: string;
}) {
	if (!articles.length) return null;
	return (
		<section
			id="section-home-articles"
			className="home-articles"
			aria-labelledby="home-articles-title"
		>
			<div className="home-articles__shell">
				<div className="home-articles__head">
					<LinkRenderer href={journalHref} className="home-articles__title-link">
						<h2 id="home-articles-title">Журнал агентства</h2>
						<ArrowRight className="size-4" aria-hidden />
					</LinkRenderer>
				</div>
				<nav className="home-articles__chips" aria-label="Рубрики журнала">
					{categories.map((category) => (
						<LinkRenderer
							key={category.slug}
							href={category.href}
							className="home-articles__chip"
						>
							{category.title}
						</LinkRenderer>
					))}
				</nav>
				<div className="home-articles__carousel-shell">
					<div id="home-articles-track" className="home-articles__track">
						<div className="home-articles__grid">
							{articles.map((article) => (
								<LinkRenderer
									key={article.slug}
									href={article.href}
									className="home-articles__card group"
								>
									<div className="home-articles__card-media">
										<ImageRenderer
											src={article.image}
											alt=""
											fill
											loading="lazy"
											sizes="(max-width: 640px) calc(100vw - 48px), (max-width: 1100px) 50vw, 25vw"
											className="home-articles__card-image"
										/>
									</div>
									<div className="home-articles__card-body">
										<span className="home-articles__date">
											<CalendarDays className="size-4" aria-hidden />
											{article.dateLabel}
										</span>
										<h3>{article.title}</h3>
										<p>{article.excerpt}</p>
									</div>
								</LinkRenderer>
							))}
						</div>
					</div>
					{scrollHint}
				</div>
			</div>
		</section>
	);
}
