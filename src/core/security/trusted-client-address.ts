import { isIP } from "node:net";

type RequestHeaders = Pick<Request, "headers">;

export function getTrustedClientAddress(request: RequestHeaders): string {
	const address = request.headers.get("x-real-ip")?.trim();
	return address && isIP(address) !== 0 ? address : "untrusted";
}
