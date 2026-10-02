import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const summaryCsv = 'docs/research/EPIC_23_MEDIA_INTAKE_PREP_2026-10-02.csv';
const proofJson = 'docs/research/EPIC_23_MEDIA_INTAKE_PREP_2026-10-02.json';
assert.ok(existsSync(summaryCsv), 'media intake summary CSV is missing');
assert.ok(existsSync(proofJson), 'media intake proof JSON is missing');
const proof = JSON.parse(readFileSync(proofJson, 'utf8'));
assert.equal(proof.development_count, 24, 'expected 24 priority developments');
assert.equal(proof.planned_media_slots, 120, 'expected 120 planned media slots');
assert.equal(proof.accepted_media_count, 0, 'prep step must not claim accepted binaries');
assert.match(proof.private_manifest_path, /\.private\/szh-task-23b-media-intake\/media-intake-manifest\.csv$/);
const csv = readFileSync(summaryCsv, 'utf8').trim().split(/\r?\n/);
assert.equal(csv.length, 25, 'summary CSV must have header + 24 rows');
for (const line of csv.slice(1)) {
  assert.ok(line.includes(',5,0,'), `row must record 5 planned and 0 accepted media: ${line}`);
  assert.ok(line.includes('unpublished_until_payload_s3_import'), `row must remain unpublished: ${line}`);
}
console.log('verify:epic23-media-intake-prep passed (24 developments, 120 planned slots, no Git binaries claimed)');
