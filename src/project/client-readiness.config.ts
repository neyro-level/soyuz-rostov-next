export type ClientReadinessConfig = {
	domain: string | null;
	deploymentTarget: "timeweb-vps" | "approved-runtime" | null;
	database: "timeweb-managed-postgresql" | "approved-managed-postgresql" | null;
	mediaStorage: "timeweb-s3" | "approved-object-storage" | null;
	feedImageSource: "external-urls" | "object-storage" | null;
	jobsActiveRuntimeCount: number | null;
	leadRetentionDays: number | null;
	archiveRetentionDays: number | null;
	legalContent: "approved" | "placeholder";
	productionIndexing: "public" | "noindex" | null;
	requiredHostAllowlists: {
		outbound: readonly string[];
		externalImages: readonly string[];
		leadOutbound: readonly string[];
	};
	nginx: boolean;
	automaticBackup: boolean;
	externalMonitoring: boolean;
};

/**
 * Starter-demo values are intentionally incomplete. Client clones switch
 * siteConfig.projectKind to `client` and replace every placeholder before the
 * staging/release readiness gate.
 */
export const clientReadinessConfig = {
	domain: null,
	deploymentTarget: null,
	database: null,
	mediaStorage: null,
	feedImageSource: null,
	jobsActiveRuntimeCount: null,
	leadRetentionDays: null,
	archiveRetentionDays: null,
	legalContent: "placeholder",
	productionIndexing: null,
	requiredHostAllowlists: {
		outbound: [],
		externalImages: [],
		leadOutbound: [],
	},
	nginx: false,
	automaticBackup: false,
	externalMonitoring: false,
} as const satisfies ClientReadinessConfig;
