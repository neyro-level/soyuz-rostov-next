"use client";

import { Sparkles } from "lucide-react";

import {
	RequestModalButton,
	type RequestOverlayDetail,
} from "../../components/shared/site-overlay-context";

export type MobileStickyConversionViewProps = {
	visible: boolean;
	ariaLabel: string;
	title: string;
	note: string;
	label: string;
	request: RequestOverlayDetail;
};

export function MobileStickyConversionView({
	visible,
	ariaLabel,
	title,
	note,
	label,
	request,
}: MobileStickyConversionViewProps) {
	return (
		<aside
			aria-label={ariaLabel}
			aria-hidden={!visible}
			className={`fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 mx-auto max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface-card)]/96 p-2 shadow-[var(--expert-request-modal-shadow-primary)] backdrop-blur-xl transition duration-300 lg:hidden ${visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-[calc(100%+1.5rem)] opacity-0"}`}
		>
			<div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
				<div className="min-w-0 px-2">
					<p className="truncate text-label font-extrabold leading-step-small">
						{title}
					</p>
					<p className="mt-0.5 truncate text-caption font-semibold leading-step-small text-[var(--text-secondary)]">
						{note}
					</p>
				</div>
				<RequestModalButton
					type="button"
					tabIndex={visible ? undefined : -1}
					request={request}
					className="min-h-12 max-w-44 whitespace-normal px-3 text-center text-label leading-title-compact text-white [&_svg]:text-white"
				>
					<Sparkles data-icon="inline-start" aria-hidden />
					{label}
				</RequestModalButton>
			</div>
		</aside>
	);
}
