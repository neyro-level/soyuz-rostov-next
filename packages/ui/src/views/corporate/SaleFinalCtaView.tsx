import { RequestModalButton } from "../../components/shared/site-overlay-context";

export function SaleFinalCtaView({ microtext }: { microtext: string }) {
	return (
		<section
			className="bg-[var(--surface-card)] py-14 sm:py-16 lg:py-22"
			aria-labelledby="sale-final-cta-title"
		>
			<div className="mx-auto max-w-site-frame px-5">
				<div className="rounded-xl bg-[var(--text-primary)] px-6 py-12 text-center text-white sm:px-10 sm:py-16 lg:px-16 lg:py-20">
					<h2
						id="sale-final-cta-title"
						className="mx-auto max-w-205 text-section-title font-semibold leading-section-title text-balance"
					>
						Работаем за фиксированную комиссию без скрытых платежей
					</h2>
					<p className="mx-auto mt-4 max-w-180 text-body-compact leading-step-copy text-white/70 sm:text-body-large sm:leading-step-relaxed">
						Оценка, фотосъёмка, реклама, переговоры и регистрация уже включены в
						эту сумму.
					</p>

					<RequestModalButton
						type="button"
						variant="plain"
						request={{
							title: "Получите план продаж объекта недвижимости.",
							subtitle:
								"Оценка, фотосъёмка, реклама, переговоры и регистрация уже включены в эту сумму.",
							source: "corporate:prodazha-nedvizhimosti:final",
							formType: "corporate_prodazha_nedvizhimosti_city",
						}}
						className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-[var(--accent)] px-6 text-body font-semibold text-white transition hover:bg-[var(--accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto sm:min-w-65"
					>
						Получить план продажи
					</RequestModalButton>
					<p className="mt-3 text-label leading-step-body text-white/55">
						{microtext}
					</p>
				</div>
			</div>
		</section>
	);
}
