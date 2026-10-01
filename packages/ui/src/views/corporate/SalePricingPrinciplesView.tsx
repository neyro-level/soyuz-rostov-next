import {
	ChartNoAxesColumnIncreasing,
	ShieldCheck,
	SlidersHorizontal,
} from "lucide-react";

const PRICING_PRINCIPLES = [
	{
		title: "Считаем цену по реальным сделкам",
		description:
			"Изучаем фактические продажи в районе, а не завышенные цены в объявлениях.",
		icon: ChartNoAxesColumnIncreasing,
	},
	{
		title: "Учитываем ремонт, этаж и район",
		description:
			"Оцениваем состояние квартиры, этаж и двор, чтобы цена была объективной.",
		icon: SlidersHorizontal,
	},
	{
		title: "Защищаем цену при торге",
		description:
			"Отстаиваем вашу стоимость. Уступаем покупателю только там, где это требует рынок.",
		icon: ShieldCheck,
	},
] as const;

export function SalePricingPrinciplesView() {
	return (
		<section
			className="bg-[var(--surface-card)] pt-12 pb-14 md:pt-16 md:pb-20 lg:pt-20 lg:pb-24"
			aria-labelledby="sale-pricing-principles-title"
		>
			<div className="mx-auto max-w-site-frame px-5">
				<div className="max-w-225">
					<h2
						id="sale-pricing-principles-title"
						className="text-section-title font-semibold leading-section-title text-[var(--text-primary)] text-balance"
					>
						Называем реальную цену, чтобы продать выгодно и без долгого ожидания
					</h2>
				</div>

				<div className="mt-8 grid gap-4 sm:mt-9 sm:grid-cols-2 md:grid-cols-3 lg:gap-5">
					{PRICING_PRINCIPLES.map(({ title, description, icon: Icon }) => (
						<article
							key={title}
							className="group flex min-h-46 flex-col rounded-2xl bg-[var(--sale-pricing-principles-surface-primary)] p-5 transition duration-300 ease-out hover:-translate-y-0.5 hover:bg-[var(--accent-soft)] hover:shadow-[var(--sale-pricing-principles-shadow-primary)] sm:p-6"
						>
							<span
								className="flex size-10 items-center justify-center rounded-xl bg-[var(--surface-card)] text-[var(--text-secondary)] transition duration-300 group-hover:text-[var(--accent)]"
								aria-hidden="true"
							>
								<Icon className="size-[18px]" strokeWidth={1.6} />
							</span>
							<h3 className="mt-5 text-body-large font-semibold leading-compact-copy text-[var(--text-primary)]">
								{title}
							</h3>
							<p className="mt-2 max-w-[var(--container-copy-measure)] text-support leading-step-body text-[var(--text-muted)]">
								{description}
							</p>
						</article>
					))}
				</div>
			</div>
		</section>
	);
}
