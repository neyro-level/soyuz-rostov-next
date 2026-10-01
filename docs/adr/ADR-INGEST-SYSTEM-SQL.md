# ADR: Narrow SQL for atomic system transitions

Status: Accepted  
Date: 2026-09-19

## Decision

Application data continues to use Payload Local API. Raw runtime SQL is limited to the exact files and named operations enforced by `scripts/quality/sql-governance.mjs`:

- `src/core/data-access/ingest/sql/index.ts` — dispatcher claims, import-run claim/heartbeat/terminal transition, bounded feed-property set operations, and one-time deactivation approval consumption;
- `src/core/data-access/system/sql/index.ts` — atomic lead-delivery claim.

Each approved operation declares a named invariant and the concrete reason SQL remains necessary. Generic query or execute helpers are not exported. Migrations remain a separate allowed SQL boundary.

## Payload 3.89.0 investigation

The installed Payload bulk update accepts a `where` clause and returns a bulk result, but its runtime first reads matching documents and then performs per-document updates. It therefore does not prove one atomic conditional affected-result primitive for concurrent claims or terminal state transitions.

Consequently, replacing the current claim SQL with Local API would weaken the already proven atomicity. The narrow parameterized PostgreSQL statements remain until an installed Payload version provides a documented and verified single-statement conditional update result.

## Safety controls

- Claim and terminal updates include the expected current status in the same statement.
- Heartbeat updates only a `running` import.
- Dispatcher selection uses `FOR UPDATE SKIP LOCKED`.
- All dynamic values use Drizzle SQL parameters.
- The architecture guard rejects raw SQL outside the exact allowlist and contains an intentionally broken-path fixture.
- Integration proof uses an isolated PostgreSQL database and verifies one winner, visible heartbeat, and terminal non-restart.

## Consequences

This is a deliberately small persistence exception, not a second application data layer. Adding a runtime SQL file or operation requires updating this ADR, adding invariant/reason metadata, and extending the guard and integration proof.
