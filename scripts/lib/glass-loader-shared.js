'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

/** Marker string searched in glass bundle (also used in comment form). */
const LOADER_MARKER = 'cursor-agent-zh-phase1a-loader';
const LOADER_MARKER_COMMENT = `/* ${LOADER_MARKER} */`;

/** Phase 1A recorded pristine SHA256 of workbench.glass.main.js (pre-inject). */
const PRISTINE_GLASS_SHA256 =
  'F43F8393D53FEBD5DB82DA6EECDE39BF4D1878DC5D811D557EFA91279B39B4BC';

const BACKUP_SUFFIX = '.cursor-agent-zh-backup';
const SIDECAR_NAME = 'cursor-agent-zh-bootstrap.js';
const GLASS_REL = path.join('out', 'vs', 'workbench', 'workbench.glass.main.js');
const PRODUCT_REL = 'product.json';
const RUNTIME_GUARD = '__cursorAgentZhLoader';

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex').toUpperCase();
}

function fileContainsMarker(filePath) {
  // Stream scan — glass is ~45MB; avoid depending on full-string edge cases only.
  const needle = Buffer.from(LOADER_MARKER, 'utf8');
  const fd = fs.openSync(filePath, 'r');
  try {
    const chunkSize = 1024 * 1024;
    const buf = Buffer.alloc(chunkSize);
    let carry = Buffer.alloc(0);
    for (;;) {
      const n = fs.readSync(fd, buf, 0, chunkSize, null);
      if (n === 0) break;
      const chunk = Buffer.concat([carry, buf.subarray(0, n)]);
      if (chunk.indexOf(needle) !== -1) return true;
      const keep = Math.min(needle.length - 1, chunk.length);
      carry = chunk.subarray(chunk.length - keep);
    }
    return false;
  } finally {
    fs.closeSync(fd);
  }
}

function countMarkerOccurrences(filePath) {
  const data = fs.readFileSync(filePath);
  const needle = Buffer.from(LOADER_MARKER, 'utf8');
  let count = 0;
  let idx = 0;
  while ((idx = data.indexOf(needle, idx)) !== -1) {
    count += 1;
    idx += needle.length;
  }
  return count;
}

function buildLoaderSource() {
  // Minimal EOF loader: Glass-only, safe-fail, runtime idempotent guard.
  return `

;${LOADER_MARKER_COMMENT}
(() => {
  try {
    if (globalThis.${RUNTIME_GUARD}) return;
    globalThis.${RUNTIME_GUARD} = 1;
    const log = (...a) => console.log('[cursor-agent-zh]', ...a);
    const err = (...a) => console.error('[cursor-agent-zh]', ...a);
    const SIDECAR = ${JSON.stringify(SIDECAR_NAME)};
    function pickBase() {
      try {
        const nodes = document.querySelectorAll('script[src]');
        for (let i = 0; i < nodes.length; i++) {
          const src = nodes[i].src || '';
          if (src.includes('workbench.glass.main.js')) {
            return src.substring(0, src.lastIndexOf('/') + 1);
          }
        }
      } catch (_) {}
      try {
        const href = String(location.href || '');
        const markerPath = '/out/vs/';
        const idx = href.indexOf(markerPath);
        if (idx >= 0) {
          return href.substring(0, idx + markerPath.length) + 'workbench/';
        }
      } catch (_) {}
      return null;
    }
    function inject() {
      const base = pickBase();
      if (!base) {
        err('could not resolve sidecar base URL');
        return;
      }
      const url = base + SIDECAR;
      const s = document.createElement('script');
      s.src = url;
      s.async = false;
      s.onload = () => log('sidecar script loaded', url);
      s.onerror = () => err('sidecar script failed', url);
      (document.head || document.documentElement).appendChild(s);
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', inject, { once: true });
    } else {
      inject();
    }
  } catch (e) {
    console.error('[cursor-agent-zh] loader error', e);
  }
})();
`;
}

function resolveRepoRoot(explicit) {
  if (explicit) return path.resolve(explicit);
  // scripts/lib -> scripts -> repo root
  return path.resolve(__dirname, '..', '..');
}

function resolveAppRoot(explicit) {
  if (explicit) return path.resolve(explicit);
  if (process.env.CURSOR_APP) return path.resolve(process.env.CURSOR_APP);
  if (process.env.CURSOR_RESOURCES_APP) {
    return path.resolve(process.env.CURSOR_RESOURCES_APP);
  }

  // Try `cursor` on PATH → …/resources/app/bin/cursor.cmd|.exe → app root
  try {
    const whichCmd = process.platform === 'win32' ? 'where' : 'which';
    const out = execFileSync(whichCmd, ['cursor'], {
      encoding: 'utf8',
      windowsHide: true,
    })
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)[0];
    if (out) {
      // …/resources/app/bin/cursor.cmd → app = ../..
      const binDir = path.dirname(out);
      const app = path.resolve(binDir, '..');
      if (fs.existsSync(path.join(app, 'product.json'))) return app;
    }
  } catch (_) {}

  const home = process.env.USERPROFILE || process.env.HOME || '';
  const candidates = [
    path.join(home, 'AppData', 'Local', 'Programs', 'cursor', 'resources', 'app'),
    path.join(home, 'AppData', 'Local', 'Programs', 'Cursor', 'resources', 'app'),
    '/Applications/Cursor.app/Contents/Resources/app',
  ];
  for (const c of candidates) {
    if (c && fs.existsSync(path.join(c, 'product.json'))) return c;
  }
  throw new Error(
    'Cannot locate Cursor resources/app. Set CURSOR_APP to that directory, or pass --app <path>.',
  );
}

function pathsForApp(appRoot) {
  const glass = path.join(appRoot, GLASS_REL);
  return {
    appRoot,
    product: path.join(appRoot, PRODUCT_REL),
    glass,
    backup: glass + BACKUP_SUFFIX,
    sidecar: path.join(appRoot, 'out', 'vs', 'workbench', SIDECAR_NAME),
    desktop: path.join(appRoot, 'out', 'vs', 'workbench', 'workbench.desktop.main.js'),
  };
}

function assertGlassNotChecksummed(productPath) {
  const raw = fs.readFileSync(productPath, 'utf8');
  const product = JSON.parse(raw);
  const checksums = product.checksums || {};
  const keys = Object.keys(checksums);
  const glassKeys = keys.filter(
    (k) => /glass/i.test(k) || /workbench\.glass/i.test(k),
  );
  if (glassKeys.length > 0) {
    const err = new Error(
      `STOP: workbench.glass appears in product.json checksums (${glassKeys.join(
        ', ',
      )}). Refusing to modify any files. Do not sync checksums.`,
    );
    err.code = 'CHECKSUM_PROTECTED';
    err.glassKeys = glassKeys;
    throw err;
  }
  return { keys, glassKeys };
}

function verifyExistingBackupOrThrow(backupPath) {
  if (!fs.existsSync(backupPath)) return { action: 'missing' };
  if (fileContainsMarker(backupPath)) {
    throw new Error(
      `STOP: existing backup contains loader marker. Refusing to overwrite or continue: ${backupPath}`,
    );
  }
  const sha = sha256File(backupPath);
  if (sha !== PRISTINE_GLASS_SHA256) {
    throw new Error(
      `STOP: existing backup SHA256 ${sha} != recorded pristine ${PRISTINE_GLASS_SHA256}. Refusing to overwrite backup.`,
    );
  }
  return { action: 'reuse', sha };
}

function deploySidecar(repoRoot, sidecarPath) {
  const src = path.join(repoRoot, 'runtime', 'bootstrap.js');
  if (!fs.existsSync(src)) {
    throw new Error(`Source of truth missing: ${src}`);
  }
  fs.copyFileSync(src, sidecarPath);
  return { src, sidecarPath, sha256: sha256File(sidecarPath) };
}

function parseArgs(argv) {
  const out = { app: null, repo: null, _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--app') out.app = argv[++i];
    else if (a === '--repo') out.repo = argv[++i];
    else out._.push(a);
  }
  return out;
}

module.exports = {
  LOADER_MARKER,
  LOADER_MARKER_COMMENT,
  PRISTINE_GLASS_SHA256,
  BACKUP_SUFFIX,
  SIDECAR_NAME,
  RUNTIME_GUARD,
  sha256File,
  fileContainsMarker,
  countMarkerOccurrences,
  buildLoaderSource,
  resolveRepoRoot,
  resolveAppRoot,
  pathsForApp,
  assertGlassNotChecksummed,
  verifyExistingBackupOrThrow,
  deploySidecar,
  parseArgs,
};
