import type { LeadFormContext } from "@ams/realtbase-contracts";

export type LeadConsentFieldProps = {
	context: LeadFormContext;
	id?: string;
	className?: string;
};

/**
 * Presentation-only consent proof. The future lead intake must validate this
 * context against trusted server configuration before persisting evidence.
 */
export function LeadConsentField({
	context,
	id = "lead-consent",
	className = "",
}: LeadConsentFieldProps) {
	const descriptionId = `${id}-description`;

	return (
		<div
			className={`grid gap-2 ${className}`.trim()}
			data-consent-version={context.consentVersion}
			data-form-kind={context.formKind}
			data-source-page={context.sourcePage}
		>
			<label
				className="flex items-start gap-3 text-body leading-step-copy text-[var(--content-default)]"
				htmlFor={id}
			>
				<input
					aria-describedby={descriptionId}
					className="mt-1 size-4 shrink-0 accent-[var(--action-primary)]"
					id={id}
					name="consentAccepted"
					required={context.consentRequired}
					type="checkbox"
					value="true"
				/>
				<span id={descriptionId}>
					Даю согласие на обработку персональных данных в соответствии с{" "}
					<a
						className="font-medium text-[var(--content-strong)] underline underline-offset-4"
						href={context.consentHref}
						rel="noreferrer"
						target="_blank"
					>
						условиями обработки персональных данных
					</a>
					.
				</span>
			</label>
			<p className="text-caption text-[var(--content-default)]">
				Версия согласия: {context.consentVersion}
			</p>
		</div>
	);
}
