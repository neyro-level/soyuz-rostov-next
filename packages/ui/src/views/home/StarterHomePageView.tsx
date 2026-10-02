import type { HomePageDTO, PropertyCardDTO } from "@ams/realtbase-contracts";
import { Button } from "../../components/ui/button";
import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "../../components/ui/card";
import { Container, Section, SectionHeader } from "../../components/ui/layout";
import { StarterPropertyCard } from "../property/StarterPropertyCardView";
import { LeadFormView } from "../starter/LeadFormView";

type HomeSectionProps = {
	page: HomePageDTO;
	featured: PropertyCardDTO | null;
};

export function HomeHeroSection({ page, featured }: HomeSectionProps) {
	const catalogHref = page.serviceLinks.find((item) => item.href.includes("/kvartiry/"))?.href ?? page.serviceLinks[0]?.href;
	return (
		<section
			id="section-home-hero"
			aria-labelledby="home-hero-title"
			className="border-b border-border bg-surface-raised py-[var(--section-space-md)] lg:py-[var(--section-space-lg)]"
		>
			<Container className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
				<div>
					<p className="text-label font-bold uppercase tracking-wide-role text-action-primary">
						{page.eyebrow}
					</p>
					<h1
						id="home-hero-title"
						className="mt-4 max-w-4xl text-display font-extrabold leading-display-tight tracking-display"
					>
						{page.title}
					</h1>
					<p className="mt-5 max-w-2xl text-body-large leading-step-relaxed text-content-default">
						{page.lead}
					</p>
					<div className="mt-7 flex flex-wrap gap-3">
						{catalogHref ? (
							<Button asChild size="lg">
								<a href={catalogHref}>Смотреть объекты</a>
							</Button>
						) : null}
						<Button asChild size="lg" variant="outline">
							<a href="#lead-form">Оставить заявку</a>
						</Button>
					</div>
				</div>
				{featured ? (
					<StarterPropertyCard property={featured} headingLevel="h2" priority />
				) : (
					<Card>
						<CardHeader>
							<CardTitle>Подберём объект под вашу задачу</CardTitle>
							<CardDescription>
								В активных разделах пока нет опубликованных предложений для
								главного экрана. Оставьте заявку — свяжемся и подберём маршрут.
							</CardDescription>
						</CardHeader>
						<CardFooter>
							{catalogHref ? (
								<Button asChild variant="outline">
									<a href={catalogHref}>Открыть каталог</a>
								</Button>
							) : null}
						</CardFooter>
					</Card>
				)}
			</Container>
		</section>
	);
}

export function HomeServicesSection({ page }: Pick<HomeSectionProps, "page">) {
	return (
		<section id="section-home-services" aria-labelledby="home-services-title">
			<Section>
				<Container>
					<SectionHeader
						eyebrow="Направления"
						title="Активные разделы R1"
						description="Новостройки, квартиры, застройщики, ипотека и продажа — только разделы, разрешённые для первого релиза."
					/>
					<h2 id="home-services-title" className="sr-only">
						Услуги
					</h2>
					<div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						{page.serviceLinks.map((item) => (
							<Card key={item.href}>
								<CardHeader>
									<CardTitle>
										<a href={item.href} className="hover:text-action-primary">
											{item.label}
										</a>
									</CardTitle>
									<CardDescription>{item.description}</CardDescription>
								</CardHeader>
							</Card>
						))}
					</div>
				</Container>
			</Section>
		</section>
	);
}

export function HomeFeaturedSection({
	featured,
}: Pick<HomeSectionProps, "featured">) {
	return (
		<section
			id="section-home-featured"
			aria-labelledby="home-featured-title"
			className="bg-surface-subtle"
		>
			<Section>
				<Container>
					<SectionHeader
						title="Квартиры из активного каталога"
						description="Главный экран показывает только опубликованные Gateway DTO; без неподтверждённых объектов, отзывов или метрик."
					/>
					<h2 id="home-featured-title" className="sr-only">
						Избранные объекты
					</h2>
					{featured ? (
						<div className="mt-8 max-w-xl">
							<StarterPropertyCard property={featured} />
						</div>
					) : (
						<p className="mt-8 text-body-large text-content-default">
							Когда объект пройдёт публикацию и Content Gate, он появится в этом блоке.
						</p>
					)}
				</Container>
			</Section>
		</section>
	);
}

export function HomeProcessSection({ page }: Pick<HomeSectionProps, "page">) {
	return (
		<section id="section-home-process" aria-labelledby="home-process-title">
			<Section>
				<Container size="narrow">
					<SectionHeader
						eyebrow={page.sections[0]?.title}
						title="Как мы работаем"
						description={page.sections[0]?.text}
					/>
					<h2 id="home-process-title" className="sr-only">
						Процесс
					</h2>
					<ol className="mt-8 grid gap-4 md:grid-cols-3">
						{page.sections[0]?.items?.map((item, index) => (
							<li key={item}>
								<Card>
									<CardHeader>
										<p className="text-display-small font-extrabold text-action-primary">
											0{index + 1}
										</p>
										<CardTitle>{item}</CardTitle>
									</CardHeader>
								</Card>
							</li>
						))}
					</ol>
				</Container>
			</Section>
		</section>
	);
}

export function HomeTrustSection() {
	return (
		<section
			id="section-home-trust"
			aria-labelledby="home-trust-title"
			className="bg-surface-subtle"
		>
			<Section>
				<Container size="narrow">
					<SectionHeader
						title="Почему с нами спокойнее"
						description="Проверяем документы, условия объекта и маршрут сделки. Без неподтверждённых отзывов, цифр и обещаний."
					/>
					<h2 id="home-trust-title" className="sr-only">
						Доверие
					</h2>
				</Container>
			</Section>
		</section>
	);
}

export function HomeLeadSection({ page }: Pick<HomeSectionProps, "page">) {
	return (
		<section id="section-home-lead" aria-labelledby="home-lead-title">
			<Section>
				<Container size="narrow">
					<h2 id="home-lead-title" className="sr-only">
						Заявка
					</h2>
					{page.leadContext ? (
						<LeadFormView context={page.leadContext} />
					) : null}
				</Container>
			</Section>
		</section>
	);
}

export function HomePageView(props: HomeSectionProps) {
	return (
		<>
			<HomeHeroSection {...props} />
			<HomeServicesSection page={props.page} />
			<HomeFeaturedSection featured={props.featured} />
			<HomeProcessSection page={props.page} />
			<HomeTrustSection />
			<HomeLeadSection page={props.page} />
		</>
	);
}
