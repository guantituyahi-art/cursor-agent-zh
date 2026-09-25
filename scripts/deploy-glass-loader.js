#!/usr/bin/env node
'use strict';

/**
 * Deploy the Glass-only loader for an explicitly supported Cursor build.
 * All identity, checksum, bundle, and backup checks happen before install writes.
 */
const fs = require('fs');
const shared = require('./lib/glass-loader-shared');

function main() {
  const args = shared.parseArgs(process.argv.slice(2));
  const repoRoot = shared.resolveRepoRoot(args.repo);
  const appRoot = shared.resolveAppRoot(args.app);
  const p = shared.pathsForApp(appRoot);

  for (const req of [p.product, p.packageJson, p.glass]) {
    if (!fs.existsSync(req)) throw new Error('STOP: missing required file: ' + req);
  }
  shared.assertGlassNotChecksummed(p.product);
  const identity = shared.readSupportedIdentity(p);
  const backups = shared.backupPathsForIdentity(identity, appRoot);
  const productShaBefore = shared.sha256File(p.product);
  const desktopShaBefore = fs.existsSync(p.desktop) ? shared.sha256File(p.desktop) : null;
  const glassShaBefore = shared.sha256File(p.glass);
  const glassBytes = fs.statSync(p.glass).size;
  const markerCount = shared.countMarkerOccurrences(p.glass);
  const backupCheck = shared.verifyVersionedBackupOrThrow(backups, identity);

  let expectedPatched = null;
  let placement = null;
  if (markerCount > 0) {
    if (markerCount !== 1 || backupCheck.action !== 'reuse') {
      throw new Error('STOP: marked Glass requires exactly one loader and a verified external backup');
    }
    const pristine = fs.readFileSync(backups.backup, 'utf8');
    const composed = shared.composeGlassWithLoader(pristine);
    expectedPatched = composed.contents;
    placement = composed.placement;
    if (glassShaBefore !== shared.sha256Text(expectedPatched)) {
      throw new Error('STOP: installed Glass differs from the expected loader composition');
    }
  } else if (glassShaBefore !== identity.sha256 || glassBytes !== identity.bytes) {
    throw new Error('STOP: Glass SHA/size differs from the supported pristine baseline');
  }

  // Build sidecar in memory so a bad dictionary or runtime cannot leave install changes.
  const built = shared.buildSidecarSource(repoRoot);
  if (shared.cursorProcessesRunning()) {
    throw new Error('STOP: fully quit Cursor before deploying or clearing its code cache');
  }

  // The backup is external and versioned. Never derive it from a marked Glass bundle.
  if (backupCheck.action === 'missing') {
    shared.createVersionedBackupOrThrow(p.glass, backups, identity);
  }
  shared.verifyVersionedBackupOrThrow(backups, identity);

  if (expectedPatched === null) {
    const pristine = fs.readFileSync(backups.backup, 'utf8');
    const composed = shared.composeGlassWithLoader(pristine);
    expectedPatched = composed.contents;
    placement = composed.placement;
  }

  // Sidecar first: a Glass loader must never be installed without its runtime file.
  fs.writeFileSync(p.sidecar, built.source, 'utf8');
  if (markerCount === 0 || args.reinstallLoader) {
    fs.writeFileSync(p.glass, expectedPatched, 'utf8');
  }
  if (shared.sha256File(p.glass) !== shared.sha256Text(expectedPatched) ||
      shared.countMarkerOccurrences(p.glass) !== 1) {
    throw new Error('STOP: installed Glass failed loader verification');
  }

  if (args.clearCodeCache) {
    const cleared = shared.clearCursorJsCodeCache(p.product);
    console.log('[deploy] code cache removed=' + cleared.removed + ' commit=' + cleared.commit);
  }
  if (shared.sha256File(p.product) !== productShaBefore ||
      (desktopShaBefore && shared.sha256File(p.desktop) !== desktopShaBefore)) {
    throw new Error('STOP: protected Cursor files changed during deploy');
  }
  console.log('[deploy] Cursor ' + identity.version + '/' + identity.commit);
  console.log('[deploy] external backup=' + backups.backup);
  console.log('[deploy] placement=' + placement + '; loader marker=1');
  console.log('[deploy] sidecar sha256=' + shared.sha256File(p.sidecar));
  console.log('[deploy] Glass sha256=' + shared.sha256File(p.glass));
}

try {
  main();
} catch (e) {
  console.error('[deploy] FAILED: ' + e.message);
  process.exit(e.code === 'CHECKSUM_PROTECTED' ? 3 : 1);
}
