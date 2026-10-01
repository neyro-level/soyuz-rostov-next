// biome-ignore-all lint/a11y/noLabelWithoutControl: labels wrap project-owned form controls.
"use client";

import { Check, Phone, Share2 } from "lucide-react";
import { type FormEvent, type ReactNode, useRef } from "react";
import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/checkbox";
import { Input } from "../../components/ui/input";

const QUICK_QUESTIONS = [
	"Ещё актуально?",
	"Торг уместен?",
	"Подходит под ипотеку?",
	"Когда можно посмотреть?",
];

export type PropertySidebarResultDto = {
	ok: boolean;
	message: string;
};

export type PropertySidebarViewProps = {
	variant?: "desktop" | "inline";
	className?: string;
	price: string;
	meterPrice?: string | null;
	suggestedOffer?: string | null;
	defaultQuestion: string;
	formattedOfferInputValue: string;
	formattedOfferValue: string;
	messageDraft: string;
	phone: string;
	website: string;
	consent: boolean;
	result?: PropertySidebarResultDto | null;
	pending?: boolean;
	copied?: boolean;
	phoneVisible?: boolean;
	phoneLabel: string;
	phoneHref: string;
	favoriteAction?: ReactNode;
	compareAction?: ReactNode;
	consentContent: ReactNode;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	onOfferChange: (value: string) => void;
	onMessageChange: (value: string) => void;
	onQuickQuestion: (value: string) => void;
	onWebsiteChange: (value: string) => void;
	onPhoneChange: (value: string) => void;
	onPhoneFocus: () => void;
	onConsentChange: (checked: boolean) => void;
	onCopyLink: () => void;
	onRevealPhone: () => void;
};

export function PropertySidebarView({
	variant = "desktop",
	className = "",
	price,
	meterPrice,
	suggestedOffer,
	defaultQuestion,
	formattedOfferInputValue,
	formattedOfferValue,
	messageDraft,
	phone,
	website,
	consent,
	result,
	pending = false,
	copied = false,
	phoneVisible = false,
	phoneLabel,
	phoneHref,
	favoriteAction,
	compareAction,
	consentContent,
	onSubmit,
	onOfferChange,
	onMessageChange,
	onQuickQuestion,
	onWebsiteChange,
	onPhoneChange,
	onPhoneFocus,
	onConsentChange,
	onCopyLink,
	onRevealPhone,
}: PropertySidebarViewProps) {
	const questionRef = useRef<HTMLInputElement | null>(null);
	const desktopVariant = variant === "desktop";

	function focusQuestionArea() {
		window.requestAnimationFrame(() => {
			const input = questionRef.current;
			if (!input) return;
			input.focus();
			const position = input.value.length;
			input.setSelectionRange(position, position);
		});
	}

	const form = (
		<form
			className="grid gap-4"
			onSubmit={onSubmit}
			data-analytics-form-type="property_chat"
			noValidate
		>
			<div className="grid gap-2 pt-1.5">
				<label
					htmlFor={`property-offer-price-${variant}`}
					className="text-label font-semibold leading-step-body text-[var(--text-primary)]"
				>
					Предложите свою цену
				</label>
				<div className="relative">
					<Input
						variant="plain"
						id={`property-offer-price-${variant}`}
						value={formattedOfferInputValue}
						onChange={(event) => onOfferChange(event.target.value)}
						type="tel"
						inputMode="numeric"
						autoComplete="off"
						placeholder={
							suggestedOffer
								? `Например, ${suggestedOffer.replace(/\s*₽$/, "")}`
								: "Например, 3 700 000"
						}
						className="min-h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-card)] px-3 pr-9 text-label font-medium text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
					/>
					<span className="pointer-events-none absolute inset-y-0 right-3 inline-flex items-center text-label font-semibold text-[var(--text-muted)]">
						₽
					</span>
				</div>
				<p className="text-caption leading-step-small text-[var(--text-muted)]">
					Можно вводить просто цифрами. Например: 3 700 000.
				</p>
			</div>

			<div className="grid gap-2.5">
				<p className="text-label font-bold leading-step-body text-[var(--text-primary)]">
					Спросите у продавца
				</p>
				<div className="rounded-lg border border-[var(--border)] bg-[var(--surface-card)] px-3 py-3">
					<label className="flex flex-wrap items-baseline gap-x-1 gap-y-1 text-label font-medium leading-step-body text-[var(--text-primary)]">
						<span>{defaultQuestion}</span>
						<Input
							variant="plain"
							ref={questionRef}
							aria-label="Вопрос продавцу"
							value={messageDraft}
							onChange={(event) => onMessageChange(event.target.value)}
							autoFocus={!desktopVariant}
							placeholder="Здесь можно написать сообщение"
							className="min-w-42.5 flex-1 bg-transparent text-label font-medium leading-step-body text-[var(--text-primary)] outline-none placeholder:text-[var(--property-sidebar-content-muted)]"
						/>
					</label>
					{formattedOfferValue ? (
						<p className="mt-2 border-t border-[var(--property-sidebar-border-panel)] pt-2 text-label font-medium leading-step-body text-[var(--text-primary)]">{`Предлагаю ${formattedOfferValue} за этот объект.`}</p>
					) : null}
				</div>
				<div className="flex flex-wrap gap-2">
					{QUICK_QUESTIONS.map((item) => (
						<Button
							variant="plain"
							type="button"
							key={item}
							onClick={() => {
								onQuickQuestion(item);
								focusQuestionArea();
							}}
							className="inline-flex min-h-7 items-center rounded-lg bg-[var(--background)] px-2.5 text-caption font-bold text-[var(--text-primary)] transition hover:bg-[var(--property-sidebar-surface-chip-hover)] hover:text-[var(--accent)]"
						>
							{item}
						</Button>
					))}
				</div>
			</div>

			<label className="hidden">
				Сайт
				<Input
					variant="plain"
					value={website}
					onChange={(event) => onWebsiteChange(event.target.value)}
					tabIndex={-1}
					autoComplete="off"
				/>
			</label>

			<div className="grid gap-2">
				<label
					htmlFor={`property-chat-phone-${variant}`}
					className="text-label font-semibold leading-step-body text-[var(--text-primary)]"
				>
					Телефон для связи
				</label>
				<Input
					variant="plain"
					id={`property-chat-phone-${variant}`}
					value={phone}
					onChange={(event) => onPhoneChange(event.target.value)}
					onFocus={onPhoneFocus}
					type="tel"
					inputMode="tel"
					autoComplete="tel"
					placeholder="+7 9XX XXX-XX-XX"
					maxLength={18}
					className="min-h-10 rounded-lg border border-[var(--border)] bg-[var(--surface-card)] px-3 text-label font-medium text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
				/>
			</div>

			<label className="flex items-start gap-3 text-caption leading-step-body text-[var(--text-muted)]">
				<Checkbox
					checked={consent}
					onCheckedChange={(checked) => onConsentChange(checked === true)}
					className="mt-0.5"
				/>
				<span>{consentContent}</span>
			</label>

			{result ? (
				<p
					className={`text-body font-semibold ${result.ok ? "text-[var(--property-sidebar-content-success)]" : "text-[var(--accent)]"}`}
				>
					{result.message}
				</p>
			) : null}

			<Button
				variant="plain"
				type="submit"
				disabled={pending}
				className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--surface-dark)] px-4 text-body font-semibold text-white transition hover:bg-[var(--property-sidebar-surface-action-hover)] disabled:cursor-wait disabled:opacity-70"
			>
				{pending ? "Отправляем..." : "Отправить сообщение"}
			</Button>
		</form>
	);

	const panel = (
		<div className="grid gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface-card)] p-4 shadow-[var(--property-sidebar-shadow-panel)]">
			{desktopVariant ? (
				<div className="grid grid-cols-3 items-center gap-2">
					{favoriteAction}
					{compareAction}
					<Button
						variant="plain"
						type="button"
						data-analytics-event="share_click"
						onClick={onCopyLink}
						className="mx-auto flex items-center justify-center rounded-lg border border-transparent bg-[var(--surface-card)] text-[var(--text-primary)] transition hover:bg-[var(--background)]"
						aria-label="Скопировать ссылку на объект"
						title={copied ? "Ссылка скопирована" : "Скопировать ссылку"}
					>
						{copied ? (
							<Check
								className="text-[var(--property-sidebar-content-success)]"
								aria-hidden
							/>
						) : (
							<Share2 className="" aria-hidden />
						)}
					</Button>
				</div>
			) : null}

			<div className="grid gap-1">
				<p className="text-card-fluid font-extrabold leading-tight-copy tabular-nums text-[var(--text-primary)]">
					{price}
				</p>
				{meterPrice ? (
					<p className="text-label font-medium leading-step-body text-[var(--text-secondary)]">
						{meterPrice} за м²
					</p>
				) : null}
			</div>

			{desktopVariant ? (
				<div className="grid gap-2.5">
					{phoneVisible ? (
						<a
							href={phoneHref}
							data-analytics-context="property_sidebar"
							className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[var(--surface-dark)] bg-[var(--surface-dark)] px-4 text-label font-bold tabular-nums text-white transition hover:bg-[var(--property-sidebar-surface-action-hover)]"
						>
							<Phone className="size-4" aria-hidden />
							{phoneLabel}
						</a>
					) : (
						<Button
							variant="plain"
							type="button"
							data-analytics-event="phone_reveal"
							data-analytics-context="property_sidebar"
							onClick={onRevealPhone}
							className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[var(--surface-dark)] bg-[var(--surface-dark)] px-4 text-label font-bold text-white transition hover:bg-[var(--property-sidebar-surface-action-hover)]"
						>
							<Phone className="" aria-hidden />
							Показать телефон
						</Button>
					)}
				</div>
			) : null}

			{form}
		</div>
	);

	return desktopVariant ? (
		<aside
			className={`lg:sticky lg:top-[112px] ${className}`.trim()}
			aria-label="Стоимость и специалист"
		>
			{panel}
		</aside>
	) : (
		<section className={className} aria-label="Стоимость и специалист">
			{panel}
		</section>
	);
}
