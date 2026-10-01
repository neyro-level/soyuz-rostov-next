import type { SiteImageRenderer } from "../../lib/adapters";

export type HomeDirectorViewDto = {
	name: string;
	role: string;
	quote: string;
	image: string;
};
export type HomeDirectorStatementViewDto = {
	eyebrow: string;
	titleLines: string[];
	paragraphs: string[];
	stats: Array<{ value: string; label: string }>;
	photoBadge: string;
};

type HomeWhyChooseViewProps = {
	director: HomeDirectorViewDto;
	statement: HomeDirectorStatementViewDto;
	imageRenderer: SiteImageRenderer;
};

export function HomeWhyChooseView({
	director,
	statement,
	imageRenderer: ImageRenderer,
}: HomeWhyChooseViewProps) {
	return (
		<section
			id="section-home-why-choose"
			className="home-why"
			aria-labelledby="home-why-choose-title"
		>
			<div className="home-shell">
				<div className="home-why__panel">
					<div className="home-why__content">
						<p className="home-why__eyebrow">{statement.eyebrow}</p>
						<h2 id="home-why-choose-title" className="home-why__title">
							{statement.titleLines.map((line) => (
								<span key={line}>{line}</span>
							))}
						</h2>
						<span className="home-why__accent" aria-hidden="true" />
						<div className="home-why__text">
							{statement.paragraphs.map((paragraph) => (
								<p key={paragraph}>{paragraph}</p>
							))}
						</div>
						<dl
							className="home-why__stats"
							aria-label="Факты о работе агентства"
						>
							{statement.stats.map((stat) => (
								<div key={stat.label} className="home-why__stat">
									<dt>{stat.value}</dt>
									<dd>{stat.label}</dd>
								</div>
							))}
						</dl>
						<div className="home-why__signature">
							<p className="home-why__director-name">{director.name}</p>
							<p className="home-why__director-role">{director.role}</p>
						</div>
					</div>
					<figure className="home-why__director" aria-label={director.name}>
						<div className="home-why__photo">
							<ImageRenderer
								src={director.image}
								alt={director.name}
								fill
								sizes="(max-width: 1100px) 100vw, 440px"
								className="home-why__director-image"
							/>
							<span className="home-why__photo-badge">
								{statement.photoBadge}
							</span>
						</div>
						<figcaption className="home-why__quote">
							{director.quote}
						</figcaption>
					</figure>
				</div>
			</div>
		</section>
	);
}
