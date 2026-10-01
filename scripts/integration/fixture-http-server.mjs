import { createServer } from "node:http";

export function buildYrlFeed(offers) {
	const body = offers
		.map(
			(offer) => `
<offer internal-id="${offer.id}" id="${offer.id}">
  <type>продажа</type>
  <property-type>жилая</property-type>
  <category>квартира</category>
  <url>https://agency.example/offers/${offer.id}</url>
  <address>Москва, Тестовая улица, ${offer.id}</address>
  <locality-name>Москва</locality-name>
  <price>
    <value>${offer.price ?? 10_000_000}</value>
    <currency>RUR</currency>
  </price>
  <area><value>${offer.area ?? 50}</value><unit>кв. м</unit></area>
  <title>${offer.title ?? `Offer ${offer.id}`}</title>
</offer>`,
		)
		.join("\n");
	return `<?xml version="1.0" encoding="utf-8"?><realty-feed>${body}</realty-feed>`;
}

export function startFixtureHttpServer(options = {}) {
	const webhookKeys = new Set();
	let lastWebhookBody = null;
	let revalidationRequestCount = 0;

	const server = createServer((request, response) => {
		const url = new URL(request.url ?? "/", "http://127.0.0.1");
		const send = (status, body, headers = {}) => {
			response.writeHead(status, {
				"content-type": "text/plain; charset=utf-8",
				...headers,
			});
			response.end(body);
		};

		if (url.pathname === "/feed.xml") {
			send(200, buildYrlFeed([{ id: "a" }, { id: "b" }]), {
				"content-type": "application/xml; charset=utf-8",
			});
			return;
		}
		if (url.pathname === "/feed-one.xml") {
			send(200, buildYrlFeed([{ id: "a" }]), {
				"content-type": "application/xml; charset=utf-8",
			});
			return;
		}
		if (url.pathname === "/truncated.xml") {
			send(
				200,
				`<?xml version="1.0"?><realty-feed><offer id="x"><type>продажа</type>`,
				{
					"content-type": "application/xml; charset=utf-8",
				},
			);
			return;
		}
		if (url.pathname === "/redirect") {
			send(302, "", { location: "/feed.xml" });
			return;
		}
		if (url.pathname === "/slow") {
			setTimeout(() => send(200, "slow-ok"), 50);
			return;
		}
		if (url.pathname === "/timeout") {
			return;
		}
		if (url.pathname === "/webhook") {
			const chunks = [];
			request.on("data", (chunk) => chunks.push(chunk));
			request.on("end", () => {
				const body = Buffer.concat(chunks).toString("utf8");
				lastWebhookBody = body;
				const key = request.headers["idempotency-key"];
				if (typeof key === "string" && webhookKeys.has(key)) {
					send(200, "duplicate");
					return;
				}
				if (typeof key === "string") webhookKeys.add(key);
				send(200, "accepted");
			});
			return;
		}
		if (url.pathname === "/webhook-retry") {
			request.resume();
			request.on("end", () => send(503, "retry-later"));
			return;
		}
		if (
			url.pathname === "/api/internal/revalidate" &&
			request.method === "POST" &&
			typeof options.handleRevalidateRequest === "function"
		) {
			const chunks = [];
			request.on("data", (chunk) => chunks.push(chunk));
			request.on("end", async () => {
				revalidationRequestCount += 1;
				let body;
				try {
					body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
				} catch {
					body = undefined;
				}
				try {
					const result = await options.handleRevalidateRequest({
						secret: request.headers["x-ams-revalidate-secret"],
						body,
					});
					send(result.status, JSON.stringify(result.body), {
						"content-type": "application/json; charset=utf-8",
					});
				} catch {
					send(500, JSON.stringify({ error: "fixture_failure" }), {
						"content-type": "application/json; charset=utf-8",
					});
				}
			});
			return;
		}
		send(404, "not-found");
	});

	return new Promise((resolve) => {
		server.listen(0, "127.0.0.1", () => {
			const address = server.address();
			const port = typeof address === "object" && address ? address.port : 0;
			resolve({
				server,
				origin: `http://127.0.0.1:${port}`,
				port,
				webhookKeys,
				getLastWebhookBody: () => lastWebhookBody,
				getRevalidationRequestCount: () => revalidationRequestCount,
				close: () =>
					new Promise((done, fail) =>
						server.close((error) => (error ? fail(error) : done())),
					),
			});
		});
	});
}
