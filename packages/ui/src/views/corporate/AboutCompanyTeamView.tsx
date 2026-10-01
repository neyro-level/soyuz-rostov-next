import type { SiteImageRenderer } from "../../lib/adapters";

export type AboutCompanyTeamPhoto = {
	src: string;
	alt: string;
	caption: string;
};

export function AboutCompanyTeamView({
	photos,
	imageRenderer: ImageRenderer,
}: {
	photos: readonly AboutCompanyTeamPhoto[];
	imageRenderer: SiteImageRenderer;
}) {
	const [featuredPhoto, ...supportingPhotos] = photos;
	if (!featuredPhoto) return null;
	return (
		<section
			className="bg-[var(--about-company-team-surface-primary)] py-12 sm:py-16 lg:py-18"
			aria-labelledby="about-team-title"
		>
			<div className="mx-auto max-w-site-frame px-5">
				<h2
					id="about-team-title"
					className="text-section-title font-semibold leading-section-title text-[var(--text-primary)]"
				>
					Команда агентства недвижимости в работе
				</h2>
				<p className="mt-4 max-w-205 text-body-large leading-step-relaxed text-[var(--about-company-team-content-primary)] lg:max-w-none lg:whitespace-nowrap">
					Агент ведёт клиента на каждом этапе, а юрист и ипотечный брокер
					подключаются там, где это необходимо.
				</p>
				<div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.42fr)_minmax(320px,0.58fr)]">
					<TeamPhoto
						photo={featuredPhoto}
						imageRenderer={ImageRenderer}
						className="h-85 sm:col-span-2 sm:h-105 lg:col-span-1 lg:h-135"
						sizes="(max-width: 1024px) 100vw, 860px"
					/>
					<div className="grid gap-5 sm:contents lg:grid lg:gap-5">
						{supportingPhotos.map((photo) => (
							<TeamPhoto
								key={photo.caption}
								photo={photo}
								imageRenderer={ImageRenderer}
								className="h-60 sm:h-65 lg:h-65"
								sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 420px"
							/>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}

function TeamPhoto({
	photo,
	imageRenderer: ImageRenderer,
	className,
	sizes,
}: {
	photo: AboutCompanyTeamPhoto;
	imageRenderer: SiteImageRenderer;
	className: string;
	sizes: string;
}) {
	return (
		<figure
			className={`group relative overflow-hidden rounded-xl bg-[var(--surface-muted)] ${className}`}
		>
			<ImageRenderer
				src={photo.src}
				alt={photo.alt}
				fill
				sizes={sizes}
				className="object-cover transition duration-300 group-hover:scale-[1.01]"
			/>
			<div
				className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/72 to-transparent"
				aria-hidden
			/>
			<figcaption className="absolute inset-x-0 bottom-0 p-5 text-body font-semibold leading-step-copy text-white sm:p-6">
				{photo.caption}
			</figcaption>
		</figure>
	);
}
