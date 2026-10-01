"use client";

import { Camera, FileText, Wrench } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import type { SiteImageRenderer } from "../../lib/adapters";

const PREPARATION_STEPS = [
	{
		title: "Даём честные рекомендации по ремонту",
		description:
			"Говорим прямо, что мешает продаже и что стоит поправить до выхода на рынок",
		icon: Wrench,
	},
	{
		title: "Делаем профессиональные фотографии",
		description:
			"Снимаем квартиру после подготовки. Так её увидит покупатель в первую очередь",
		icon: Camera,
	},
	{
		title: "Пишем понятное описание без штампов",
		description:
			"Текст в объявлении заранее отвечает на частые вопросы, отсеивая случайные звонки",
		icon: FileText,
	},
] as const;

export function SalePreparationView({
	beforeImage,
	afterImage,
	imageRenderer: ImageRenderer,
}: {
	beforeImage: string;
	afterImage: string;
	imageRenderer: SiteImageRenderer;
}) {
	const [activeView, setActiveView] = useState<"before" | "after">("before");
	return (
		<section
			className="bg-[var(--surface-card)] py-14 sm:py-16 lg:py-22"
			aria-labelledby="sale-preparation-title"
		>
			<div className="mx-auto grid max-w-site-frame gap-10 px-5 lg:grid-cols-[minmax(0,3fr)_minmax(360px,2fr)] lg:items-start lg:gap-12">
				<div className="order-2 lg:order-1">
					<h2
						id="sale-preparation-title"
						className="max-w-190 text-section-title font-semibold leading-section-title text-[var(--text-primary)] text-balance"
					>
						Готовим квартиру к продаже так, чтобы она выглядела дороже в
						объявлении
					</h2>
					<div className="mt-8 grid gap-3 sm:mt-9">
						{PREPARATION_STEPS.map(({ title, description, icon: Icon }) => (
							<article
								key={title}
								className="flex gap-4 rounded-2xl bg-[var(--sale-preparation-surface-primary)] p-5 sm:p-6"
							>
								<span
									className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-card)] text-[var(--text-secondary)]"
									aria-hidden
								>
									<Icon className="size-[18px]" strokeWidth={1.6} />
								</span>
								<div>
									<h3 className="text-body-large font-semibold leading-compact-copy text-[var(--text-primary)]">
										{title}
									</h3>
									<p className="mt-2 max-w-[62ch] text-support leading-step-body text-[var(--text-muted)]">
										{description}
									</p>
								</div>
							</article>
						))}
					</div>
				</div>
				<div className="order-1 lg:order-2">
					<div>
						<div
							className="mb-3 inline-flex rounded-xl bg-[var(--sale-preparation-surface-primary)] p-1"
							role="tablist"
							aria-label="Состояние квартиры"
						>
							{(["before", "after"] as const).map((view) => {
								const active = activeView === view;
								return (
									<Button
										variant="plain"
										key={view}
										type="button"
										role="tab"
										aria-selected={active}
										onClick={() => setActiveView(view)}
										className={`min-h-11 min-w-24 rounded-lg px-5 text-body font-semibold transition duration-300 ${active ? "bg-[var(--text-primary)] text-white shadow-sm" : "bg-transparent text-[var(--sale-preparation-content-primary)] hover:text-[var(--text-primary)]"}`}
									>
										{view === "before" ? "До" : "После"}
									</Button>
								);
							})}
						</div>
						<div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[var(--sale-preparation-surface-primary)]">
							<ImageRenderer
								src={beforeImage}
								alt="Комната до подготовки к продаже"
								fill
								sizes="(max-width: 1023px) 100vw, 42vw"
								className={`object-cover transition-opacity duration-300 ${activeView === "before" ? "opacity-100" : "opacity-0"}`}
								priority={false}
							/>
							<ImageRenderer
								src={afterImage}
								alt="Комната после подготовки к продаже"
								fill
								sizes="(max-width: 1023px) 100vw, 42vw"
								className={`object-cover transition-opacity duration-300 ${activeView === "after" ? "opacity-100" : "opacity-0"}`}
								priority={false}
							/>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
