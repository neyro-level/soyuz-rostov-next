import { getPublicShell } from "@/project/data-access/public";
import { projectFont } from "@/project/font.generated";
import { toPublicSiteMetadata } from "@/core/seo/page-metadata";
import { getProjectIndexingPolicy } from "@/project/indexing-policy";
import { getSiteUrl } from "@/project/seo/site";
import { searchConsoleVerificationMetadata } from "@/project/seo/search-console";
import { siteConfig } from "@/project/site.config";
import { siteProfile } from "@/project/site-profile";

import "./globals.css";

export async function generateMetadata() {
	const shell = await getPublicShell();
	return toPublicSiteMetadata({
		metadataBase: new URL(getSiteUrl()),
		title: shell.header.brandName,
		options: {
			globalIndexingPolicy: getProjectIndexingPolicy(),
			webmasterVerification: searchConsoleVerificationMetadata(
				siteProfile.searchConsole,
			),
		},
	});
}

export default function RootLayout({ children }: LayoutProps<"/">) {
	return (
		<html lang={siteConfig.locale}>
			<body className={projectFont.variable}>{children}</body>
		</html>
	);
}
