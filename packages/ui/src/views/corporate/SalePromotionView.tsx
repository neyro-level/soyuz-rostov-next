import { Globe2 } from "lucide-react";

function getPromotionChannels(cityGenitive: string, cityPrepositional: string) {
	return [
		{
			title: `Корпоративный сайт и порталы ${cityGenitive}`,
			description:
				"Объявление выходит на главных площадках города. Обновляем размещение, чтобы оно не терялось в выдаче.",
			icon: <Globe2 className="size-[20px]" strokeWidth={1.6} />,
		},
		{
			title: "Группа ВКонтакте",
			description: `Публикуем отдельный пост по каждой квартире. Аудитория — 15 000 подписчиков в ${cityPrepositional}.`,
			icon: <VkIcon />,
		},
		{
			title: "Партнёрская сеть риелторов",
			description:
				"Отправляем объект в закрытый канал агентов в мессенджере MAX. Если у коллеги есть покупатель — сделка идёт быстрее.",
			icon: <MaxIcon />,
		},
	] as const;
}

export function SalePromotionView({
	cityGenitive,
	cityPrepositional,
}: {
	cityGenitive: string;
	cityPrepositional: string;
}) {
	const promotionChannels = getPromotionChannels(
		cityGenitive,
		cityPrepositional,
	);
	return (
		<section
			className="bg-[var(--sale-promotion-surface-primary)] py-14 sm:py-16 lg:py-22"
			aria-labelledby="sale-promotion-title"
		>
			<div className="mx-auto max-w-site-frame px-5">
				<div className="max-w-225">
					<h2
						id="sale-promotion-title"
						className="text-section-title font-semibold leading-section-title text-[var(--text-primary)] text-balance"
					>
						Ищем покупателя сами, а не ждём звонков
					</h2>
					<p className="mt-4 max-w-190 text-body-compact leading-step-copy text-[var(--text-muted)] sm:text-body-large sm:leading-step-relaxed">
						Размещаем объект на 5 площадках, продвигаем в соцсетях и показываем
						партнёрам-риелторам. Случайные звонки отсеиваем.
					</p>
				</div>

				<div className="mt-8 grid gap-4 sm:mt-9 md:grid-cols-3 lg:gap-5">
					{promotionChannels.map(({ title, description, icon }) => (
						<article
							key={title}
							className="flex min-h-55 flex-col rounded-2xl bg-[var(--surface-card)] p-5 sm:p-6"
						>
							<span
								className="flex size-11 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]"
								aria-hidden="true"
							>
								{icon}
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

function VkIcon() {
	return (
		<svg viewBox="0 0 28 24" className="h-5 w-6" aria-hidden="true">
			<path
				fill="currentColor"
				d="M12.7 17.5h1.4s.4 0 .6-.3c.2-.2.2-.6.2-.6s0-1.9 1-2.2c1-.3 2.2 1.8 3.5 2.6.9.6 1.7.5 1.7.5l3.4-.1s1.8-.1.9-1.5c-.1-.1-.5-1-2.6-2.8-2.2-2-1.9-1.6.8-5 1.6-2 2.3-3.2 2.1-3.7-.2-.5-1.4-.3-1.4-.3l-3.8.1s-.3 0-.5.1c-.2.1-.3.4-.3.4s-.6 1.6-1.4 3c-1.7 2.9-2.4 3-2.7 2.8-.6-.4-.5-1.5-.5-2.3 0-2.5.4-3.6-.7-3.8-.4-.1-.6-.1-1.6-.1-1.2 0-2.2 0-2.8.3-.4.2-.7.6-.5.7.2.1.7.1.9.6.3.7.3 2.2.3 2.2s.2 2.5-.4 2.8c-.4.2-1-.1-2.3-2.9-.7-1.5-1.2-3.1-1.2-3.1s-.1-.3-.3-.5c-.2-.2-.5-.3-.5-.3l-3.6.1s-.5 0-.7.3c-.2.2 0 .6 0 .6s2.8 6.6 6 9.9c2.9 3 5.3 2.8 5.3 2.8Z"
			/>
		</svg>
	);
}

function MaxIcon() {
	return (
		<svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
			<path
				fill="currentColor"
				d="M4.2 18.2V5.8h3.2l4.6 8.9h.1l4.6-8.9h3.2v12.4h-2.7V10.1h-.1l-3.8 7.4h-2.5L7 10.1H6.9v8.1H4.2Z"
			/>
		</svg>
	);
}
