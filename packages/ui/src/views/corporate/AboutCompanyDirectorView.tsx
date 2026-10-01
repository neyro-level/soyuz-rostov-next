import type { SiteImageRenderer } from "../../lib/adapters";

export type AboutCompanyDirectorViewProps = {
	director: { image: string; name: string; role: string; quote: string };
	imageRenderer: SiteImageRenderer;
};

const DIRECTOR_PRINCIPLES = [
	{
		title: "Проверяем документы до аванса",
		description: "Находим риски до передачи денег и подписания договора.",
	},
	{
		title: "Подключаем нужных специалистов",
		description:
			"Юрист и ипотечный брокер участвуют в сделке там, где это действительно необходимо.",
	},
	{
		title: "Ведём сделку до завершения",
		description: "Контролируем договор, расчёты и переход права собственности.",
	},
] as const;

export function AboutCompanyDirectorView({
	director,
	imageRenderer: ImageRenderer,
}: AboutCompanyDirectorViewProps) {
	return (
		<section
			className="bg-[var(--about-company-director-surface-primary)] py-12 sm:py-16 lg:py-14"
			aria-label="Слово директора"
		>
			<div className="mx-auto max-w-site-frame px-5">
				<div className="grid gap-8 lg:grid-cols-[minmax(320px,0.72fr)_minmax(0,1.28fr)] lg:items-stretch lg:gap-12">
					<figure className="relative min-h-105 overflow-hidden rounded-xl bg-[var(--about-company-director-surface-secondary)] sm:min-h-125">
						<ImageRenderer
							src={director.image}
							alt={director.name}
							fill
							sizes="(max-width: 1024px) 100vw, 520px"
							className="object-cover object-top"
						/>
					</figure>
					<div className="flex flex-col justify-center">
						<blockquote className="max-w-190 text-section-small font-semibold leading-tight-copy text-[var(--text-primary)] sm:text-heading-large">
							{director.quote}
						</blockquote>
						<p className="mt-6 max-w-190 text-body-large leading-step-relaxed text-[var(--about-company-director-content-primary)]">
							Я не раз видел, как сделка срывалась перед подписанием, потому что
							документы проверили слишком поздно. Поэтому в агентстве
							недвижимости проверка начинается до аванса, а агент работает
							вместе с юристом и ипотечным брокером.
						</p>
						<div className="mt-6 border-l-2 border-[var(--accent)] pl-4">
							<p className="text-body-large font-semibold text-[var(--text-primary)]">
								{director.name}
							</p>
							<p className="mt-1 text-body leading-step-copy text-[var(--about-company-director-content-primary)]">
								{director.role}
							</p>
						</div>
						<div className="mt-8 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-card)]">
							{DIRECTOR_PRINCIPLES.map((item, index) => (
								<article
									key={item.title}
									className={`grid grid-cols-[36px_1fr] gap-4 p-4 sm:p-5 ${index < DIRECTOR_PRINCIPLES.length - 1 ? "border-b border-[var(--border)]" : ""}`}
								>
									<span className="text-support font-semibold text-[var(--accent)]">
										0{index + 1}
									</span>
									<div>
										<h3 className="text-body-large font-semibold leading-compact-copy text-[var(--text-primary)]">
											{item.title}
										</h3>
										<p className="mt-2 text-body leading-step-copy text-[var(--about-company-director-content-primary)]">
											{item.description}
										</p>
									</div>
								</article>
							))}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
