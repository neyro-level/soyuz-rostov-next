import type { LeadFormContext } from "@ams/realtbase-contracts";
import type { PublicAnalyticsDimensions } from "../shared/analytics-attributes";
import { LeadFormView } from "../starter/LeadFormView";

export function PriceRequestFormView({
	leadContext,
	developmentSlug,
	geo,
	city,
	district,
	developer,
	dataTier,
	analytics,
}: {
	leadContext: LeadFormContext;
	developmentSlug: string;
	geo?: string;
	city?: string;
	district?: string;
	developer?: string;
	dataTier?: "A" | "B" | "C";
	analytics?: PublicAnalyticsDimensions;
}) {
	return (
		<LeadFormView
			context={leadContext}
			entityContext={{
				development: developmentSlug,
				geo,
				city,
				district,
				developer,
				dataTier,
			}}
			analytics={analytics}
			title="Запросить актуальные цены"
			description="Уточним доступные варианты и дату последней проверки цены."
			submitLabel="Запросить цены"
		/>
	);
}
