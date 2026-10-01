// biome-ignore-all lint/a11y/noLabelWithoutControl: labels wrap project-owned form controls.
import { Loader2, Send, X } from "lucide-react";
import type { FormEvent, ReactNode, RefObject } from "react";
import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/checkbox";
import { Dialog, DialogContent } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";

type PropertyChatViewProps = {
	message: string;
	lockMessage: boolean;
	phone: string;
	consent: boolean;
	website: string;
	showInlineHint: boolean;
	isPending: boolean;
	resultMessage?: string | null;
	errors: {
		message?: string;
		phone?: string;
		consent?: string;
	};
	consentContent: ReactNode;
	textareaRef?: RefObject<HTMLTextAreaElement | null>;
	onClose: () => void;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	onMessageChange: (value: string) => void;
	onPhoneChange: (value: string) => void;
	onConsentChange: (checked: boolean) => void;
	onWebsiteChange: (value: string) => void;
};

export function PropertyChatView({
	message,
	lockMessage,
	phone,
	consent,
	website,
	showInlineHint,
	isPending,
	resultMessage,
	errors,
	consentContent,
	textareaRef,
	onClose,
	onSubmit,
	onMessageChange,
	onPhoneChange,
	onConsentChange,
	onWebsiteChange,
}: PropertyChatViewProps) {
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
				overlayClassName="z-[70] bg-[var(--overlay-default)] backdrop-blur-sm"
				aria-labelledby="property-chat-title"
				className="z-[71] w-[min(calc(100vw-32px),520px)] max-w-130 rounded-lg bg-[var(--surface-card)] px-5 pb-8 pt-5 shadow-[var(--shadow-dialog)] sm:px-6 sm:pb-10 sm:pt-6"
			>
				<div className="flex items-start justify-between gap-4">
					<div>
						<p className="text-overline font-semibold uppercase tracking-spaced text-[var(--accent)]">
							Сообщение по объекту
						</p>
						<h2
							id="property-chat-title"
							className="mt-3 max-w-100 text-heading-small font-semibold leading-card-compact text-[var(--text-primary)] sm:text-heading-compact"
						>
							Напишите сообщение ответственному специалисту
						</h2>
					</div>
					<Button
						variant="outline"
						size="icon"
						type="button"
						aria-label="Закрыть чат"
						onClick={onClose}
						className="flex shrink-0 items-center justify-center rounded-md border border-[var(--border)] text-[var(--text-primary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
					>
						<X className="" aria-hidden />
					</Button>
				</div>

				<form
					className="mt-7 grid gap-4 pb-2"
					onSubmit={onSubmit}
					data-analytics-form-type="property_chat"
					noValidate
				>
					<label className="sr-only" htmlFor="property-chat-website">
						Сайт
					</label>
					<Input
						variant="plain"
						id="property-chat-website"
						name="website"
						type="text"
						value={website}
						onChange={(event) => onWebsiteChange(event.target.value)}
						tabIndex={-1}
						autoComplete="off"
						className="pointer-events-none absolute left-[-9999px] top-auto h-px w-px opacity-0"
						aria-hidden="true"
					/>

					{lockMessage ? (
						<div className="grid gap-2.5 text-support font-semibold text-[var(--text-primary)]">
							<span>Сообщение</span>
							<div className="rounded-md border border-[var(--border)] bg-[var(--surface-card-soft)] px-3 py-3 text-support font-normal leading-step-copy whitespace-pre-wrap text-[var(--text-primary)]">
								{message}
							</div>
							<p className="text-caption font-medium leading-step-body text-[var(--text-muted)]">
								Сообщение уже подготовлено. Оставьте телефон, и специалист
								свяжется с вами по этому вопросу.
							</p>
						</div>
					) : (
						<label className="grid gap-2.5 text-support font-semibold text-[var(--text-primary)]">
							Сообщение
							<div className="relative">
								<Textarea
									variant="plain"
									ref={textareaRef}
									autoFocus
									value={message}
									onChange={(event) => onMessageChange(event.target.value)}
									rows={4}
									className="min-h-32 w-full rounded-md border border-[var(--border)] bg-[var(--surface-card)] px-3 py-3 text-support font-normal leading-step-copy outline-none transition focus:border-[var(--accent)]"
									placeholder="Здравствуйте, есть вопросы по этому объекту."
								/>
							</div>
							{showInlineHint ? (
								<span className="text-label font-normal leading-step-body text-[var(--text-muted)]">
									Здесь можно написать свое сообщение.
								</span>
							) : null}
							{errors.message ? (
								<span className="text-label text-[var(--error)]">
									{errors.message}
								</span>
							) : null}
						</label>
					)}

					<label className="grid gap-2.5 text-support font-semibold text-[var(--text-primary)]">
						Телефон для связи
						<Input
							variant="plain"
							value={phone}
							onChange={(event) => onPhoneChange(event.target.value)}
							className="min-h-11 rounded-md border border-[var(--border)] bg-[var(--surface-card)] px-3 text-support outline-none transition focus:border-[var(--accent)]"
							type="tel"
							autoComplete="tel"
							inputMode="tel"
							placeholder="+7 (9__) ___-__-__"
							maxLength={18}
						/>
						{errors.phone ? (
							<span className="text-label text-[var(--error)]">
								{errors.phone}
							</span>
						) : null}
					</label>

					<label className="mt-1 flex gap-3 text-caption leading-step-body text-[var(--text-secondary)]">
						<Checkbox
							checked={consent}
							onCheckedChange={(checked) => onConsentChange(checked === true)}
							className="mt-1 size-4 shrink-0"
						/>
						<span>{consentContent}</span>
					</label>
					{errors.consent ? (
						<span className="text-label font-semibold text-[var(--error)]">
							{errors.consent}
						</span>
					) : null}

					{resultMessage ? (
						<div className="rounded-md border border-[var(--property-chat-border-danger)] bg-[var(--property-chat-surface-danger)] px-3 py-2 text-body font-semibold text-[var(--error)]">
							{resultMessage}
						</div>
					) : null}

					<Button
						variant="plain"
						type="submit"
						disabled={isPending}
						className="mt-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-5 text-body font-bold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-wait disabled:opacity-70"
					>
						{isPending ? (
							<Loader2 className="animate-spin" aria-hidden />
						) : (
							<Send className="" aria-hidden />
						)}
						{isPending ? "Отправляем" : "Отправить сообщение"}
					</Button>
				</form>
			</DialogContent>
		</Dialog>
	);
}
