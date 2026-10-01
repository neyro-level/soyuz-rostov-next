import type { ReactNode } from "react";

export function AboutCompanyFinalCtaView({ form }: { form: ReactNode }) {
	return (
		<section
			id="about-company-consultation"
			className="bg-[var(--surface-card)] py-12 sm:py-16 lg:py-22"
			aria-labelledby="about-company-consultation-title"
		>
			<div className="mx-auto max-w-site-frame px-5 md:px-8 lg:px-10">
				<div className="w-full rounded-2xl border border-[var(--corporate-form-section-views-border-primary)] bg-[var(--corporate-form-section-views-surface-primary)] px-5 py-9 text-center shadow-[var(--corporate-form-section-views-shadow-primary)] sm:px-10 sm:py-12 lg:px-16 lg:py-14">
					<h2
						id="about-company-consultation-title"
						className="mx-auto max-w-225 text-section-title font-semibold leading-section-title text-[var(--corporate-form-section-views-content-primary)]"
					>
						Расскажите, какая у вас задача по недвижимости
					</h2>
					<p className="mx-auto mt-4 max-w-190 text-body-compact leading-step-relaxed text-[var(--corporate-form-section-views-content-secondary)]">
						Подскажем, с какого шага лучше начать: подбор объекта, продажа,
						ипотека, новостройка или юридическая проверка.
					</p>
					<div className="mx-auto mt-8 max-w-150 text-left text-[var(--corporate-form-section-views-content-primary)] [&>form]:mt-0">
						{form}
					</div>
				</div>
			</div>
		</section>
	);
}

export function MortgageConsultationView({
	form,
	title,
	subtitle,
}: {
	form: ReactNode;
	title: ReactNode;
	subtitle: string;
}) {
	return (
		<section
			className="bg-[var(--surface-card)] pb-16 pt-0 sm:pb-20 lg:pb-24"
			aria-labelledby="mortgage-consultation-title"
		>
			<div className="mx-auto max-w-site-frame px-5">
				<div className="border-t border-[var(--border)] px-0 pb-1 pt-9 sm:pt-11 lg:pt-12">
					<div className="mx-auto max-w-210 text-center">
						<h2
							id="mortgage-consultation-title"
							className="text-section-title font-semibold leading-section-title text-[var(--text-primary)]"
						>
							{title}
						</h2>
						<p className="mt-3 text-body leading-body text-[var(--corporate-form-section-views-content-tertiary)] sm:text-body-compact">
							{subtitle}
						</p>
					</div>
					<div className="mx-auto max-w-240">{form}</div>
				</div>
			</div>
		</section>
	);
}
