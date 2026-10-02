"use client"; // interactive form state, validation, fetch, focus management

import type { LeadFormContext } from "@ams/realtbase-contracts";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { Button } from "../../components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "../../components/ui/card";
import { Checkbox } from "../../components/ui/checkbox";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "../../components/ui/field";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import {
	analyticsAttributes,
	type PublicAnalyticsDimensions,
} from "../shared/analytics-attributes";
import { toIntakeFormKind } from "./lead-form-kind";

type FormStatus =
	| "default"
	| "invalid"
	| "submitting"
	| "server_error"
	| "success";

export type LeadFormViewProps = {
	context: LeadFormContext;
	title?: string;
	description?: string;
	submitLabel?: string;
	intakeKind?:
		| "property_request"
		| "callback"
		| "consultation"
		| "generic"
		| "legal"
		| "development_price"
		| "quiz";
	entityContext?: {
		geo?: string;
		region?: string;
		city?: string;
		surface?:
			| "apartments"
			| "new-buildings"
			| "houses"
			| "plots"
			| "commercial"
			| "garages";
		district?: string;
		propertyUrlId?: string;
		development?: string;
		developer?: string;
		dataTier?: "A" | "B" | "C";
		preferences?: string[];
	};
	analytics?: PublicAnalyticsDimensions;
};

export function LeadFormView({
	context,
	title = "Оставить заявку",
	description = "Перезвоним и уточним задачу. Согласие на обработку данных обязательно.",
	submitLabel = "Отправить заявку",
	intakeKind,
	entityContext,
	analytics,
}: LeadFormViewProps) {
	const ids = {
		name: useId(),
		phone: useId(),
		message: useId(),
		consent: useId(),
		formError: useId(),
		success: useId(),
	};
	const nameRef = useRef<HTMLInputElement>(null);
	const phoneRef = useRef<HTMLInputElement>(null);
	const consentRef = useRef<HTMLButtonElement>(null);
	const successRef = useRef<HTMLParagraphElement>(null);
	const [status, setStatus] = useState<FormStatus>("default");
	const [nameError, setNameError] = useState<string>();
	const [phoneError, setPhoneError] = useState<string>();
	const [consentError, setConsentError] = useState<string>();
	const [formError, setFormError] = useState<string>();
	const [renderedAt] = useState(() => new Date().toISOString());
	const [requestAttemptId, setRequestAttemptId] = useState(() =>
		crypto.randomUUID(),
	);
	const [consentAccepted, setConsentAccepted] = useState(false);

	useEffect(() => {
		if (status === "success") {
			successRef.current?.focus();
		}
	}, [status]);

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = event.currentTarget;
		const data = new FormData(form);
		const name = String(data.get("name") ?? "").trim();
		const phone = String(data.get("phone") ?? "").trim();
		const message = String(data.get("message") ?? "").trim();
		const nextNameError = name.length < 2 ? "Укажите имя." : undefined;
		const nextPhoneError = phone.length < 5 ? "Укажите телефон." : undefined;
		const nextConsentError = !consentAccepted
			? "Нужно согласие на обработку персональных данных."
			: undefined;
		setNameError(nextNameError);
		setPhoneError(nextPhoneError);
		setConsentError(nextConsentError);
		if (nextNameError || nextPhoneError || nextConsentError) {
			setStatus("invalid");
			setFormError("Проверьте поля формы.");
			if (nextNameError) nameRef.current?.focus();
			else if (nextPhoneError) phoneRef.current?.focus();
			else consentRef.current?.focus();
			return;
		}

		setStatus("submitting");
		setFormError(undefined);
		const submittedAt = new Date().toISOString();
		try {
			const response = await fetch("/api/public/leads", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					name,
					phone,
					message,
					formKind: intakeKind ?? toIntakeFormKind(context.formKind),
					sourcePage: context.sourcePage,
					property: context.property?.id,
					context: entityContext,
					consentAccepted: true,
					consentVersion: context.consentVersion,
					honeypot: String(data.get("company") ?? ""),
					renderedAt,
					submittedAt,
					requestAttemptId,
				}),
			});
			const payload = (await response.json()) as {
				accepted?: boolean;
				code?: string;
			};
			if (!response.ok || payload.accepted !== true) {
				setStatus("server_error");
				setFormError(
					"Не удалось отправить заявку. Позвоните нам или попробуйте ещё раз.",
				);
				return;
			}
			form.reset();
			setRequestAttemptId(crypto.randomUUID());
			setConsentAccepted(false);
			setStatus("success");
		} catch {
			setStatus("server_error");
			setFormError(
				"Не удалось отправить заявку. Проверьте соединение и попробуйте ещё раз.",
			);
		}
	}

	return (
		<form
			id="lead-form"
			data-lead-kind={intakeKind ?? toIntakeFormKind(context.formKind)}
			aria-label="Форма заявки"
			aria-describedby={formError ? ids.formError : undefined}
			noValidate
			onSubmit={onSubmit}
			{...analyticsAttributes("development_price_request_submit", analytics)}
		>
			<Card elevation="raised">
				<CardHeader>
					<CardTitle>{title}</CardTitle>
					<CardDescription>{description}</CardDescription>
				</CardHeader>
				<CardContent>
					<FieldGroup>
						<input
							type="text"
							name="company"
							tabIndex={-1}
							autoComplete="off"
							className="absolute left-[-9999px] h-0 w-0 overflow-hidden"
							aria-hidden="true"
						/>
						<Field>
							<FieldLabel htmlFor={ids.name}>Имя</FieldLabel>
							<Input
								ref={nameRef}
								id={ids.name}
								name="name"
								autoComplete="name"
								aria-invalid={Boolean(nameError)}
								aria-describedby={nameError ? `${ids.name}-error` : undefined}
								disabled={status === "submitting"}
							/>
							<FieldError id={`${ids.name}-error`}>{nameError}</FieldError>
						</Field>
						<Field>
							<FieldLabel htmlFor={ids.phone}>Телефон</FieldLabel>
							<Input
								ref={phoneRef}
								id={ids.phone}
								name="phone"
								type="tel"
								inputMode="tel"
								autoComplete="tel"
								aria-invalid={Boolean(phoneError)}
								aria-describedby={phoneError ? `${ids.phone}-error` : undefined}
								disabled={status === "submitting"}
							/>
							<FieldError id={`${ids.phone}-error`}>{phoneError}</FieldError>
						</Field>
						<Field>
							<FieldLabel htmlFor={ids.message}>Комментарий</FieldLabel>
							<Textarea
								id={ids.message}
								name="message"
								rows={4}
								disabled={status === "submitting"}
							/>
							<FieldDescription>Необязательно.</FieldDescription>
						</Field>
						<Field>
							<div className="flex items-start gap-3">
								<Checkbox
									ref={consentRef}
									id={ids.consent}
									checked={consentAccepted}
									onCheckedChange={(value) =>
										setConsentAccepted(value === true)
									}
									aria-invalid={Boolean(consentError)}
									aria-describedby={`${ids.consent}-copy${consentError ? ` ${ids.consent}-error` : ""}`}
									disabled={status === "submitting"}
									required={context.consentRequired}
								/>
								<FieldLabel
									htmlFor={ids.consent}
									className="font-normal leading-step-copy"
								>
									<span id={`${ids.consent}-copy`}>
										Даю согласие на обработку персональных данных в соответствии
										с{" "}
										<a
											className="font-medium underline underline-offset-4"
											href={context.consentHref}
										>
											условиями обработки персональных данных
										</a>
										.
									</span>
								</FieldLabel>
							</div>
							<FieldError id={`${ids.consent}-error`}>
								{consentError}
							</FieldError>
						</Field>
						{formError ? (
							<p
								id={ids.formError}
								role="alert"
								className="text-label text-[var(--status-danger)]"
							>
								{formError}
							</p>
						) : null}
						{status === "success" ? (
							<p
								ref={successRef}
								id={ids.success}
								tabIndex={-1}
								className="text-label font-semibold text-action-primary"
							>
								Заявка принята. Мы свяжемся с вами.
							</p>
						) : null}
					</FieldGroup>
				</CardContent>
				<CardFooter>
					<Button type="submit" disabled={status === "submitting"}>
						{status === "submitting" ? "Отправляем…" : submitLabel}
					</Button>
				</CardFooter>
			</Card>
		</form>
	);
}
