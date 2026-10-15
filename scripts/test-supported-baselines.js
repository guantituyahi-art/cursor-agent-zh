#!/usr/bin/env node
'use strict';

/**
 * Supported Cursor bundle baseline registry (no third-party deps).
 *
 * Deploy and restore refuse any version:commit that is not registered in
 * SUPPORTED_BASELINES, so every entry must be an explicitly recorded pristine
 * identity. This test guards the recorded SHA/bytes against accidental edits.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const shared = require(path.join(__dirname, 'lib', 'glass-loader-shared.js'));
const BASELINES = shared.SUPPORTED_BASELINES;

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log('PASS ' + name);
}

test('3.22.7 baseline keeps its recorded pristine identity', () => {
  const b = BASELINES['3.22.7:37076c6c3f9e253c0fa2305197e45befd13a2260'];
  assert.ok(b, '3.22.7 baseline missing');
  assert.strictEqual(b.version, '3.22.7');
  assert.strictEqual(b.commit, '37076c6c3f9e253c0fa2305197e45befd13a2260');
  assert.strictEqual(
    b.sha256,
    '721501D167E1EA82E51F33346C924448A34360E857B1E6D3972DC677589AA5A0',
  );
  assert.strictEqual(b.bytes, 45389668);
});

test('3.24.18 baseline is registered with its pristine identity', () => {
  const b = BASELINES['3.24.18:be4c9e5350d77747b42cd467cbd3370a753d4640'];
  assert.ok(b, '3.24.18 baseline missing');
  assert.strictEqual(b.version, '3.24.18');
  assert.strictEqual(b.commit, 'be4c9e5350d77747b42cd467cbd3370a753d4640');
  assert.strictEqual(
    b.sha256,
    '8660A1449025C353BCB9E076D609A427955EB0A94B2D84646D2F758C6947813B',
  );
  assert.strictEqual(b.bytes, 47393036);
});

test('every baseline is keyed by version:commit and carries a full identity', () => {
  const keys = Object.keys(BASELINES);
  assert.ok(keys.length >= 2, 'expected at least two approved baselines');
  for (const key of keys) {
    const b = BASELINES[key];
    assert.strictEqual(key, b.version + ':' + b.commit, 'key format drift: ' + key);
    assert.ok(/^[0-9a-f]{40}$/.test(b.commit), 'commit must be 40-char hex: ' + b.commit);
    assert.ok(/^[0-9A-F]{64}$/.test(b.sha256), 'sha256 must be 64-char uppercase hex');
    assert.ok(Number.isInteger(b.bytes) && b.bytes > 0, 'bytes must be a positive integer');
  }
});

test('readSupportedIdentity resolves registered identities and rejects others', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-agent-zh-baseline-test-'));
  try {
    const app = path.join(root, 'install', 'resources', 'app');
    const p = shared.pathsForApp(app);
    fs.mkdirSync(path.dirname(p.product), { recursive: true });

    fs.writeFileSync(p.product, JSON.stringify({
      version: '3.24.18',
      commit: 'be4c9e5350d77747b42cd467cbd3370a753d4640',
    }));
    fs.writeFileSync(p.packageJson, JSON.stringify({ version: '3.24.18' }));
    const resolved = shared.readSupportedIdentity(p);
    assert.strictEqual(resolved.version, '3.24.18');
    assert.strictEqual(resolved.bytes, 47393036);

    fs.writeFileSync(p.product, JSON.stringify({ version: '9.9.9', commit: 'unknown' }));
    fs.writeFileSync(p.packageJson, JSON.stringify({ version: '9.9.9' }));
    assert.throws(() => shared.readSupportedIdentity(p), /unsupported Cursor/);

    fs.writeFileSync(p.product, JSON.stringify({
      version: '3.24.18',
      commit: 'be4c9e5350d77747b42cd467cbd3370a753d4640',
    }));
    fs.writeFileSync(p.packageJson, JSON.stringify({ version: '3.24.19' }));
    assert.throws(() => shared.readSupportedIdentity(p), /versions differ/);
  } finally {
    const resolvedRoot = path.resolve(root);
    const rel = path.relative(path.resolve(os.tmpdir()), resolvedRoot);
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel) ||
        !path.basename(resolvedRoot).startsWith('cursor-agent-zh-baseline-test-')) {
      throw new Error('refusing to remove an unexpected test directory');
    }
    fs.rmSync(resolvedRoot, { recursive: true, force: true });
  }
});

console.log('OK ' + passed + ' supported-baselines tests');
