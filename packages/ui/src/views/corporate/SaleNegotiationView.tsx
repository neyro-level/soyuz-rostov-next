import { FileCheck2, FileSearch, ShieldCheck } from "lucide-react";
import type { SiteImageRenderer } from "../../lib/adapters";

const DEAL_STEPS = [
	{
		title: "Защищаем цену при торге",
		description:
			"Уступаем только там, где это требует рынок. В остальных случаях держим вашу цену.",
		icon: ShieldCheck,
	},
	{
		title: "Проверяем покупателя до сделки",
		description:
			"Смотрим документы и источники денег до того, как вы пойдёте на сделку.",
		icon: FileSearch,
	},
	{
		title: "Сопровождаем регистрацию в Росреестре",
		description:
			"Готовим договор и контролируем процесс до полной регистрации сделки.",
		icon: FileCheck2,
	},
] as const;

export function SaleNegotiationView({
	image,
	imageRenderer: ImageRenderer,
}: {
	image: string;
	imageRenderer: SiteImageRenderer;
}) {
	return (
		<section
			className="bg-[var(--surface-card)] py-14 sm:py-16 lg:py-22"
			aria-labelledby="sale-negotiation-title"
		>
			<div className="mx-auto grid max-w-site-frame gap-9 px-5 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-stretch md:gap-10 lg:gap-14">
				<div className="relative min-h-105 overflow-hidden rounded-xl bg-[var(--sale-negotiation-surface-primary)] md:min-h-140">
					<ImageRenderer
						src={image}
						alt="Риелтор и собственник проверяют документы перед сделкой"
						fill
						sizes="(max-width: 767px) calc(100vw - 40px), 42vw"
						className="object-cover object-center"
					/>
				</div>
				<div className="md:flex md:flex-col md:justify-center">
					<div className="max-w-190">
						<h2
							id="sale-negotiation-title"
							className="text-section-title font-semibold leading-section-title text-[var(--text-primary)] text-balance"
						>
							Защищаем вашу цену на торге и проверяем покупателя до сделки
						</h2>
						<p className="mt-4 max-w-170 text-body-compact leading-step-copy text-[var(--text-muted)] sm:text-body-large sm:leading-step-relaxed">
							Потери случаются на торге и в документах. Мы контролируем оба
							этапа.
						</p>
					</div>
					<div className="relative mt-8 sm:mt-9">
						<span
							className="absolute top-6 bottom-6 left-[21px] w-px bg-[var(--input)]"
							aria-hidden
						/>
						{DEAL_STEPS.map(({ title, description, icon: Icon }) => (
							<article
								key={title}
								className="relative flex gap-4 border-b border-[var(--border)] py-5 first:pt-0 last:border-b-0 last:pb-0 sm:gap-5"
							>
								<span
									className="relative z-10 flex size-11 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-card)] text-[var(--accent)]"
									aria-hidden
								>
									<Icon className="size-[20px]" strokeWidth={1.6} />
								</span>
								<div className="pt-0.5">
									<h3 className="text-body-large font-semibold leading-compact-copy text-[var(--text-primary)]">
										{title}
									</h3>
									<p className="mt-2 max-w-[58ch] text-support leading-step-body text-[var(--text-muted)]">
										{description}
									</p>
								</div>
							</article>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}
