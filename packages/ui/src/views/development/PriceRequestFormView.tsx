import type { LeadFormContext } from "@ams/realtbase-contracts";
import type { PublicAnalyticsDimensions } from "../shared/analytics-attributes";
import { LeadFormView } from "../starter/LeadFormView";

export function PriceRequestFormView({
	leadContext,
	developmentSlug,
	geo,
	analytics,
}: {
	leadContext: LeadFormContext;
	developmentSlug: string;
	geo?: string;
	analytics?: PublicAnalyticsDimensions;
}) {
	return (
		<LeadFormView
			context={leadContext}
			entityContext={{ development: developmentSlug, geo }}
			analytics={analytics}
			title="Запросить актуальные цены"
			description="Уточним доступные варианты и дату последней проверки цены."
			submitLabel="Запросить цены"
		/>
	);
}
