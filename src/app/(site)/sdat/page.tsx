import {
	MarketingRoute,
	generateMarketingMetadata,
} from "../marketing-route";

export const revalidate = 3600;

export function generateMetadata() {
	return generateMarketingMetadata("sdat");
}
export default function Page() {
	return <MarketingRoute slug="sdat" />;
}