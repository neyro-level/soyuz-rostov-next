import { getPayload } from "payload";
import config from "../payload.config.ts";
import {
	createPayloadStarterFixtureResetPort,
	createPayloadStarterFixtureSeedPort,
} from "../src/core/data-access/system/starter-fixture-port.ts";
import { requirePayloadRuntime } from "../src/project/env.ts";
import {
	resetStarterFixture,
	seedStarterFixture,
} from "../src/project/fixture-data/starter-seed.ts";

requirePayloadRuntime();
if (process.env.NEXT_PUBLIC_INDEXABLE === "true") {
	throw new Error("Starter fixture seed refuses an indexable runtime.");
}
const payload = await getPayload({ config });

try {
	const resetRequested = process.argv.includes("--reset");
	if (resetRequested) {
		if (!process.argv.includes("--confirm=p8-22")) {
			throw new Error("Starter fixture reset requires --confirm=p8-22.");
		}
		const report = await resetStarterFixture(
			createPayloadStarterFixtureResetPort(payload),
		);
		payload.logger.info(`starter fixture reset: ${JSON.stringify(report)}`);
	} else {
		const report = await seedStarterFixture(
			createPayloadStarterFixtureSeedPort(payload),
		);
		payload.logger.info(`starter fixture seed: ${JSON.stringify(report)}`);
	}
} finally {
	await payload.destroy();
}
