import {
	MarketingRoute,
	generateMarketingMetadata,
} from "../marketing-route";

export const revalidate = 3600;

export function generateMetadata() {
	return generateMarketingMetadata("soglasie-na-obrabotku-personalnyh-dannyh");
}
export default function Page() {
	return <MarketingRoute slug="soglasie-na-obrabotku-personalnyh-dannyh" />;
}