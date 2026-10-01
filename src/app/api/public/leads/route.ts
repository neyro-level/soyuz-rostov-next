import { NextResponse, type NextRequest } from "next/server";
import { submitPublicLead } from "../../../../project/data-access/public/leads.ts";
import { getTrustedClientAddress } from "../../../../core/security/trusted-client-address.ts";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json(
			{ accepted: false, code: "lead.invalid_payload" },
			{ status: 400 },
		);
	}

	const result = await submitPublicLead({
		body,
		rateLimitKey: getTrustedClientAddress(request),
	});

	if (!result.accepted) {
		return NextResponse.json(
			{ accepted: false, code: result.code },
			{ status: result.status },
		);
	}

	return NextResponse.json({
		accepted: true,
		reused: result.reused,
	});
}
