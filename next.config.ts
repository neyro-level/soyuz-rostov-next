import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";
import {
	buildImageCspSrc,
	parseAllowedImageHosts,
	toNextImageRemotePatterns,
} from "./src/core/ingest/image-hosts.ts";
import { buildSecurityHeaders } from "./src/core/security/headers.ts";

const allowedImageHosts = parseAllowedImageHosts(
	process.env.EXTERNAL_IMAGE_HOSTS,
);
const imageCspSrc = buildImageCspSrc(allowedImageHosts);

const { baseSecurityHeaders, publicCsp, adminCsp } = buildSecurityHeaders({
	imageCspSrc,
	analyticsProvider: process.env.ANALYTICS_PROVIDER,
	hstsPreload: process.env.HSTS_PRELOAD === "true",
});

const nextConfig: NextConfig = {
	trailingSlash: true,
	skipTrailingSlashRedirect: true,
	transpilePackages: ["@ams/realtbase-ui", "@ams/realtbase-contracts"],
	images: {
		remotePatterns: toNextImageRemotePatterns(allowedImageHosts),
	},
	async headers() {
		return [
			{
				source: "/admin",
				headers: [
					...baseSecurityHeaders,
					{ key: "Content-Security-Policy", value: adminCsp },
				],
			},
			{
				source: "/admin/:path*",
				headers: [
					...baseSecurityHeaders,
					{ key: "Content-Security-Policy", value: adminCsp },
				],
			},
			{
				source: "/((?!admin(?:/|$)).*)",
				headers: [
					...baseSecurityHeaders,
					{ key: "Content-Security-Policy", value: publicCsp },
				],
			},
		];
	},
};

export default withPayload(nextConfig);
