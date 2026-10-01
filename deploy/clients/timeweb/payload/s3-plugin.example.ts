// @ts-nocheck -- activation source copied to src/project/timeweb-s3.plugin.ts.
// Exact compatibility: @payloadcms/storage-s3@3.90.2 + payload@3.90.2.
import { s3Storage } from "@payloadcms/storage-s3";
import { runtimeEnv } from "./env.ts";

const required = (name: string): string => {
	const value = runtimeEnv[name as keyof typeof runtimeEnv];
	if (!value) throw new Error(`${name} is required for client S3 activation`);
	return String(value).trim();
};

export const timewebS3Plugin = s3Storage({
	enabled: true,
	collections: {
		media: {
			prefix: required("S3_PREFIX"),
		},
	},
	bucket: required("S3_BUCKET"),
	disableLocalStorage: true,
	useCompositePrefixes: false,
	config: {
		// Timeweb Cloud S3-compatible endpoint, for example https://s3.twcstorage.ru.
		endpoint: required("S3_ENDPOINT"),
		region: required("S3_REGION"),
		forcePathStyle: true,
		credentials: {
			accessKeyId: required("S3_ACCESS_KEY_ID"),
			secretAccessKey: required("S3_SECRET_ACCESS_KEY"),
		},
	},
});
