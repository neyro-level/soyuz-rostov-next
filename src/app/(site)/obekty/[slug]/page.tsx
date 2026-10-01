import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type LegacyPropertyPageProps = { params: Promise<{ slug: string }> };

export default async function PropertyPage({
	params,
}: LegacyPropertyPageProps) {
	await params;
	notFound();
}
