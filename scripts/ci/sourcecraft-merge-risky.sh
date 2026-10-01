#!/usr/bin/env bash
set -euo pipefail

case "${RISK_SCOPE:-}" in
  schema-data|auth-pii-leads|ingest-jobs)
    requires_database=true
    ;;
  dependency-runtime|ci-governance)
    requires_database=false
    ;;
  *)
    echo "Unsupported RISK_SCOPE: ${RISK_SCOPE:-<empty>}" >&2
    exit 2
    ;;
esac

if [[ ! "${EXPECTED_COMMIT_SHA:-}" =~ ^[0-9a-f]{40}$ ]]; then
  echo "EXPECTED_COMMIT_SHA must be a full SHA" >&2
  exit 2
fi

if [[ "${SOURCECRAFT_COMMIT_SHA:-}" != "$EXPECTED_COMMIT_SHA" ]]; then
  echo "Exact-head mismatch" >&2
  exit 2
fi

apt-get update
apt-get install -y --no-install-recommends ca-certificates curl git xz-utils
curl -fsSLO https://nodejs.org/dist/v24.21.0/node-v24.21.0-linux-x64.tar.xz
tar -xJf node-v24.21.0-linux-x64.tar.xz -C /usr/local --strip-components=1
corepack enable
corepack prepare pnpm@11.28.2 --activate
node scripts/ci/assert-exact-head.mjs

if [[ "$requires_database" == "true" ]]; then
  install -d -o postgres -g postgres /tmp/ams-pgdata
  su postgres -c "initdb -D /tmp/ams-pgdata --auth-local=trust --auth-host=trust"
  su postgres -c "pg_ctl -D /tmp/ams-pgdata -o '-c listen_addresses=127.0.0.1' -w start"
  su postgres -c "createdb -h 127.0.0.1 ams_realtbase_ci_test"
fi

pnpm install --frozen-lockfile
if [[ "$requires_database" == "true" ]]; then
  DATABASE_URI="$DATABASE_URI_TEST" AMS_SKIP_LOCAL_ENV=true pnpm payload:migrate
fi
AMS_SKIP_LOCAL_ENV=true pnpm verify:merge-risky

echo "SourceCraft targeted RISKY proof OK: scope=$RISK_SCOPE"
