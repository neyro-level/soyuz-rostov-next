import type { SiteImageRenderer } from "../../lib/adapters";

const BROKER_SUPPORT_STEPS = [
	"Подберет САМЫЕ ВЫГОДНЫЕ условия ипотечного кредитования;",
	"Ознакомит с информацией о дополнительных расходах, например о страховании ипотеки;",
	"Предоставит список необходимых документов и требований по их оформлению;",
	"Даст рекомендации для повышения вероятности получения ипотечного кредита;",
	"Проконтролирует соответствие предъявляемых документов требованиям банка;",
	"Заполнит объёмные анкеты для банка;",
	"Отправит заявку сразу в несколько банков;",
	"Будет поэтапно отслеживать рассмотрение заявки в банке;",
	"Первым узнает о решении банка и сообщит вам;",
] as const;

export function MortgageBrokerSupportView({
	imageRenderer: ImageRenderer,
	imageSrc,
}: {
	imageRenderer: SiteImageRenderer;
	imageSrc: string;
}) {
	return (
		<section
			className="bg-[var(--surface-card)] pb-14 pt-2 sm:pb-20 sm:pt-4 lg:pb-24 lg:pt-6"
			aria-labelledby="mortgage-broker-support-title"
		>
			<div className="mx-auto grid max-w-site-frame gap-9 px-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-start lg:gap-12">
				<div>
					<h2
						id="mortgage-broker-support-title"
						className="max-w-[19ch] text-section-title font-semibold leading-section-title text-[var(--text-primary)] lg:max-w-none lg:whitespace-nowrap"
					>
						Что сделает для вас наш ипотечный брокер!
					</h2>

					<ol className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2 sm:gap-y-7">
						{BROKER_SUPPORT_STEPS.map((step, index) => (
							<li
								key={step}
								className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-2.5"
							>
								<span className="pt-0.5 text-support font-medium tabular-nums text-[var(--accent)]">
									{String(index + 1).padStart(2, "0")}
								</span>
								<p className="text-body leading-step-copy text-[var(--text-secondary)]">
									{step}
								</p>
							</li>
						))}
					</ol>
				</div>

				<div className="relative mx-auto aspect-[4/5] w-full max-w-90 overflow-hidden rounded-xl bg-[var(--surface-muted)] lg:mx-0 lg:justify-self-end">
					<ImageRenderer
						src={imageSrc}
						alt="Ипотечный брокер агентства недвижимости"
						fill
						sizes="(max-width: 1023px) calc(100vw - 40px), 620px"
						className="object-cover object-[72%_center]"
					/>
				</div>
			</div>
		</section>
	);
}
