#!/usr/bin/env node
'use strict';

/**
 * Phase 1B.1 — idempotent Glass loader deploy.
 * Dual SoT → generated install sidecar:
 *   runtime/bootstrap.js + translations/zh-CN.json
 * Does not touch desktop / product.json checksums. Phase 1D.1 exact only.
 *
 * Flags:
 *   --reinstall-loader  Restore glass from pristine backup + write one safe loader
 *                       (never append a second loader onto an old injection).
 *   --clear-code-cache  Delete Cursor CachedData chrome/js for this product commit
 *                       (Cursor must not be running).
 */

const fs = require('fs');
const path = require('path');
const shared = require('./lib/glass-loader-shared');

function cursorProcessesRunning() {
  if (process.platform !== 'win32') {
    try {
      const { execFileSync } = require('child_process');
      const out = execFileSync('ps', ['-A', '-o', 'comm='], {
        encoding: 'utf8',
      });
      return /\b[Cc]ursor\b/.test(out);
    } catch (_) {
      return false;
    }
  }
  try {
    const { execFileSync } = require('child_process');
    const out = execFileSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-Command',
        "Get-CimInstance Win32_Process -Filter \"Name='Cursor.exe'\" | Select-Object -ExpandProperty ProcessId",
      ],
      { encoding: 'utf8', windowsHide: true },
    );
    return /[0-9]/.test(out);
  } catch (_) {
    return false;
  }
}

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

  // Always refresh sidecar from dual SoT (bootstrap + translations JSON).
  const side = shared.deploySidecar(repoRoot, p.sidecar);
  console.log(`[deploy] sidecar built from runtime=${side.src}`);
  console.log(`[deploy] translations=${side.translationsSrc}`);
  console.log(`[deploy] runtimePhase=${side.runtimePhase} exactKeys=${side.exactKeyCount}`);
  console.log(`[deploy] sidecar sha256=${side.sha256}`);

  const hasMarker = shared.fileContainsMarker(p.glass);

  if (args.reinstallLoader) {
    console.log('[deploy] --reinstall-loader: rebuild glass from backup + one loader');
    if (!fs.existsSync(p.backup)) {
      throw new Error(
        'STOP: --reinstall-loader requires an existing verified backup',
      );
    }
    const result = shared.reinstallLoaderFromBackup(p.glass, p.backup);
    console.log(`[deploy] placement=${result.placement}`);
    console.log(`[deploy] glass sha256=${result.glassSha256}`);
    console.log(`[deploy] backup sha256=${result.backupSha256} (unchanged)`);
    console.log(`loader installed`);
    console.log(`sidecar deployed`);
  } else if (hasMarker) {
    const n = shared.countMarkerOccurrences(p.glass);
    console.log(`loader already installed (marker count=${n})`);
    console.log('sidecar refreshed from source of truth');
    if (n !== 1) {
      console.warn(
        `[deploy] WARN: expected marker count 1, found ${n}. Not appending; use --reinstall-loader.`,
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

    const pristine = fs.readFileSync(p.backup, 'utf8');
    const { contents, placement } = shared.composeGlassWithLoader(pristine);
    fs.writeFileSync(p.glass, contents, { encoding: 'utf8' });
    const after = shared.countMarkerOccurrences(p.glass);
    if (after !== 1) {
      throw new Error(
        `STOP: after compose marker count=${after}, expected 1. Manual inspect required.`,
      );
    }
    console.log(`[deploy] placement=${placement}`);
    console.log('loader installed');
    console.log('sidecar deployed');
    console.log(`[deploy] glass sha256=${shared.sha256File(p.glass)}`);
  }

  if (args.clearCodeCache) {
    if (cursorProcessesRunning()) {
      throw new Error(
        'STOP: --clear-code-cache refused while Cursor.exe appears to be running. ' +
          'Fully quit Cursor, then re-run with --clear-code-cache.',
      );
    }
    const cleared = shared.clearCursorJsCodeCache(p.product);
    console.log(
      `[deploy] cleared CachedData chrome/js commit=${cleared.commit} removed=${cleared.removed} dir=${cleared.jsDir}`,
    );
  } else {
    console.log(
      '[deploy] NOTE: if Agents Window still shows __cursorAgentZhLoader === undefined, ' +
        'fully quit Cursor and re-run with --clear-code-cache (stale vscode-file V8 CachedData).',
    );
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
