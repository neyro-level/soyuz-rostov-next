// biome-ignore-all lint/a11y/noLabelWithoutControl: the label wraps a project-owned Checkbox.
import {
	CheckCircle2,
	Loader2,
	ShieldCheck,
	UserRoundCheck,
	X,
} from "lucide-react";
import type { ChangeEvent, FormEvent, ReactNode, RefObject } from "react";
import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/checkbox";
import { Dialog, DialogContent } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import type { RequestAvatar } from "../../view-models/request";
import type { SiteImageRenderer } from "../../lib/adapters";

type ExpertRequestModalViewProps = {
	avatars: readonly RequestAvatar[];
	imageRenderer: SiteImageRenderer;
	phone: string;
	consent: boolean;
	website: string;
	isPending: boolean;
	errors: {
		phone?: string;
		consent?: string;
	};
	resultMessage?: string | null;
	phoneRef?: RefObject<HTMLInputElement | null>;
	onClose: () => void;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	onPhoneChange: (event: ChangeEvent<HTMLInputElement>) => void;
	onPhoneFocus: () => void;
	onConsentChange: (checked: boolean) => void;
	onWebsiteChange: (value: string) => void;
	consentContent: ReactNode;
};

const BULLETS = [
	{
		icon: CheckCircle2,
		text: "Проверим юридическую чистоту объекта и историю собственников",
	},
	{
		icon: UserRoundCheck,
		text: "Профессионал на всех этапах — от просмотра до ключей",
	},
	{ icon: ShieldCheck, text: "Торгуемся с продавцом вместо вас" },
] as const;

export function ExpertRequestModalView({
	avatars,
	imageRenderer: ImageRenderer,
	phone,
	consent,
	website,
	isPending,
	errors,
	resultMessage,
	phoneRef,
	onClose,
	onSubmit,
	onPhoneChange,
	onPhoneFocus,
	onConsentChange,
	onWebsiteChange,
	consentContent,
}: ExpertRequestModalViewProps) {
	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<DialogContent
				placement="bottom-mobile"
				showClose={false}
				overlayClassName="z-[80] bg-[var(--overlay-soft)] backdrop-blur-[1px]"
				aria-labelledby="expert-request-title"
				className="z-[81] w-[min(calc(100vw-16px),452px)] max-w-113 gap-0 overflow-hidden rounded-lg border-0 bg-[var(--surface-card)] p-0 shadow-[var(--shadow-dialog)]"
			>
				<Button
					variant="ghost"
					size="icon"
					type="button"
					aria-label="Закрыть форму"
					onClick={onClose}
					className="absolute right-4 top-4 z-10 flex items-center justify-center rounded-lg text-[var(--text-primary)] transition hover:bg-[var(--surface-card)]/80"
				>
					<X className="" aria-hidden />
				</Button>

				<div className="bg-[linear-gradient(180deg,var(--accent-soft)_0%,var(--surface-card-soft)_66%,var(--surface)_100%)] px-6 pb-6 pt-14">
					<div className="mb-12 flex justify-center">
						<div className="relative flex h-29 w-64 items-center justify-center">
							{avatars.map((avatar, index) => (
								<div
									key={avatar.src}
									className="absolute size-[116px] overflow-hidden rounded-full border-[3px] border-white shadow-[var(--expert-request-modal-shadow-primary)]"
									style={{
										left: `${index * 70}px`,
										zIndex: index === 1 ? 3 : 2,
									}}
								>
									<ImageRenderer
										src={avatar.src}
										alt=""
										fill
										unoptimized
										sizes="116px"
										className="object-cover object-[center_18%]"
									/>
								</div>
							))}
						</div>
					</div>

					<h2
						id="expert-request-title"
						className="text-center text-section-base font-extrabold leading-editorial-title text-[var(--text-primary)]"
					>
						Доверьте покупку эксперту агентства недвижимости
					</h2>
				</div>

				<form
					className="grid gap-5 px-6 pb-6"
					onSubmit={onSubmit}
					data-analytics-form-type="property_expert_purchase_request"
					noValidate
				>
					<label className="sr-only" htmlFor="expert-request-website">
						Сайт
					</label>
					<Input
						id="expert-request-website"
						name="website"
						type="text"
						value={website}
						onChange={(event) => onWebsiteChange(event.target.value)}
						tabIndex={-1}
						autoComplete="off"
						className="pointer-events-none absolute left-[-9999px] top-auto h-px w-px opacity-0"
						aria-hidden="true"
					/>

					<div className="grid gap-4.5">
						{BULLETS.map(({ icon: Icon, text }) => (
							<div
								key={text}
								className="grid grid-cols-[30px_minmax(0,1fr)] items-start gap-3 text-body leading-step-body text-[var(--text-secondary)]"
							>
								<span className="grid size-[30px] place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
									<Icon className="size-4" aria-hidden />
								</span>
								<span>{text}</span>
							</div>
						))}
					</div>

					<div className="grid gap-1.5">
						<label className="sr-only" htmlFor="expert-request-phone">
							Телефон
						</label>
						<div className="relative">
							<span className="pointer-events-none absolute left-4 top-1/2 flex -translate-y-1/2 items-center gap-1 text-body font-semibold text-[var(--text-primary)]">
								<span aria-hidden>🇷🇺</span>
								<span
									className="text-overline text-[var(--text-muted)]"
									aria-hidden
								>
									▼
								</span>
							</span>
							<Input
								id="expert-request-phone"
								ref={phoneRef}
								name="phone"
								type="tel"
								value={phone}
								onChange={onPhoneChange}
								onFocus={onPhoneFocus}
								autoComplete="tel"
								inputMode="tel"
								placeholder="+7 (9__) ___-__-__"
								aria-invalid={Boolean(errors.phone)}
								className="min-h-12 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-card-soft)] px-4 pl-17.5 text-body-large font-semibold tabular-nums text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:bg-[var(--surface-card)]"
							/>
						</div>
						{errors.phone ? (
							<span className="text-label font-semibold text-[var(--error)]">
								{errors.phone}
							</span>
						) : null}
					</div>

					<label className="flex items-start gap-2 text-caption leading-step-small text-[var(--text-secondary)]">
						<Checkbox
							checked={consent}
							onCheckedChange={(checked) => onConsentChange(checked === true)}
							className="mt-0.5 size-4 shrink-0 rounded border-[var(--input)] accent-[var(--accent)]"
						/>
						<span>{consentContent}</span>
					</label>
					{errors.consent ? (
						<span className="text-label font-semibold text-[var(--error)]">
							{errors.consent}
						</span>
					) : null}

					{resultMessage ? (
						<div className="rounded-lg border border-[var(--expert-request-modal-border-primary)] bg-[var(--expert-request-modal-surface-primary)] px-3 py-2 text-body font-semibold text-[var(--error)]">
							{resultMessage}
						</div>
					) : null}

					<Button
						variant="plain"
						type="submit"
						disabled={isPending}
						className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[var(--text-primary)] px-5 text-body font-extrabold text-white transition hover:bg-[var(--expert-request-modal-surface-secondary)] disabled:cursor-wait disabled:opacity-70"
					>
						{isPending ? (
							<Loader2 className="animate-spin" aria-hidden />
						) : null}
						{isPending ? "Отправляем" : "Позвоните мне"}
					</Button>
				</form>
			</DialogContent>
		</Dialog>
	);
}
