import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/research/EPIC_23D_PAYLOAD_MEDIA_IMPORT_PROOF_2026-10-02.json';
assert.ok(existsSync(path), 'EPIC-23d Payload media import proof JSON is missing');
const proof = JSON.parse(readFileSync(path, 'utf8'));
assert.equal(proof.payload_media_import.status, 'PASS');
assert.equal(proof.payload_media_import.record, 'created-read-deleted');
assert.equal(proof.payload_media_import.production_db_refused, true);
assert.equal(proof.s3.status, 'PASS');
assert.equal(proof.cleanup.disposable_postgres_container_removed, true);
assert.equal(proof.cleanup.payload_record_deleted, true);
assert.equal(proof.safety.secrets_printed, false);
assert.equal(proof.safety.production_db_mutated, false);
assert.equal(proof.safety.dns_changed, false);
assert.equal(proof.safety.indexing_changed, false);
assert.equal(proof.safety.deploy_performed, false);
assert.equal(proof.safety.destructive_migration, false);
console.log('verify:epic23d-payload-media-import-proof passed');
