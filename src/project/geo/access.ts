import type { Access, PayloadRequest, Where } from "payload";
import { hasRole } from "../../core/access/roles.ts";
import { isPublicGatewayRead } from "../data-access/public/access-mode.ts";

export const geoValidationOperation = "geo-validation" as const;

export function geoValidationContext(req: Pick<PayloadRequest, "context">) {
	return {
		...(req.context ?? {}),
		geoOperation: geoValidationOperation,
	};
}

export const geoReadAccess: Access = ({ req }) => {
	if (hasRole(req.user, ["owner", "admin"])) return true;
	if (isPublicGatewayRead(req)) {
		const publicGeoWhere: Where = {
			and: [
				{ status: { equals: "published" } },
				{ publishedAt: { exists: true } },
			],
		};
		return publicGeoWhere;
	}
	return (
		(req.context as { geoOperation?: string } | undefined)?.geoOperation ===
		geoValidationOperation
	);
};
