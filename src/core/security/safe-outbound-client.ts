import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { Agent, type Dispatcher, fetch as undiciFetch } from "undici";

const defaultTimeoutMs = 10_000;
const defaultMaxBytes = 5 * 1024 * 1024;
const defaultMaxRedirects = 5;

type AddressRecord = {
	address: string;
	family: number;
};

type OutboundFetch = (
	input: string | URL,
	init: RequestInit & { dispatcher?: Dispatcher },
) => Promise<Response>;

type SafeOutboundOptions = {
	allowedHosts: readonly string[];
	approvedHttpHosts?: readonly string[];
	approvedExactOrigins?: readonly string[];
	timeoutMs?: number;
	maxBytes?: number;
	headers?: HeadersInit;
	method?: string;
	body?: BodyInit | null;
	signal?: AbortSignal;
	maxRedirects?: number;
	fetchImpl?: OutboundFetch;
	resolveAddresses?: (host: string) => Promise<AddressRecord[]>;
	createDispatcher?: (address: AddressRecord) => Dispatcher;
};

export type SafeOutboundStreamResult = {
	status: number;
	statusText: string;
	headers: Headers;
	body: ReadableStream<Uint8Array> | null;
	sha256: Promise<string | null>;
};

function isPrivateIPv4(address: string): boolean {
	const parts = address.split(".").map(Number);
	if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return false;
	const [a, b] = parts;
	return (
		a === 10 ||
		a === 127 ||
		(a === 172 && b >= 16 && b <= 31) ||
		(a === 192 && b === 168) ||
		(a === 169 && b === 254) ||
		a === 0
	);
}

function isPrivateIPv6(address: string): boolean {
	const normalized = address.toLowerCase();
	const mappedIpv4 = normalized.match(/:ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
	if (mappedIpv4) return isPrivateIPv4(mappedIpv4);
	return (
		normalized === "::1" ||
		normalized === "0:0:0:0:0:0:0:1" ||
		normalized.startsWith("fc") ||
		normalized.startsWith("fd") ||
		normalized.startsWith("fe80:")
	);
}

function isUnsafeHostLiteral(host: string): boolean {
	const normalized = host.toLowerCase();
	if (normalized === "localhost" || normalized.endsWith(".localhost")) return true;
	const version = isIP(host);
	if (version === 0) return false;
	return isUnsafeAddress(host);
}

function isUnsafeAddress(address: string): boolean {
	const version = isIP(address);
	if (version === 4) return isPrivateIPv4(address);
	if (version === 6) return isPrivateIPv6(address);
	return true;
}

async function assertSafeDestination(
	url: URL,
	options: SafeOutboundOptions,
): Promise<AddressRecord | undefined> {
	const host = url.hostname.toLowerCase();
	const allowedHosts = new Set(options.allowedHosts.map((item) => item.toLowerCase()));
	const approvedHttpHosts = new Set(
		(options.approvedHttpHosts ?? []).map((item) => item.toLowerCase()),
	);

	if (!allowedHosts.has(host)) throw new Error(`Outbound host is not allowlisted: ${host}`);
	if (url.protocol !== "https:" && !(url.protocol === "http:" && approvedHttpHosts.has(host))) {
		throw new Error(`Outbound protocol is not approved for ${host}`);
	}

	const approvedExactOrigins = new Set(
		(options.approvedExactOrigins ?? []).map((item) => item.toLowerCase()),
	);
	if (approvedExactOrigins.has(url.origin.toLowerCase())) {
		return undefined;
	}

	if (isUnsafeHostLiteral(host)) {
		throw new Error(`Outbound host resolves to a private or link-local address: ${host}`);
	}

	const resolver = options.resolveAddresses ?? ((name: string) => lookup(name, { all: true, verbatim: true }));
	const addresses = await resolver(host);
	if (addresses.length === 0) {
		throw new Error(`Outbound host did not resolve to an address: ${host}`);
	}
	if (addresses.some((item) => isUnsafeAddress(item.address))) {
		throw new Error(`Outbound host resolves to a private or link-local address: ${host}`);
	}
	return addresses[0];
}

function createPinnedDispatcher(address: AddressRecord): Dispatcher {
	return new Agent({
		connect: {
			autoSelectFamily: false,
			lookup(_hostname, _options, callback) {
				callback(null, address.address, address.family);
			},
		},
	});
}

const defaultOutboundFetch: OutboundFetch = async (input, init) =>
	(await undiciFetch(
		input,
		init as unknown as Parameters<typeof undiciFetch>[1],
	)) as unknown as Response;

function tapHashAndLimit(
	body: ReadableStream<Uint8Array>,
	maxBytes: number,
	onSettled: () => void,
): { stream: ReadableStream<Uint8Array>; sha256: Promise<string> } {
	const hash = createHash("sha256");
	let received = 0;
	let settle: (value: string) => void;
	let rejectHash: (error: unknown) => void;
	const sha256 = new Promise<string>((resolve, reject) => {
		settle = resolve;
		rejectHash = reject;
	});
	sha256.catch(() => undefined);

	const finish = (error?: unknown) => {
		onSettled();
		if (error) rejectHash(error);
	};

	const reader = body.getReader();
	const stream = new ReadableStream<Uint8Array>({
		async pull(controller) {
			try {
				const { done, value } = await reader.read();
				if (done) {
					finish();
					settle(hash.digest("hex"));
					controller.close();
					return;
				}
				received += value.byteLength;
				if (received > maxBytes) {
					await reader.cancel();
					const error = new Error("Outbound response exceeded max size.");
					finish(error);
					controller.error(error);
					return;
				}
				hash.update(value);
				controller.enqueue(value);
			} catch (error) {
				finish(error);
				controller.error(error);
			}
		},
		cancel(reason) {
			finish(reason ?? new Error("Outbound stream cancelled."));
			return reader.cancel(reason);
		},
	});

	return { stream, sha256 };
}

type OpenedOutboundRequest = {
	response: Response;
	release: () => void;
};

async function openSafeRequest(
	input: string | URL,
	options: SafeOutboundOptions,
	hops = 0,
): Promise<OpenedOutboundRequest> {
	const url = new URL(input);
	const resolvedAddress = await assertSafeDestination(url, options);
	const dispatcher = resolvedAddress
		? (options.createDispatcher ?? createPinnedDispatcher)(resolvedAddress)
		: undefined;

	const controller = new AbortController();
	const onExternalAbort = () => controller.abort();
	options.signal?.addEventListener("abort", onExternalAbort);
	const timeoutId = setTimeout(
		() => controller.abort(),
		options.timeoutMs ?? defaultTimeoutMs,
	);
	let released = false;
	const release = () => {
		if (released) return;
		released = true;
		clearTimeout(timeoutId);
		options.signal?.removeEventListener("abort", onExternalAbort);
		void dispatcher?.close().catch(() => undefined);
	};

	try {
		const fetchImpl = options.fetchImpl ?? defaultOutboundFetch;
		const response = await fetchImpl(url, {
			method: options.method ?? "GET",
			headers: options.headers,
			body: options.body,
			redirect: "manual",
			signal: controller.signal,
			dispatcher,
		});

		if (
			response.status >= 300 &&
			response.status < 400 &&
			response.headers.has("location")
		) {
			release();
			await response.body?.cancel().catch(() => undefined);
			if (hops >= (options.maxRedirects ?? defaultMaxRedirects)) {
				throw new Error("Outbound redirect limit exceeded.");
			}
			const nextUrl = new URL(response.headers.get("location") ?? "", url);
			return openSafeRequest(nextUrl, options, hops + 1);
		}

		return { response, release };
	} catch (error) {
		release();
		throw error;
	}
}

async function readBounded(response: Response, maxBytes: number): Promise<ArrayBuffer> {
	const reader = response.body?.getReader();
	if (!reader) return response.arrayBuffer();

	const chunks: Uint8Array[] = [];
	let received = 0;

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		if (!value) continue;
		received += value.byteLength;
		if (received > maxBytes) {
			await reader.cancel();
			throw new Error("Outbound response exceeded max size.");
		}
		chunks.push(value);
	}

	const body = new Uint8Array(received);
	let offset = 0;
	for (const chunk of chunks) {
		body.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return body.buffer;
}

export async function safeOutboundFetch(
	input: string | URL,
	options: SafeOutboundOptions,
): Promise<Response> {
	const opened = await openSafeRequest(input, options);
	try {
		const body = await readBounded(opened.response, options.maxBytes ?? defaultMaxBytes);
		return new Response(body, {
			status: opened.response.status,
			statusText: opened.response.statusText,
			headers: opened.response.headers,
		});
	} finally {
		opened.release();
	}
}

export async function safeOutboundFetchStream(
	input: string | URL,
	options: SafeOutboundOptions,
): Promise<SafeOutboundStreamResult> {
	const opened = await openSafeRequest(input, options);
	if (opened.response.status === 304 || !opened.response.body) {
		opened.release();
		return {
			status: opened.response.status,
			statusText: opened.response.statusText,
			headers: opened.response.headers,
			body: null,
			sha256: Promise.resolve(null),
		};
	}

	const tapped = tapHashAndLimit(
		opened.response.body,
		options.maxBytes ?? defaultMaxBytes,
		opened.release,
	);
	return {
		status: opened.response.status,
		statusText: opened.response.statusText,
		headers: opened.response.headers,
		body: tapped.stream,
		sha256: tapped.sha256,
	};
}

export function parseOutboundHostList(value?: string | null): string[] {
	return (value ?? "")
		.split(",")
		.map((item) => item.trim().toLowerCase())
		.filter(Boolean);
}

export function createSafeFeedOutboundFetch(options: Omit<SafeOutboundOptions, "headers" | "signal">) {
	return async (input: {
		url: URL;
		headers?: HeadersInit;
		signal?: AbortSignal;
	}): Promise<SafeOutboundStreamResult> =>
		safeOutboundFetchStream(input.url, {
			...options,
			headers: input.headers,
			signal: input.signal,
		});
}
