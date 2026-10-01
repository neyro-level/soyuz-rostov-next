import { Phone } from "lucide-react";
import { Button } from "../../components/ui/button";

type PhoneRevealViewProps = {
	phone?: string | null;
	phoneHref?: string | null;
	visible: boolean;
	variant: "desktop" | "mobile";
	analyticsContext?: string;
	revealLabel?: string;
	onReveal: () => void;
};

export function PhoneRevealView({
	phone,
	phoneHref,
	visible,
	variant,
	analyticsContext = "site_header",
	revealLabel = "Показать номер телефона",
	onReveal,
}: PhoneRevealViewProps) {
	if (!phone || !phoneHref) return null;

	if (variant === "mobile") {
		const className =
			"flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--phone-reveal-surface-primary)] px-3 text-support font-medium tracking-compact text-[var(--text-primary)] transition hover:bg-[var(--phone-reveal-surface-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

		if (visible) {
			return (
				<a
					href={phoneHref}
					data-analytics-context={analyticsContext}
					className={className}
				>
					<Phone
						className="size-[15px] shrink-0 text-[var(--phone-reveal-content-primary)]"
						strokeWidth={1.75}
						aria-hidden
					/>
					<span className="truncate whitespace-nowrap tabular-nums">
						{phone}
					</span>
				</a>
			);
		}

		return (
			<Button
				variant="plain"
				type="button"
				data-analytics-event="phone_reveal"
				data-analytics-context={analyticsContext}
				onClick={onReveal}
				className={className}
				aria-label={revealLabel}
			>
				<Phone
					className="shrink-0 text-[var(--phone-reveal-content-primary)]"
					strokeWidth={1.75}
					aria-hidden
				/>
				<span>Позвонить</span>
			</Button>
		);
	}

	const baseClassName = visible
		? "inline-flex min-h-10 w-47 items-center gap-2 rounded-md px-2.5 text-body font-semibold text-[var(--text-secondary)]"
		: "inline-flex min-h-10 w-29.5 items-center gap-1.5 rounded-md px-1.5 text-body font-semibold text-[var(--text-secondary)]";
	const interactiveClassName = `${baseClassName} transition hover:bg-[var(--background)] hover:text-[var(--accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]`;

	if (visible) {
		return (
			<a
				href={phoneHref}
				data-analytics-context={analyticsContext}
				className={interactiveClassName}
			>
				<Phone className="size-[18px] text-[var(--text-muted)]" aria-hidden />
				<span className="whitespace-nowrap tabular-nums">{phone}</span>
			</a>
		);
	}

	return (
		<Button
			variant="plain"
			type="button"
			data-analytics-event="phone_reveal"
			data-analytics-context={analyticsContext}
			onClick={onReveal}
			className={interactiveClassName}
			aria-label={revealLabel}
		>
			<Phone className="text-[var(--text-muted)]" aria-hidden />
			<span
				className="whitespace-nowrap text-[var(--phone-reveal-content-secondary)] tabular-nums"
				aria-hidden
			>
				+7...Показать
			</span>
		</Button>
	);
}
