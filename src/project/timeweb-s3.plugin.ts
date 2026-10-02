// Activated from the version-pinned Timeweb client storage source.
// Exact compatibility: @payloadcms/storage-s3@3.90.2 + payload@3.90.2.
import { s3Storage } from "@payloadcms/storage-s3";
import { detectRuntimeEnvMode, runtimeEnv } from "./env.ts";

const s3Keys = [
	"S3_ENDPOINT",
	"S3_REGION",
	"S3_BUCKET",
	"S3_ACCESS_KEY_ID",
	"S3_SECRET_ACCESS_KEY",
	"S3_PREFIX",
] as const;

const required = (name: (typeof s3Keys)[number]): string => {
	const value = runtimeEnv[name];
	if (!value) throw new Error(`${name} is required for client S3 activation`);
	return String(value).trim();
};

const isS3Configured = s3Keys.every((key) => runtimeEnv[key]);

if (!isS3Configured && detectRuntimeEnvMode() === "runtime") {
	throw new Error("S3_* is required for client S3 activation");
}

export const timewebS3Plugin = s3Storage({
	enabled: isS3Configured,
	collections: {
		media: {
			prefix: isS3Configured ? required("S3_PREFIX") : "media",
		},
	},
	bucket: isS3Configured ? required("S3_BUCKET") : "disabled-local-bucket",
	disableLocalStorage: isS3Configured,
	useCompositePrefixes: false,
	config: {
		// Timeweb Cloud S3-compatible endpoint, for example https://s3.twcstorage.ru.
		endpoint: isS3Configured
			? required("S3_ENDPOINT")
			: "http://127.0.0.1",
		region: isS3Configured ? required("S3_REGION") : "local",
		forcePathStyle: true,
		credentials: {
			accessKeyId: isS3Configured
				? required("S3_ACCESS_KEY_ID")
				: "disabled",
			secretAccessKey: isS3Configured
				? required("S3_SECRET_ACCESS_KEY")
				: "disabled",
		},
	},
});
