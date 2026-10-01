import { getPayload } from "payload";
import config from "../payload.config.ts";
import { runPropertyGeoBackfill } from "../src/core/data-access/system/property-geo-backfill.ts";
import { requirePayloadRuntime } from "../src/project/env.ts";

const argument = (name: string) => {
	const prefix = `--${name}=`;
	return process.argv
		.find((item) => item.startsWith(prefix))
		?.slice(prefix.length);
};

const importRunId = argument("import-run-id");
if (!importRunId || !/^\d+$/.test(importRunId)) {
	throw new Error(
		"Use --import-run-id=<numeric id> to bind evidence to one import run.",
	);
}
const apply = process.argv.includes("--apply");
requirePayloadRuntime();
const payload = await getPayload({ config });
try {
	const report = await runPropertyGeoBackfill({ payload, importRunId, apply });
	console.log(JSON.stringify(report));
} finally {
	await payload.destroy();
}
