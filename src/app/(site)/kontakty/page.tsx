import {
	MarketingRoute,
	generateMarketingMetadata,
} from "../marketing-route";

export const revalidate = 3600;

export function generateMetadata() {
	return generateMarketingMetadata("kontakty");
}
export default function Page() {
	return <MarketingRoute slug="kontakty" />;
}