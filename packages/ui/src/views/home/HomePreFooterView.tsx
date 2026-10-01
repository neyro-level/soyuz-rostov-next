import { ArrowRight } from "lucide-react";
import type { SiteLinkRenderer } from "../../lib/adapters";

export type HomePopularSearchGroupViewDto = {
	title: string;
	links: Array<{ label: string; href: string }>;
};

export function HomePreFooterView({
	groups,
	linkRenderer: LinkRenderer,
}: {
	groups: HomePopularSearchGroupViewDto[];
	linkRenderer: SiteLinkRenderer;
}) {
	return (
		<section
			id="prefooter-links-home"
			className="home-prefooter"
			aria-labelledby="home-prefooter-title"
		>
			<div className="home-shell">
				<div className="home-prefooter__head">
					<h2 id="home-prefooter-title">Часто ищут</h2>
				</div>
				<div className="home-prefooter__groups">
					{groups.map((group) => (
						<nav
							key={group.title}
							className="home-prefooter__group"
							aria-label={group.title}
						>
							<div className="home-prefooter__group-title">
								<h3>{group.title}</h3>
							</div>
							<div className="home-prefooter__links">
								{group.links.map((link) => (
									<LinkRenderer
										key={link.href}
										href={link.href}
										className="home-prefooter__link group"
									>
										{link.label}
										<ArrowRight
											className="size-4 shrink-0 transition group-hover:translate-x-1"
											aria-hidden
										/>
									</LinkRenderer>
								))}
							</div>
						</nav>
					))}
				</div>
			</div>
		</section>
	);
}
