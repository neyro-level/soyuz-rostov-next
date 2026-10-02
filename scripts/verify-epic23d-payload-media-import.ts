import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { getPayload } from "payload";
import { systemOverrideAccess } from "../src/core/data-access/system/overrides.ts";
import config from "../payload.config.ts";

const access = systemOverrideAccess("system-job");

const require = createRequire(import.meta.url);
const { S3Client, HeadObjectCommand, GetObjectCommand, DeleteObjectCommand } = require("../node_modules/.pnpm/@aws-sdk+client-s3@3.1144.0/node_modules/@aws-sdk/client-s3");

const png = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
	"base64",
);
const sourceSha256 = createHash("sha256").update(png).digest("hex");
const proofId = randomUUID();
const filename = `szh23d-payload-media-proof-${proofId}.png`;
const prefix = (process.env.S3_PREFIX || "media").replace(/^\/+|\/+$/g, "");
const key = `${prefix}/${filename}`;

const required = [
	"DATABASE_URI",
	"PAYLOAD_SECRET",
	"S3_ENDPOINT",
	"S3_REGION",
	"S3_BUCKET",
	"S3_ACCESS_KEY_ID",
	"S3_SECRET_ACCESS_KEY",
];
for (const name of required) {
	if (!process.env[name]) throw new Error(`${name} is required`);
}
const s3AccessKeyId = process.env.S3_ACCESS_KEY_ID;
const s3SecretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
if (!s3AccessKeyId || !s3SecretAccessKey) {
	throw new Error("S3 credentials are required");
}
if (/soyuz_rostov_prod/i.test(process.env.DATABASE_URI ?? "")) {
	throw new Error("Refusing to run Payload media proof against soyuz_rostov_prod");
}

const payload = await getPayload({ config });
let mediaId: string | number | null = null;
try {
	const created = await payload.create({
		collection: "media",
		data: {
			alt: "EPIC-23d disposable Payload media import proof",
			ownership: "proof-disposable",
			sourceUrl: "urn:ams-proof:szh-task-23d",
			sourceHost: "internal-proof",
			sourceRights: "Disposable internal proof object; not public content.",
			sourceSha256,
			mirroredAt: new Date().toISOString(),
		},
		file: {
			data: png,
			mimetype: "image/png",
			name: filename,
			size: png.length,
		},
		...access,
		depth: 0,
	});
	mediaId = created.id;
	if (created.filename !== filename) {
		throw new Error(`Unexpected stored filename: ${created.filename}`);
	}
	const fetched = await payload.findByID({
		collection: "media",
		id: created.id,
		...access,
		depth: 0,
	});
	if (fetched.sourceSha256 !== sourceSha256) {
		throw new Error("Payload media record readback SHA mismatch");
	}
	const client = new S3Client({
		region: process.env.S3_REGION,
		endpoint: process.env.S3_ENDPOINT,
		forcePathStyle: String(process.env.S3_FORCE_PATH_STYLE || "true") !== "false",
		credentials: {
			accessKeyId: s3AccessKeyId,
			secretAccessKey: s3SecretAccessKey,
		},
	});
	const head = await client.send(new HeadObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
	const got = await client.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
	const chunks: Buffer[] = [];
	for await (const chunk of got.Body) chunks.push(Buffer.from(chunk));
	const readSha256 = createHash("sha256").update(Buffer.concat(chunks)).digest("hex");
	if (readSha256 !== sourceSha256) throw new Error("S3 object readback SHA mismatch");
	await payload.delete({ collection: "media", id: created.id, ...access, depth: 0 });
	mediaId = null;
	try {
		await client.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
	} catch {
		// Payload storage may already delete the object; cleanup is best-effort after record delete.
	}
	console.log(JSON.stringify({
		status: "PASS",
		payloadMediaRecord: "created-read-deleted",
		s3Object: "put-by-payload-readback-cleaned",
		keyRedacted: `${prefix}/<payload-media-proof>.png`,
		bytes: png.length,
		sha256: sourceSha256,
		etagPresent: Boolean(head.ETag),
		productionDbRefused: true,
	}, null, 2));
} finally {
	if (mediaId !== null) {
		await payload.delete({ collection: "media", id: mediaId, ...access, depth: 0 }).catch(() => undefined);
	}
	await payload.destroy();
}

process.exit(0);
