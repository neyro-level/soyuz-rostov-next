import { Check, X } from "lucide-react";
import type { RefObject } from "react";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent } from "../../components/ui/dialog";

type LeadSuccessNoticeViewProps = {
	onClose: () => void;
	closeButtonRef?: RefObject<HTMLButtonElement | null>;
};

export function LeadSuccessNoticeView({
	onClose,
	closeButtonRef,
}: LeadSuccessNoticeViewProps) {
	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<DialogContent
				showClose={false}
				overlayClassName="z-[120] bg-[var(--overlay-soft)] backdrop-blur-[2px]"
				aria-labelledby="lead-success-title"
				className="z-[121] w-[min(calc(100vw-32px),430px)] max-w-107.5 overflow-hidden rounded-xl border border-white/80 bg-[var(--surface-card)] px-7 pb-7 pt-10 text-center shadow-[var(--shadow-dialog)] sm:px-9 sm:pb-9"
			>
				<Button
					variant="ghost"
					size="icon"
					type="button"
					onClick={onClose}
					aria-label="Закрыть уведомление"
					className="absolute right-4 top-4 grid place-items-center rounded-lg text-[var(--lead-success-notice-content-primary)] transition hover:bg-[var(--lead-success-notice-surface-primary)] hover:text-[var(--text-primary)]"
				>
					<X className="" aria-hidden />
				</Button>
				<span className="mx-auto grid size-14 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
					<Check className="size-7" strokeWidth={2} aria-hidden />
				</span>
				<h2
					id="lead-success-title"
					className="mt-5 text-section-small font-semibold leading-tight-copy text-[var(--text-primary)]"
				>
					Спасибо за обращение
				</h2>
				<p className="mx-auto mt-3 max-w-80 text-body leading-step-copy text-[var(--lead-success-notice-content-secondary)]">
					Ваша заявка зафиксирована. Мы свяжемся с вами в ближайшее время.
				</p>
				<Button
					ref={closeButtonRef}
					type="button"
					onClick={onClose}
					className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[var(--accent)] px-5 text-body font-semibold text-white hover:bg-[var(--accent-hover)]"
				>
					Хорошо
				</Button>
			</DialogContent>
		</Dialog>
	);
}
