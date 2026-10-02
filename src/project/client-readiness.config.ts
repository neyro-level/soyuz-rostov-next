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

export const clientReadinessConfig = {
	"domain": "souz-home.ru",
	"deploymentTarget": "approved-runtime",
	"database": "approved-managed-postgresql",
	"mediaStorage": "timeweb-s3",
	"feedImageSource": "external-urls",
	"jobsActiveRuntimeCount": 1,
	"leadRetentionDays": 180,
	"archiveRetentionDays": 90,
	"legalContent": "approved",
	"requiredHostAllowlists": {
		"outbound": [
			"soyuz-rostov.tw1.ru"
		],
		"externalImages": [
			"soyuz-rostov.tw1.ru"
		],
		"leadOutbound": [
			"soyuz-rostov.tw1.ru"
		]
	},
	"nginx": true,
	"automaticBackup": true,
	"externalMonitoring": true,
	"productionIndexing": "noindex"
} as const satisfies ClientReadinessConfig;
