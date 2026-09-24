#!/usr/bin/env node
'use strict';

/**
 * Phase 1B.1 — idempotent Glass loader deploy.
 * Source of truth: runtime/bootstrap.js → install sidecar only.
 * Does not translate UI. Does not touch desktop / product.json checksums.
 */

const fs = require('fs');
const path = require('path');
const shared = require('./lib/glass-loader-shared');

function main() {
  const args = shared.parseArgs(process.argv.slice(2));
  const repoRoot = shared.resolveRepoRoot(args.repo);
  const appRoot = shared.resolveAppRoot(args.app);
  const p = shared.pathsForApp(appRoot);

  console.log(`[deploy] repo=${repoRoot}`);
  console.log(`[deploy] app=${appRoot}`);

  for (const req of [p.product, p.glass]) {
    if (!fs.existsSync(req)) {
      throw new Error(`Missing required file: ${req}`);
    }
  }

  const checksum = shared.assertGlassNotChecksummed(p.product);
  console.log(
    `[deploy] checksum keys=${checksum.keys.length}; glass keys=0 (ok)`,
  );

  const productShaBefore = shared.sha256File(p.product);
  const desktopShaBefore = fs.existsSync(p.desktop)
    ? shared.sha256File(p.desktop)
    : null;

  // Always refresh sidecar from SoT (deploy product).
  const side = shared.deploySidecar(repoRoot, p.sidecar);
  console.log(`[deploy] sidecar refreshed from ${side.src}`);
  console.log(`[deploy] sidecar sha256=${side.sha256}`);

  const hasMarker = shared.fileContainsMarker(p.glass);
  if (hasMarker) {
    const n = shared.countMarkerOccurrences(p.glass);
    console.log(`loader already installed (marker count=${n})`);
    console.log('sidecar refreshed from source of truth');
    if (n !== 1) {
      console.warn(
        `[deploy] WARN: expected marker count 1, found ${n}. Not appending; inspect manually.`,
      );
    }
  } else {
    const backupCheck = shared.verifyExistingBackupOrThrow(p.backup);
    if (backupCheck.action === 'missing') {
      console.log(`[deploy] creating pristine backup → ${p.backup}`);
      fs.copyFileSync(p.glass, p.backup);
      const sha = shared.sha256File(p.backup);
      if (shared.fileContainsMarker(p.backup)) {
        throw new Error('STOP: freshly copied backup unexpectedly contains marker');
      }
      // First-time backup on a never-injected tree may not match Phase 1A SHA
      // (different Cursor build). For this project's pinned 3.21.18 PoC we
      // require match when a backup already existed; for brand-new backup we
      // record SHA and continue only if it equals pristine OR user opts in.
      // Hard rule for this repo phase: new backup must equal recorded pristine
      // for the known 3.21.18 install under test.
      if (sha !== shared.PRISTINE_GLASS_SHA256) {
        fs.unlinkSync(p.backup);
        throw new Error(
          `STOP: new backup SHA ${sha} != recorded pristine ${shared.PRISTINE_GLASS_SHA256}. ` +
            `Refusing to treat this glass as the Phase 1A baseline. Backup not kept.`,
        );
      }
      console.log(`[deploy] backup ok sha256=${sha}`);
    } else {
      console.log(
        `[deploy] reusing existing verified backup sha256=${backupCheck.sha}`,
      );
    }

    const loader = shared.buildLoaderSource().replace(/\r?\n/g, '\n');
    fs.appendFileSync(p.glass, loader, { encoding: 'utf8' });
    const after = shared.countMarkerOccurrences(p.glass);
    if (after !== 1) {
      throw new Error(
        `STOP: after append marker count=${after}, expected 1. Manual inspect required.`,
      );
    }
    console.log('loader installed');
    console.log('sidecar deployed');
    console.log(`[deploy] glass sha256=${shared.sha256File(p.glass)}`);
  }

  const productShaAfter = shared.sha256File(p.product);
  if (productShaAfter !== productShaBefore) {
    throw new Error('STOP: product.json changed unexpectedly during deploy');
  }
  if (desktopShaBefore && shared.sha256File(p.desktop) !== desktopShaBefore) {
    throw new Error('STOP: desktop bundle changed unexpectedly during deploy');
  }
  console.log('[deploy] product.json unchanged');
  if (desktopShaBefore) console.log('[deploy] desktop bundle unchanged');
}

try {
  main();
} catch (e) {
  console.error(`[deploy] FAILED: ${e.message}`);
  process.exit(e.code === 'CHECKSUM_PROTECTED' ? 3 : 1);
}
