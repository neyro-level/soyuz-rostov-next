import { X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent } from "../../components/ui/dialog";
import type { LegalDocumentSectionDTO } from "../../view-models/content";

type LegalDocumentModalViewProps = {
	title: string;
	updatedAt: string;
	sections: readonly LegalDocumentSectionDTO[];
	closeLabel?: string;
	onClose: () => void;
};

export function LegalDocumentModalView({
	title,
	updatedAt,
	sections,
	closeLabel = "Закрыть документ",
	onClose,
}: LegalDocumentModalViewProps) {
	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<DialogContent
				showClose={false}
				overlayClassName="z-[120] bg-[var(--overlay-default)]"
				className="z-[121] grid max-h-[88dvh] w-[min(calc(100vw-32px),860px)] max-w-215 grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden rounded-sm border border-[var(--border)] bg-[var(--surface-card)] p-0 text-left shadow-[var(--shadow-dialog)]"
				aria-labelledby="legal-document-modal-title"
			>
				<div className="border-b border-[var(--border)] px-5 py-4 pr-14 text-left sm:px-7 sm:py-5">
					<p className="text-overline font-semibold uppercase tracking-overline text-[var(--accent)] sm:text-caption">
						Редакция {updatedAt}
					</p>
					<h2
						id="legal-document-modal-title"
						className="mt-2 max-w-170 text-left text-heading-small font-semibold leading-tight-copy text-[var(--text-primary)] sm:text-section-large"
					>
						{title}
					</h2>
					<Button
						variant="outline"
						size="icon"
						type="button"
						autoFocus
						className="absolute right-4 top-4 grid place-items-center rounded-compact border border-[var(--border)] bg-[var(--surface-card)] text-[var(--text-primary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
						aria-label={closeLabel}
						onClick={onClose}
					>
						<X className="" aria-hidden />
					</Button>
				</div>

				<div className="overflow-y-auto px-5 py-5 text-left sm:px-7 sm:py-6">
					<div className="grid max-w-180 gap-6 text-left text-body font-normal leading-body text-[var(--legal-document-modal-content-primary)] sm:text-body-compact">
						{sections.map((section) => (
							<section key={section.title}>
								<h3 className="text-left text-body-compact font-semibold leading-tight-copy text-[var(--text-primary)] sm:text-body-large">
									{section.title}
								</h3>
								{section.paragraphs?.length ? (
									<div className="mt-3 grid gap-3">
										{section.paragraphs.map((paragraph) => (
											<p key={paragraph}>{paragraph}</p>
										))}
									</div>
								) : null}
								{section.items?.length ? (
									<ul className="mt-3 grid gap-2">
										{section.items.map((item) => (
											<li
												key={item}
												className="grid grid-cols-[8px_minmax(0,1fr)] gap-3 text-left"
											>
												<span
													className="mt-2 size-1.5 rounded-full bg-[var(--accent)]"
													aria-hidden
												/>
												<span>{item}</span>
											</li>
										))}
									</ul>
								) : null}
							</section>
						))}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
