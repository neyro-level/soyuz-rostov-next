export function GET() {
	return Response.json({ error: "GraphQL playground is disabled for this project." }, { status: 404 });
}
