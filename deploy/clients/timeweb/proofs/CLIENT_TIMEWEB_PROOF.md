# Client Timeweb proof

| Proof | Starter blueprint status | Required client-staging evidence |
|---|---|---|
| Blueprint static contract | PROVEN | `pnpm verify:client-readiness --mode=fixture-client` |
| TLS/restore tooling contract | PROVEN LOCALLY | `pnpm verify:db-restore-drill`; real Timeweb remains NOT RUN |
| Real Managed PostgreSQL connection | NOT PROVEN | TLS connection and exact non-secret resource identity |
| Clean Payload migrations | NOT PROVEN | migration log from the immutable application artifact |
| Real Payload Admin S3 upload | NOT PROVEN | upload/read/delete plus expected access behavior |
| No client `MEDIA_DIR` dependency | PROVEN LOCALLY | `pnpm verify:timeweb-blueprint`; `pnpm verify:clone-readiness` |
| Physical backup schedule | NOT PROVEN | provider schedule and retention evidence |
| Restore drill | NOT PROVEN | staging restore, integrity check and smoke result |
| Exactly one jobs owner | NOT PROVEN | rollout-state and jobs-health evidence |
| External monitoring and alerts | NOT PROVEN | uptime and critical-alert delivery evidence |
| Live smoke | NOT PROVEN | domain, routes, lead save/delivery and media checks |

Production approval is outside this file and requires the project release
procedure after every mandatory row is proven.
