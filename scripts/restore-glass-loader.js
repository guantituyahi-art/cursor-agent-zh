#!/usr/bin/env node
'use strict';

/**
 * Phase 1B.1 — restore Glass bundle from verified pristine backup; remove sidecar.
 * Does not touch product.json or desktop bundle.
 */

const fs = require('fs');
const shared = require('./lib/glass-loader-shared');

function main() {
  const args = shared.parseArgs(process.argv.slice(2));
  const appRoot = shared.resolveAppRoot(args.app);
  const p = shared.pathsForApp(appRoot);

  console.log(`[restore] app=${appRoot}`);

  if (!fs.existsSync(p.backup)) {
    throw new Error(`Missing backup: ${p.backup}`);
  }

  const check = shared.verifyExistingBackupOrThrow(p.backup);
  if (check.action !== 'reuse') {
    throw new Error('Backup verification failed');
  }
  console.log(`[restore] backup verified sha256=${check.sha}`);

  const productShaBefore = shared.sha256File(p.product);
  const desktopShaBefore = fs.existsSync(p.desktop)
    ? shared.sha256File(p.desktop)
    : null;

  fs.copyFileSync(p.backup, p.glass);
  const glassSha = shared.sha256File(p.glass);
  console.log(`[restore] glass restored sha256=${glassSha}`);

  if (glassSha !== shared.PRISTINE_GLASS_SHA256) {
    throw new Error(
      `STOP: restored glass SHA ${glassSha} != pristine ${shared.PRISTINE_GLASS_SHA256}`,
    );
  }
  if (shared.fileContainsMarker(p.glass)) {
    throw new Error('STOP: restored glass still contains loader marker');
  }

  if (fs.existsSync(p.sidecar)) {
    fs.unlinkSync(p.sidecar);
    console.log(`[restore] removed sidecar ${p.sidecar}`);
  } else {
    console.log('[restore] sidecar already absent');
  }

  if (shared.sha256File(p.product) !== productShaBefore) {
    throw new Error('STOP: product.json changed during restore');
  }
  if (desktopShaBefore && shared.sha256File(p.desktop) !== desktopShaBefore) {
    throw new Error('STOP: desktop bundle changed during restore');
  }

  console.log('[restore] product.json unchanged');
  if (desktopShaBefore) console.log('[restore] desktop bundle unchanged');
  console.log('[restore] done');
}

try {
  main();
} catch (e) {
  console.error(`[restore] FAILED: ${e.message}`);
  process.exit(1);
}
