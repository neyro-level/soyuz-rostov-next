import "server-only";

import { publicGatewayReadAccess } from "./access-mode.ts";

export const publicGatewayPolicy = {
	...publicGatewayReadAccess(),
	depth: 0,
	maxLimit: 48,
	output: "dto",
} as const;
