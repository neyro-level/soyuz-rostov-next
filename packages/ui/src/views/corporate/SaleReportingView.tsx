import { FileChartColumnIncreasing } from "lucide-react";

export function SaleReportingView() {
	return (
		<section
			className="bg-[var(--sale-reporting-surface-primary)] py-14 sm:py-16 lg:py-22"
			aria-labelledby="sale-reporting-title"
		>
			<div className="mx-auto max-w-site-frame px-5">
				<div className="grid overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-card)] md:grid-cols-[minmax(0,3fr)_minmax(280px,2fr)]">
					<div className="flex flex-col justify-center p-6 sm:p-8 lg:p-12">
						<h2
							id="sale-reporting-title"
							className="max-w-190 text-section-title font-semibold leading-section-title text-[var(--text-primary)] text-balance"
						>
							Вы видите реальную динамику продажи, а не слушаете обещания
						</h2>
						<p className="mt-4 max-w-180 text-body-compact leading-step-copy text-[var(--text-muted)] sm:text-body-large sm:leading-step-relaxed">
							Каждую неделю — отчёт по просмотрам, звонкам и показам. Цену
							снижаем только с вашего согласия и только там, где это требует
							рынок.
						</p>
					</div>

					<div className="flex min-h-60 items-center justify-center border-t border-[var(--border)] bg-[var(--accent-soft)] p-8 md:min-h-85 md:border-t-0 md:border-l">
						<div
							className="flex h-47.5 w-40 items-center justify-center rounded-xl border border-[var(--input)] bg-[var(--surface-card)] text-[var(--accent)] shadow-[var(--sale-reporting-shadow-primary)]"
							aria-hidden="true"
						>
							<FileChartColumnIncreasing
								className="size-20"
								strokeWidth={1.35}
							/>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
