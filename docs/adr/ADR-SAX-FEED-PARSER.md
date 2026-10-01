# ADR: SAX streaming parser for YRL feeds

Status: Accepted  
Date: 2026-09-18

## Decision

Production YRL ingest uses [`saxes` 6.0.0](https://github.com/lddubeau/saxes) as the streaming XML parser.

## Why

- Streaming SAX events, not a DOM tree and not regex tag slicing.
- Stricter well-formedness than `sax`.
- Does not apply DTD-defined entities; only the five built-in XML entities are decoded.
- Fits Node 24 and the existing `verify:feed-parser` stream contract.

## Safety controls

The project wrapper, not the library defaults, enforces:

- reject `<!DOCTYPE>` / DTD as a critical structural anomaly;
- max element nesting;
- max attributes per element;
- max text/CDATA node size;
- max bytes per `<offer>`;
- AbortSignal cancellation;
- isolate malformed offers;
- `parserCompleted` only after a clean `end`;
- critical anomaly → run must be `suspicious`, not silent success.

## Consequences

Regex offer extraction is not a production parser path. `saxes` stays pinned; a major bump is a separate RISKY task.
