import { Cookie } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import type { SiteLinkRenderer } from "../../lib/adapters";

type CookieNoticeViewProps = {
	onAccept: () => void;
	linkRenderer: SiteLinkRenderer;
	policyHref: string;
};

export function CookieNoticeView({
	onAccept,
	linkRenderer: LinkRenderer,
	policyHref,
}: CookieNoticeViewProps) {
	return (
		<Card
			className="fixed bottom-3 left-1/2 z-[9999] w-[calc(100%-1.5rem)] -translate-x-1/2 rounded-md border border-[var(--cookie-notice-border-primary)] bg-[var(--surface-card)] p-3 shadow-[var(--cookie-notice-shadow-primary)] sm:bottom-4 sm:w-[calc(100%-2rem)] sm:px-5 sm:py-3 lg:w-[70%] lg:max-w-217"
			role="region"
			aria-label="Уведомление об использовании cookie"
			aria-describedby="cookie-notice-description"
		>
			<div className="grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center sm:gap-5">
				<div className="flex min-w-0 items-start gap-2.5 sm:items-center sm:gap-3">
					<Cookie
						className="mt-0.5 size-4 shrink-0 fill-[var(--cookie-notice-icon-primary)] text-[var(--cookie-notice-content-primary)] sm:mt-0 sm:size-6"
						aria-hidden
					/>
					<p
						id="cookie-notice-description"
						className="text-pretty text-caption font-medium leading-step-small text-[var(--cookie-notice-content-secondary)] sm:text-body sm:leading-step-copy"
					>
						<span className="sm:hidden">
							Используем cookie для работы сайта и аналитики.{" "}
						</span>
						<span className="hidden sm:inline">
							Мы, как и вы, ценим комфорт и безопасность. Чтобы сайт был удобным
							и помогал быстрее находить подходящую недвижимость,{" "}
						</span>
						<LinkRenderer
							href={policyHref}
							className="font-semibold text-[var(--cookie-notice-content-tertiary)] transition hover:text-[var(--cookie-notice-content-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
						>
							<span className="sm:hidden">Подробнее</span>
							<span className="hidden sm:inline">
								мы используем файлы cookie
							</span>
						</LinkRenderer>
						.
					</p>
				</div>
				<Button
					type="button"
					onClick={onAccept}
					className="min-h-11 w-full rounded-md bg-[var(--accent)] px-3 text-label font-bold text-white hover:bg-[var(--cookie-notice-surface-primary)] sm:min-h-12 sm:px-6 sm:text-body"
				>
					Принять
				</Button>
			</div>
		</Card>
	);
}
