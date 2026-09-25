#!/usr/bin/env node
'use strict';

/** Restore only the matching Cursor build from its verified external backup. */
const fs = require('fs');
const shared = require('./lib/glass-loader-shared');

function main() {
  const args = shared.parseArgs(process.argv.slice(2));
  const appRoot = shared.resolveAppRoot(args.app);
  const p = shared.pathsForApp(appRoot);
  for (const req of [p.product, p.packageJson, p.glass]) {
    if (!fs.existsSync(req)) throw new Error('STOP: missing required file: ' + req);
  }
  shared.assertGlassNotChecksummed(p.product);
  const identity = shared.readSupportedIdentity(p);
  const backups = shared.backupPathsForIdentity(identity, appRoot);
  const backupCheck = shared.verifyVersionedBackupOrThrow(backups, identity);
  if (backupCheck.action !== 'reuse') {
    throw new Error('STOP: matching external backup is missing');
  }

  const currentSha = shared.sha256File(p.glass);
  const markers = shared.countMarkerOccurrences(p.glass);
  const pristine = fs.readFileSync(backups.backup, 'utf8');
  const expectedPatchedSha = shared.sha256Text(shared.composeGlassWithLoader(pristine).contents);
  if (currentSha !== identity.sha256 &&
      !(markers === 1 && currentSha === expectedPatchedSha)) {
    throw new Error('STOP: current Glass is neither pristine nor our expected loader');
  }
  if (shared.cursorProcessesRunning()) {
    throw new Error('STOP: fully quit Cursor before restoring Glass');
  }

  const productShaBefore = shared.sha256File(p.product);
  const desktopShaBefore = fs.existsSync(p.desktop) ? shared.sha256File(p.desktop) : null;
  if (currentSha !== identity.sha256) {
    fs.copyFileSync(backups.backup, p.glass);
  }
  if (shared.sha256File(p.glass) !== identity.sha256 ||
      shared.fileContainsMarker(p.glass)) {
    throw new Error('STOP: restored Glass differs from recorded pristine');
  }
  if (fs.existsSync(p.sidecar)) fs.unlinkSync(p.sidecar);
  if (shared.sha256File(p.product) !== productShaBefore ||
      (desktopShaBefore && shared.sha256File(p.desktop) !== desktopShaBefore)) {
    throw new Error('STOP: protected Cursor files changed during restore');
  }
  console.log('[restore] Cursor ' + identity.version + '/' + identity.commit);
  console.log('[restore] verified backup=' + backups.backup);
  console.log('[restore] Glass restored sha256=' + identity.sha256 + '; sidecar absent');
}

try {
  main();
} catch (e) {
  console.error('[restore] FAILED: ' + e.message);
  process.exit(1);
}
