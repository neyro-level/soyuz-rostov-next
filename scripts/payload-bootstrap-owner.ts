import { getPayload } from "payload";
import config from "../payload.config.ts";
import { requirePayloadRuntime } from "../src/project/env.ts";
import { systemOverrideAccess } from "../src/core/data-access/system/payload-access.ts";

requirePayloadRuntime();

const email = process.env.PAYLOAD_OWNER_EMAIL;
const password = process.env.PAYLOAD_OWNER_PASSWORD;

if (!email || !password) {
	throw new Error(
		"PAYLOAD_OWNER_EMAIL and PAYLOAD_OWNER_PASSWORD are required.",
	);
}

const payload = await getPayload({ config });
const existingOwners = await payload.find({
	collection: "users",
	depth: 0,
	limit: 1,
	...systemOverrideAccess("bootstrap-owner"),
	where: {
		roles: {
			contains: "owner",
		},
	},
});

if (existingOwners.totalDocs > 0) {
	payload.logger.info("payload owner bootstrap: owner already exists");
	await payload.destroy();
	process.exit(0);
}

await payload.create({
	collection: "users",
	data: {
		email,
		password,
		roles: ["owner"],
	},
	...systemOverrideAccess("bootstrap-owner"),
});

payload.logger.info("payload owner bootstrap: owner created");
await payload.destroy();
