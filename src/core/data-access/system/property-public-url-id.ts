import type { PayloadRequest } from "payload";

export async function allocatePropertyPublicUrlId(req: PayloadRequest): Promise<number> {
	const result = await req.payload.db.pool.query<{ public_url_id: string }>(
		`SELECT nextval('properties_public_url_id_seq')::text AS public_url_id`,
	);
	const value = Number(result.rows[0]?.public_url_id);
	if (!Number.isSafeInteger(value) || value <= 0) {
		throw new Error("Property public URL ID allocation failed.");
	}
	return value;
}
