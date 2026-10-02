import { notFound } from "next/navigation";

export const revalidate = 3600;

export function generateMetadata() {
	return {};
}

export default function Page() {
	notFound();
}
