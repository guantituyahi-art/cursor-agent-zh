#!/usr/bin/env node
'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const shared = require('./lib/glass-loader-shared');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-agent-zh-backup-test-'));
const app = path.join(root, 'install', 'resources', 'app');
const external = path.join(root, 'local-appdata');
const glass = path.join(app, 'out', 'vs', 'workbench', 'workbench.glass.main.js');
const pristine = '/* fixture Glass */\nconst value = 1;\n';
const sha = crypto.createHash('sha256').update(pristine).digest('hex').toUpperCase();
const identity = { version: '3.22.7', commit: 'fixture-commit', sha256: sha, bytes: Buffer.byteLength(pristine) };
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('PASS ' + name); }

try {
  fs.mkdirSync(path.dirname(glass), { recursive: true });
  fs.writeFileSync(glass, pristine, 'utf8');
  const paths = shared.backupPathsForIdentity(identity, app, external);

  test('external path includes version and commit and stays outside install', () => {
    assert.strictEqual(paths.backup, path.join(external, 'cursor-agent-zh', 'backups',
      identity.version, identity.commit, 'workbench.glass.main.js'));
    assert.throws(() => shared.backupPathsForIdentity(identity, app, app), /outside/);
  });

  test('creates verified pristine backup and manifest', () => {
    assert.deepStrictEqual(shared.verifyVersionedBackupOrThrow(paths, identity), { action: 'missing' });
    const result = shared.createVersionedBackupOrThrow(glass, paths, identity);
    assert.strictEqual(result.action, 'reuse');
    assert.strictEqual(result.sha, sha);
    assert.strictEqual(fs.readFileSync(paths.backup, 'utf8'), pristine);
    const manifest = JSON.parse(fs.readFileSync(paths.manifest, 'utf8'));
    assert.strictEqual(manifest.version, identity.version);
    assert.strictEqual(manifest.commit, identity.commit);
    assert.strictEqual(manifest.originalSha256, sha);
    assert.strictEqual(manifest.bytes, identity.bytes);
    assert.ok(manifest.createdAt);
  });

  test('reuses existing backup without overwriting', () => {
    const before = fs.readFileSync(paths.manifest, 'utf8');
    shared.createVersionedBackupOrThrow(glass, paths, identity);
    assert.strictEqual(fs.readFileSync(paths.manifest, 'utf8'), before);
  });

  test('manifest from another commit is rejected', () => {
    const original = fs.readFileSync(paths.manifest, 'utf8');
    const manifest = JSON.parse(original);
    manifest.commit = 'different-commit';
    fs.writeFileSync(paths.manifest, JSON.stringify(manifest), 'utf8');
    assert.throws(() => shared.verifyVersionedBackupOrThrow(paths, identity), /manifest/);
    fs.writeFileSync(paths.manifest, original, 'utf8');
  });

  test('corrupt backup and incomplete manifest both fail closed', () => {
    fs.writeFileSync(paths.backup, 'corrupt', 'utf8');
    assert.throws(() => shared.verifyVersionedBackupOrThrow(paths, identity), /SHA256/);
    fs.writeFileSync(paths.backup, pristine, 'utf8');
    fs.unlinkSync(paths.manifest);
    assert.throws(() => shared.verifyVersionedBackupOrThrow(paths, identity), /incomplete/);
  });

  test('never treats a marked bundle as pristine', () => {
    const marked = pristine + shared.LOADER_MARKER;
    const other = { version: '3.22.7', commit: 'marked-fixture',
      sha256: crypto.createHash('sha256').update(marked).digest('hex').toUpperCase(),
      bytes: Buffer.byteLength(marked) };
    const otherPaths = shared.backupPathsForIdentity(other, app, external);
    fs.writeFileSync(glass, marked, 'utf8');
    assert.throws(() => shared.createVersionedBackupOrThrow(glass, otherPaths, other), /not the recorded pristine/);
    assert.strictEqual(fs.existsSync(otherPaths.backup), false);
  });

  test('unsupported Cursor identity is rejected', () => {
    const p = shared.pathsForApp(app);
    fs.writeFileSync(p.product, JSON.stringify({ version: '3.22.8', commit: 'unknown', checksums: {} }));
    fs.writeFileSync(p.packageJson, JSON.stringify({ version: '3.22.8' }));
    assert.throws(() => shared.readSupportedIdentity(p), /unsupported Cursor/);
  });

  test('deploy rejects an unknown Glass before writing sidecar or backup', () => {
    const p = shared.pathsForApp(app);
    const known = shared.SUPPORTED_BASELINES[
      '3.22.7:37076c6c3f9e253c0fa2305197e45befd13a2260'];
    fs.writeFileSync(p.product, JSON.stringify({
      version: known.version, commit: known.commit, checksums: {},
    }));
    fs.writeFileSync(p.packageJson, JSON.stringify({ version: known.version }));
    fs.writeFileSync(glass, pristine, 'utf8');
    const result = spawnSync(process.execPath, [
      path.join(__dirname, 'deploy-glass-loader.js'), '--app', app,
      '--repo', path.join(__dirname, '..'),
    ], { encoding: 'utf8' });
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Glass SHA\/size differs/);
    assert.strictEqual(fs.existsSync(p.sidecar), false);
    assert.strictEqual(fs.readFileSync(glass, 'utf8'), pristine);
  });

  test('deploy, repeat deploy, and restore work with an isolated fixture', () => {
    const fixtureApp = path.join(root, 'integration', 'app');
    const fixtureGlass = path.join(fixtureApp, 'out', 'vs', 'workbench', 'workbench.glass.main.js');
    const fixtureLocal = path.join(root, 'integration-local');
    const fixtureText = 'var fixture = 1;\n//# sourceMappingURL=fixture.map';
    const fixtureSha = crypto.createHash('sha256').update(fixtureText).digest('hex').toUpperCase();
    const fixtureId = { version: '3.22.7-fixture', commit: 'fixture-integration',
      sha256: fixtureSha, bytes: Buffer.byteLength(fixtureText) };
    fs.mkdirSync(path.dirname(fixtureGlass), { recursive: true });
    fs.writeFileSync(fixtureGlass, fixtureText, 'utf8');
    const fixturePaths = shared.pathsForApp(fixtureApp);
    fs.writeFileSync(fixturePaths.product, JSON.stringify({
      version: fixtureId.version, commit: fixtureId.commit, checksums: {},
    }), 'utf8');
    fs.writeFileSync(fixturePaths.packageJson, JSON.stringify({ version: fixtureId.version }), 'utf8');
    const productBefore = fs.readFileSync(fixturePaths.product, 'utf8');
    const repoRoot = path.join(__dirname, '..');
    function runFixtureCli(file) {
      const scriptPath = path.join(__dirname, file);
      // Override only the fixture identity and process check in this child process.
      // Production CLI code and the real Cursor installation remain untouched.
      const wrapper = 'const s=require(' + JSON.stringify(require.resolve('./lib/glass-loader-shared')) + ');' +
        's.readSupportedIdentity=()=>(' + JSON.stringify(fixtureId) + ');' +
        's.cursorProcessesRunning=()=>false;' +
        'process.argv=[' + JSON.stringify(process.execPath) + ',' + JSON.stringify(scriptPath) +
        ',"--app",' + JSON.stringify(fixtureApp) + ',"--repo",' + JSON.stringify(repoRoot) + '];' +
        'require(' + JSON.stringify(scriptPath) + ');';
      const result = spawnSync(process.execPath, ['-e', wrapper], {
        encoding: 'utf8', env: Object.assign({}, process.env, { LOCALAPPDATA: fixtureLocal }),
      });
      assert.strictEqual(result.status, 0, result.stderr || result.stdout);
    }
    runFixtureCli('deploy-glass-loader.js');
    const backup = shared.backupPathsForIdentity(fixtureId, fixtureApp, fixtureLocal);
    assert.strictEqual(shared.verifyVersionedBackupOrThrow(backup, fixtureId).action, 'reuse');
    assert.strictEqual(shared.countMarkerOccurrences(fixtureGlass), 1);
    assert.strictEqual(fs.existsSync(fixturePaths.sidecar), true);
    const installedSha = shared.sha256File(fixtureGlass);
    const manifestBefore = fs.readFileSync(backup.manifest, 'utf8');
    runFixtureCli('deploy-glass-loader.js');
    assert.strictEqual(shared.sha256File(fixtureGlass), installedSha);
    assert.strictEqual(fs.readFileSync(backup.manifest, 'utf8'), manifestBefore);
    runFixtureCli('restore-glass-loader.js');
    assert.strictEqual(shared.sha256File(fixtureGlass), fixtureSha);
    assert.strictEqual(fs.existsSync(fixturePaths.sidecar), false);
    assert.strictEqual(fs.readFileSync(fixturePaths.product, 'utf8'), productBefore);
    assert.strictEqual(shared.verifyVersionedBackupOrThrow(backup, fixtureId).action, 'reuse');
  });

  console.log('OK ' + passed + ' versioned-backup tests');
} finally {
  const resolvedRoot = path.resolve(root);
  const resolvedTemp = path.resolve(os.tmpdir());
  const rel = path.relative(resolvedTemp, resolvedRoot);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel) ||
      !path.basename(resolvedRoot).startsWith('cursor-agent-zh-backup-test-')) {
    throw new Error('refusing to remove an unexpected test directory');
  }
  fs.rmSync(resolvedRoot, { recursive: true, force: true });
}
