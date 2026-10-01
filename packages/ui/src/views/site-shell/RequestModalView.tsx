// biome-ignore-all lint/a11y/noLabelWithoutControl: labels wrap project-owned form controls.
import { Check, X } from "lucide-react";
import type { FormEvent, ReactNode, RefObject } from "react";
import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/checkbox";
import { Dialog, DialogContent } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import type { RequestAvatar } from "../../view-models/request";
import type { SiteImageRenderer } from "../../lib/adapters";

type RequestModalViewProps = {
	avatars: readonly RequestAvatar[];
	imageRenderer: SiteImageRenderer;
	title: string;
	titleLines: readonly string[] | null;
	subtitle: string;
	submitLabel: string;
	formType: string;
	name: string;
	phone: string;
	consent: boolean;
	website: string;
	isPending: boolean;
	errors: {
		name?: string;
		phone?: string;
		consent?: string;
	};
	resultMessage?: string | null;
	successMessage?: string | null;
	panelRef?: RefObject<HTMLDivElement | null>;
	phoneRef?: RefObject<HTMLInputElement | null>;
	phonePlaceholder?: string;
	consentContent: ReactNode;
	onClose: () => void;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	onNameChange: (value: string) => void;
	onPhoneChange: (value: string) => void;
	onConsentChange: (checked: boolean) => void;
	onWebsiteChange: (value: string) => void;
};

export function RequestModalView({
	avatars,
	imageRenderer: ImageRenderer,
	title,
	titleLines,
	subtitle,
	submitLabel,
	formType,
	name,
	phone,
	consent,
	website,
	isPending,
	errors,
	resultMessage,
	successMessage,
	panelRef,
	phoneRef,
	phonePlaceholder = "+7 (___) ___-__-__",
	consentContent,
	onClose,
	onSubmit,
	onNameChange,
	onPhoneChange,
	onConsentChange,
	onWebsiteChange,
}: RequestModalViewProps) {
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
				overlayClassName="request-modal__overlay"
				className="request-modal__panel"
				aria-labelledby="request-modal-title"
				ref={panelRef}
			>
				<Button
					variant="ghost"
					size="icon"
					className="request-modal__close"
					type="button"
					aria-label="Закрыть форму"
					onClick={onClose}
				>
					<X className="" aria-hidden />
				</Button>

				{successMessage ? (
					<div
						className="request-modal__success"
						role="status"
						aria-live="polite"
					>
						<span className="request-modal__success-icon">
							<Check className="size-8" aria-hidden />
						</span>
						<h2 className="request-modal__title" id="request-modal-title">
							Заявка отправлена
						</h2>
						<p className="request-modal__subtitle">{successMessage}</p>
						<Button
							variant="hero"
							className="request-modal__submit"
							type="button"
							onClick={onClose}
						>
							Хорошо
						</Button>
					</div>
				) : (
					<>
						<div className="request-modal__header">
							<div className="request-modal__visual" aria-hidden>
								<div className="request-modal__avatar-stack">
									{avatars.map((avatar, index) => (
										<span
											key={avatar.src}
											className="request-modal__avatar"
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
										</span>
									))}
								</div>
							</div>
							<h2
								className={`request-modal__title ${formType === "legal_consultation" ? "request-modal__title--compact" : ""}`}
								id="request-modal-title"
							>
								{titleLines
									? titleLines.map((line, index) => (
											<span key={line}>
												{index > 0 ? <br /> : null}
												{line}
											</span>
										))
									: title}
							</h2>
							{subtitle ? (
								<p
									className="request-modal__subtitle"
									id="request-modal-subtitle"
								>
									{subtitle}
								</p>
							) : null}
						</div>

						<form
							className="request-modal__form"
							onSubmit={onSubmit}
							data-analytics-form-type={formType}
							noValidate
						>
							<label className="request-modal__honeypot">
								Сайт
								<Input
									tabIndex={-1}
									autoComplete="off"
									value={website}
									onChange={(event) => onWebsiteChange(event.target.value)}
								/>
							</label>

							<div className="request-modal__field">
								<label
									className="request-modal__label"
									htmlFor="request-modal-name"
								>
									Ваше имя
								</label>
								<Input
									id="request-modal-name"
									className="request-modal__input"
									autoComplete="name"
									value={name}
									required
									aria-invalid={Boolean(errors.name)}
									aria-describedby={
										errors.name ? "request-modal-name-error" : undefined
									}
									onChange={(event) => onNameChange(event.target.value)}
									placeholder="Как к вам обращаться"
								/>
								{errors.name ? (
									<p
										className="request-modal__error"
										id="request-modal-name-error"
									>
										{errors.name}
									</p>
								) : null}
							</div>

							<div className="request-modal__field">
								<label
									className="request-modal__label"
									htmlFor="request-modal-phone"
								>
									Номер телефона
								</label>
								<Input
									id="request-modal-phone"
									ref={phoneRef}
									className="request-modal__input"
									type="tel"
									inputMode="tel"
									autoComplete="tel"
									value={phone}
									aria-invalid={Boolean(errors.phone)}
									aria-describedby={
										errors.phone ? "request-modal-phone-error" : undefined
									}
									onChange={(event) => onPhoneChange(event.target.value)}
									placeholder={phonePlaceholder}
								/>
								{errors.phone ? (
									<p
										className="request-modal__error"
										id="request-modal-phone-error"
									>
										{errors.phone}
									</p>
								) : null}
							</div>

							<label className="request-modal__consent">
								<Checkbox
									className="request-modal__checkbox"
									checked={consent}
									aria-invalid={Boolean(errors.consent)}
									aria-describedby={
										errors.consent ? "request-modal-consent-error" : undefined
									}
									onCheckedChange={(checked) =>
										onConsentChange(checked === true)
									}
								/>
								<span>{consentContent}</span>
							</label>
							{errors.consent ? (
								<p
									className="request-modal__error"
									id="request-modal-consent-error"
								>
									{errors.consent}
								</p>
							) : null}

							{resultMessage ? (
								<p className="request-modal__submit-error" role="alert">
									{resultMessage}
								</p>
							) : null}

							<Button
								variant="hero"
								className="request-modal__submit"
								type="submit"
								disabled={isPending}
							>
								{isPending ? "Отправляем..." : submitLabel}
							</Button>
							<p className="request-modal__note">
								Без спама. Только чтобы связаться по вашей задаче.
							</p>
						</form>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}
