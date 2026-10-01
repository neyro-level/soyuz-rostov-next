import { StarterSiteFooter, StarterSiteHeader } from "@ams/realtbase-ui";
import type { ReactNode } from "react";
import { getPublicShell } from "@/project/data-access/public";

export const revalidate = 3600;

export default async function PublicSiteLayout({
	children,
}: {
	children: ReactNode;
}) {
	const shell = await getPublicShell();
	return (
		<div className="min-h-screen bg-surface-page text-content-strong">
			<StarterSiteHeader
				header={shell.header}
				geoSwitcher={shell.geoSwitcher}
			/>
			<main>{children}</main>
			<StarterSiteFooter footer={shell.footer} />
		</div>
	);
}
