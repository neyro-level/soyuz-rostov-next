import type { PropertyCardDTO } from "@ams/realtbase-contracts";
import type { JournalArticleCardDTO } from "@ams/realtbase-contracts/journal";
import type { Button } from "@ams/realtbase-ui/primitives";
import type { HomeHeroView } from "@ams/realtbase-ui/views";
import type { formatRublePrice } from "@ams/realtbase-ui";

export type WorkspaceConsumptionProof = {
	property: PropertyCardDTO;
	journal: JournalArticleCardDTO;
	button: typeof Button;
	homeHero: typeof HomeHeroView;
	formatter: typeof formatRublePrice;
};
