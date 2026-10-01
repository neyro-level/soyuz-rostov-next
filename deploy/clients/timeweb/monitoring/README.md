# Client monitoring contract

The client project must choose and configure providers for:

- external HTTPS uptime and certificate expiry;
- application readiness plus DB, feed and Payload jobs health;
- backup schedule/failure status and restore-drill freshness;
- lead-delivery pending/failed backlog;
- critical integration failures delivered to an approved alert channel.

Alert destinations, escalation windows and credentials belong to the client
operations canon and Secret Master. This static blueprint proves no live alert.
