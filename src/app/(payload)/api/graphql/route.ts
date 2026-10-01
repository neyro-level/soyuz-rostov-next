export function GET() {
	return Response.json({ error: "GraphQL is disabled for this project." }, { status: 404 });
}

export const POST = GET;
