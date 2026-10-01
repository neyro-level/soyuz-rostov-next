import { Building2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import type { CatalogView } from "../property/PropertyCardView";

type Props = {
	variant?: CatalogView;
	source?: string;
	formType?: string;
	onRequest?: () => void;
	copy: { eyebrow: string; title: string; description: string; action: string };
};

export const NEW_BUILDING_SELECTION_CARD_INDEX = 7;

export function CatalogNewBuildingSelectionCardView({
	variant = "grid",
	source = "catalog:new-building-selection-card",
	formType = "new_building_selection_request",
	onRequest,
	copy,
}: Props) {
	if (variant === "list") {
		return (
			<CatalogNewBuildingSelectionListCard
				copy={copy}
				source={`${source}:list`}
				formType={formType}
				onRequest={onRequest}
			/>
		);
	}

	return (
		<CatalogNewBuildingSelectionGridCard
			copy={copy}
			source={source}
			formType={formType}
			onRequest={onRequest}
		/>
	);
}

function CatalogNewBuildingSelectionGridCard({
	copy,
	source: _source,
	formType: _formType,
	onRequest,
}: {
	copy: Props["copy"];
	source: string;
	formType: string;
	onRequest?: () => void;
}) {
	return (
		<article className="-m-2 min-w-0 p-2">
			<div className="flex h-full min-h-85.5 flex-col rounded-lg border border-[var(--catalog-new-building-selection-card-border-default)] bg-[var(--accent-soft)] p-5 transition duration-300 hover:-translate-y-0.5 hover:border-[var(--catalog-new-building-selection-card-border-hover)] hover:shadow-[var(--catalog-new-building-selection-card-shadow-card)]">
				<div className="flex size-11 items-center justify-center rounded-lg bg-[var(--surface-card)] text-[var(--accent)] shadow-[var(--catalog-new-building-selection-card-shadow-subtle)]">
					<Building2 className="size-5" aria-hidden />
				</div>
				<h3 className="mt-5 text-card-title-large font-extrabold leading-tight-copy text-[var(--text-primary)]">
					{copy.title}
				</h3>
				<p className="mt-3 text-body leading-step-copy text-[var(--text-secondary)]">
					{copy.description}
				</p>
				<Button
					type="button"
					onClick={onRequest}
					className="mt-auto inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-center text-body font-semibold text-white transition hover:bg-[var(--accent-hover)]"
				>
					{copy.action}
				</Button>
			</div>
		</article>
	);
}

function CatalogNewBuildingSelectionListCard({
	copy,
	source: _source,
	formType: _formType,
	onRequest,
}: {
	copy: Props["copy"];
	source: string;
	formType: string;
	onRequest?: () => void;
}) {
	return (
		<article className="bg-transparent py-6">
			<div className="grid gap-5 rounded-lg border border-[var(--catalog-new-building-selection-card-border-default)] bg-[var(--accent-soft)] p-6 md:grid-cols-[minmax(0,1fr)_260px] md:items-end">
				<div className="max-w-2xl">
					<p className="text-caption font-bold uppercase tracking-caps text-[var(--accent)]">
						{copy.eyebrow}
					</p>
					<h3 className="mt-3 text-heading-medium font-extrabold leading-card-title text-[var(--text-primary)]">
						{copy.title}
					</h3>
					<p className="mt-3 text-body leading-step-copy text-[var(--text-secondary)]">
						{copy.description}
					</p>
				</div>
				<Button
					type="button"
					onClick={onRequest}
					className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-center text-body font-semibold text-white transition hover:bg-[var(--accent-hover)]"
				>
					{copy.action}
				</Button>
			</div>
		</article>
	);
}
