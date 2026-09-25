'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

/** Marker string searched in glass bundle (also used in comment form). */
const LOADER_MARKER = 'cursor-agent-zh-phase1a-loader';
const LOADER_MARKER_COMMENT = `/* ${LOADER_MARKER} */`;

/** Explicitly approved Cursor bundle baselines. Never infer pristine from a patched file. */
const SUPPORTED_BASELINES = Object.freeze({
  '3.22.7:37076c6c3f9e253c0fa2305197e45befd13a2260': Object.freeze({
    version: '3.22.7',
    commit: '37076c6c3f9e253c0fa2305197e45befd13a2260',
    sha256: '721501D167E1EA82E51F33346C924448A34360E857B1E6D3972DC677589AA5A0',
    bytes: 45389668,
  }),
});
const SIDECAR_NAME = 'cursor-agent-zh-bootstrap.js';
const GLASS_REL = path.join('out', 'vs', 'workbench', 'workbench.glass.main.js');
const PRODUCT_REL = 'product.json';
const RUNTIME_GUARD = '__cursorAgentZhLoader';

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex').toUpperCase();
}

function sha256Text(source) {
  return crypto.createHash('sha256').update(source, 'utf8').digest('hex').toUpperCase();
}

function cursorProcessesRunning() {
  if (process.platform !== 'win32') {
    const out = execFileSync('ps', ['-A', '-o', 'comm='], { encoding: 'utf8' });
    return /\b[Cc]ursor\b/.test(out);
  }
  const out = execFileSync('powershell.exe', [
    '-NoProfile',
    '-Command',
    "Get-CimInstance Win32_Process -Filter \"Name='Cursor.exe'\" | Select-Object -ExpandProperty ProcessId",
  ], { encoding: 'utf8', windowsHide: true });
  return /[0-9]/.test(out);
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
  // Minimal loader body (placed on its own lines; never glued onto a // comment).
  // Glass is loaded via native ESM import() in workbench.js — prefer
  // _VSCODE_FILE_ROOT + dynamic import for the sidecar (avoids script[src]
  // miss and Trusted Types friction on createElement('script')).
  return (
    '\n' +
    LOADER_MARKER_COMMENT +
    '\n' +
    `(() => {
  try {
    if (globalThis.${RUNTIME_GUARD}) return;
    globalThis.${RUNTIME_GUARD} = 1;
    const log = (...a) => console.log('[cursor-agent-zh]', ...a);
    const err = (...a) => console.error('[cursor-agent-zh]', ...a);
    const SIDECAR = ${JSON.stringify(SIDECAR_NAME)};
    function pickBase() {
      try {
        const root = globalThis._VSCODE_FILE_ROOT;
        if (root) {
          const base = String(root).replace(/\\/?$/, '/');
          return base + 'vs/workbench/';
        }
      } catch (_) {}
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
      // Dynamic import (valid in Chromium classic + module). Fallback to script tag.
      try {
        import(url).then(
          () => log('sidecar module loaded', url),
          (e) => {
            err('sidecar import failed', url, e);
            fallbackScript(url);
          },
        );
      } catch (e) {
        fallbackScript(url);
      }
    }
    function fallbackScript(url) {
      try {
        const s = document.createElement('script');
        s.src = url;
        s.async = false;
        s.onload = () => log('sidecar script loaded', url);
        s.onerror = () => err('sidecar script failed', url);
        (document.head || document.documentElement).appendChild(s);
      } catch (e) {
        err('sidecar script inject error', e);
      }
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', inject, { once: true });
    } else {
      inject();
    }
  } catch (e) {
    console.error('[cursor-agent-zh] loader error', e);
  }
})();\n`
  );
}

/**
 * Ensure loader text always begins on a fresh line (never continues a // comment).
 * @param {string} loader
 */
function ensureLoaderStartsOnOwnLine(loader) {
  let s = String(loader).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  s = s.replace(/^\n+/, '\n');
  if (!s.startsWith('\n')) s = '\n' + s;
  if (!s.endsWith('\n')) s += '\n';
  return s;
}

/**
 * Compose pristine glass contents + exactly one loader.
 * Prefer inserting BEFORE `//# sourceMappingURL` so tooling that treats
 * that pragma as EOF still leaves the loader in the executable region.
 * Never concatenates onto a line that begins with // .
 * @param {string|Buffer} pristine
 * @returns {{ contents: string, placement: string }}
 */
function composeGlassWithLoader(pristine) {
  const original = String(pristine).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (original.includes(LOADER_MARKER)) {
    throw new Error('composeGlassWithLoader: input already contains loader marker');
  }
  const loader = ensureLoaderStartsOnOwnLine(buildLoaderSource());
  const pragma = '//# sourceMappingURL=';
  const idx = original.lastIndexOf(pragma);
  let contents;
  let placement;
  if (idx >= 0) {
    // Insert on its own lines immediately before the sourcemap pragma.
    const before = original.slice(0, idx).replace(/\n*$/, '\n');
    const after = original.slice(idx);
    contents = before + loader + after;
    placement = 'before-sourceMappingURL';
  } else {
    const base = original.endsWith('\n') ? original : original + '\n';
    contents = base.replace(/\n*$/, '\n') + loader.replace(/^\n+/, '');
    placement = 'eof-append';
  }
  assertLoaderNotInLineComment(contents);
  return { contents, placement };
}

/**
 * Fail if marker line is still inside a // line comment (placement bug).
 * @param {string} contents
 */
function assertLoaderNotInLineComment(contents) {
  const lines = String(contents).split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes(LOADER_MARKER)) continue;
    const trimmed = line.trimStart();
    // Accept block comment form /* marker */ or code containing marker.
    // Reject: //....marker or //# sourceMappingURL=...marker
    if (trimmed.startsWith('//') && !trimmed.startsWith('//*')) {
      throw new Error(
        `loader marker sits on a // line comment at line ${i + 1}: ${line.slice(0, 120)}`,
      );
    }
    // Also reject same-line glue: //# sourceMappingURL=.../* marker */
    if (trimmed.includes('sourceMappingURL=') && trimmed.includes(LOADER_MARKER)) {
      throw new Error(
        `loader marker glued onto sourceMappingURL line at line ${i + 1}`,
      );
    }
  }
  const n = countMarkerInString(contents);
  if (n !== 1) {
    throw new Error(`expected exactly 1 loader marker after compose, found ${n}`);
  }
}

function countMarkerInString(s) {
  const needle = LOADER_MARKER;
  let count = 0;
  let idx = 0;
  while ((idx = s.indexOf(needle, idx)) !== -1) {
    count += 1;
    idx += needle.length;
  }
  return count;
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
    packageJson: path.join(appRoot, 'package.json'),
    glass,
    sidecar: path.join(appRoot, 'out', 'vs', 'workbench', SIDECAR_NAME),
    desktop: path.join(appRoot, 'out', 'vs', 'workbench', 'workbench.desktop.main.js'),
  };
}

function readSupportedIdentity(p) {
  const product = JSON.parse(fs.readFileSync(p.product, 'utf8'));
  const pkg = JSON.parse(fs.readFileSync(p.packageJson, 'utf8'));
  if (product.version !== pkg.version) {
    throw new Error('STOP: product.json and package.json versions differ');
  }
  const baseline = SUPPORTED_BASELINES[`${product.version}:${product.commit}`];
  if (!baseline) {
    throw new Error(`STOP: unsupported Cursor version/commit ${product.version}/${product.commit}`);
  }
  return baseline;
}

function backupPathsForIdentity(identity, appRoot, localAppData) {
  const base = localAppData || process.env.LOCALAPPDATA;
  if (!base) throw new Error('STOP: LOCALAPPDATA is required for external backups');
  const backupRoot = path.resolve(base, 'cursor-agent-zh', 'backups');
  const app = path.resolve(appRoot);
  const rel = path.relative(app, backupRoot);
  if (rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))) {
    throw new Error('STOP: backup root must be outside Cursor installation');
  }
  const dir = path.join(backupRoot, identity.version, identity.commit);
  return {
    dir,
    backup: path.join(dir, 'workbench.glass.main.js'),
    manifest: path.join(dir, 'manifest.json'),
  };
}

function verifyVersionedBackupOrThrow(paths, identity) {
  const hasBackup = fs.existsSync(paths.backup);
  const hasManifest = fs.existsSync(paths.manifest);
  if (!hasBackup && !hasManifest) return { action: 'missing' };
  if (!hasBackup || !hasManifest) {
    throw new Error('STOP: incomplete external backup; refusing to overwrite it');
  }
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(paths.manifest, 'utf8')); }
  catch (_) { throw new Error('STOP: invalid backup manifest'); }
  if (manifest.version !== identity.version || manifest.commit !== identity.commit ||
      manifest.originalSha256 !== identity.sha256 || manifest.bytes !== identity.bytes) {
    throw new Error('STOP: backup manifest does not match Cursor version/commit baseline');
  }
  const result = verifyExistingBackupOrThrow(paths.backup, identity.sha256);
  if (fs.statSync(paths.backup).size !== identity.bytes) {
    throw new Error('STOP: backup size differs from recorded pristine');
  }
  return result;
}

function createVersionedBackupOrThrow(glassPath, paths, identity) {
  const existing = verifyVersionedBackupOrThrow(paths, identity);
  if (existing.action === 'reuse') return existing;
  if (fileContainsMarker(glassPath) || sha256File(glassPath) !== identity.sha256 ||
      fs.statSync(glassPath).size !== identity.bytes) {
    throw new Error('STOP: current Glass is not the recorded pristine bundle');
  }
  fs.mkdirSync(paths.dir, { recursive: true });
  fs.copyFileSync(glassPath, paths.backup, fs.constants.COPYFILE_EXCL);
  verifyExistingBackupOrThrow(paths.backup, identity.sha256);
  fs.writeFileSync(paths.manifest, JSON.stringify({
    version: identity.version,
    commit: identity.commit,
    originalSha256: identity.sha256,
    bytes: identity.bytes,
    createdAt: new Date().toISOString(),
  }, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
  return verifyVersionedBackupOrThrow(paths, identity);
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

function verifyExistingBackupOrThrow(backupPath, expectedSha) {
  if (!expectedSha) throw new Error('STOP: expected backup SHA is required');
  if (!fs.existsSync(backupPath)) return { action: 'missing' };
  if (fileContainsMarker(backupPath)) {
    throw new Error(`STOP: existing backup contains loader marker: ${backupPath}`);
  }
  const sha = sha256File(backupPath);
  if (sha !== expectedSha) {
    throw new Error(`STOP: existing backup SHA256 ${sha} != recorded pristine ${expectedSha}`);
  }
  return { action: 'reuse', sha };
}

/** Phase 1D.1/1D.2a PoC exact keys only (deploy refuses others). */
const PHASE_1D1_EXACT_KEYS = [
  'New Chat',
  'New Project',
  'Automations',
];

/**
 * Load + validate translations/zh-CN.json (layered schema).
 * Repo JSON is the only dictionary Source of Truth.
 */
function loadTranslationsPack(repoRoot) {
  const jsonPath = path.join(repoRoot, 'translations', 'zh-CN.json');
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Translations SoT missing: ${jsonPath}`);
  }
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } catch (e) {
    throw new Error(`Invalid translations JSON: ${e.message}`);
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('translations/zh-CN.json must be an object with exact/contextual/dynamic');
  }
  if (!raw.exact || typeof raw.exact !== 'object' || Array.isArray(raw.exact)) {
    throw new Error('translations/zh-CN.json: "exact" must be an object map');
  }
  if (!Array.isArray(raw.contextual)) {
    throw new Error('translations/zh-CN.json: "contextual" must be an array');
  }
  if (!Array.isArray(raw.dynamic)) {
    throw new Error('translations/zh-CN.json: "dynamic" must be an array');
  }
  const allowed = new Set(PHASE_1D1_EXACT_KEYS);
  const exact = {};
  for (const key of Object.keys(raw.exact)) {
    if (!allowed.has(key)) {
      throw new Error(
        `Phase 1D.2b.1 forbids exact key not in PoC allowlist: ${JSON.stringify(key)}`,
      );
    }
    const val = raw.exact[key];
    if (typeof val !== 'string' || !val) {
      throw new Error(`exact[${JSON.stringify(key)}] must be a non-empty string`);
    }
    exact[key] = val;
  }
  for (const need of PHASE_1D1_EXACT_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(exact, need)) {
      throw new Error(`Phase 1D.2b.1 exact map missing required key: ${need}`);
    }
  }
  // Search must never be an exact key (contextual-only).
  if (Object.prototype.hasOwnProperty.call(exact, 'Search')) {
    throw new Error('Phase 1D.2b.1 forbids exact key "Search" (use contextual)');
  }
  const contextual = [];
  for (let i = 0; i < raw.contextual.length; i++) {
    const item = raw.contextual[i];
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(`contextual[${i}] must be an object with en/zh/when`);
    }
    if (typeof item.en !== 'string' || !item.en) {
      throw new Error(`contextual[${i}].en must be a non-empty string`);
    }
    if (typeof item.zh !== 'string' || !item.zh) {
      throw new Error(`contextual[${i}].zh must be a non-empty string`);
    }
    if (typeof item.when !== 'string' || !item.when) {
      throw new Error(`contextual[${i}].when must be a non-empty string`);
    }
    contextual.push({ en: item.en, zh: item.zh, when: item.when });
  }
  return {
    exact,
    contextual,
    dynamic: [],
    schema: 'layered-v1',
    runtimePhase: '1D.2b.1',
  };
}

/**
 * Build install sidecar: inject read-only translation pack, then runtime bootstrap.
 * No bundler; no second runtime fetch of JSON.
 */
function buildSidecarSource(repoRoot) {
  const bootstrapPath = path.join(repoRoot, 'runtime', 'bootstrap.js');
  if (!fs.existsSync(bootstrapPath)) {
    throw new Error(`Runtime SoT missing: ${bootstrapPath}`);
  }
  const pack = loadTranslationsPack(repoRoot);
  const bootstrap = fs.readFileSync(bootstrapPath, 'utf8');
  const header =
    '/* cursor-agent-zh generated sidecar — do not edit */\n' +
    '/* SoT: translations/zh-CN.json + runtime/bootstrap.js */\n' +
    'globalThis.__cursorAgentZhTranslations = ' +
    JSON.stringify(pack) +
    ';\n\n';
  return { source: header + bootstrap, pack, bootstrapPath };
}

function deploySidecar(repoRoot, sidecarPath) {
  const built = buildSidecarSource(repoRoot);
  fs.writeFileSync(sidecarPath, built.source, 'utf8');
  return {
    src: built.bootstrapPath,
    translationsSrc: path.join(repoRoot, 'translations', 'zh-CN.json'),
    sidecarPath,
    sha256: sha256File(sidecarPath),
    exactKeyCount: Object.keys(built.pack.exact).length,
    runtimePhase: built.pack.runtimePhase,
  };
}

function parseArgs(argv) {
  const out = { app: null, repo: null, reinstallLoader: false, clearCodeCache: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--app' || a === '--repo') {
      const value = argv[++i];
      if (!value || value.startsWith('--')) throw new Error('STOP: missing value for ' + a);
      if (a === '--app') out.app = value;
      else out.repo = value;
    } else if (a === '--reinstall-loader') out.reinstallLoader = true;
    else if (a === '--clear-code-cache') out.clearCodeCache = true;
    else throw new Error('STOP: unknown argument ' + a);
  }
  return out;
}

/**
 * Clear Cursor CachedData chrome/js for the running product commit.
 * Must be called when Cursor is not running (caller enforces).
 * @param {string} productPath
 * @param {{ appData?: string }} [opts]
 */
function clearCursorJsCodeCache(productPath, opts) {
  const product = JSON.parse(fs.readFileSync(productPath, 'utf8'));
  const commit = product.commit;
  if (!commit || typeof commit !== 'string') {
    throw new Error('product.json missing commit; cannot locate CachedData');
  }
  const appData =
    (opts && opts.appData) ||
    process.env.APPDATA ||
    process.env.XDG_CONFIG_HOME ||
    '';
  if (!appData) {
    throw new Error('APPDATA not set; pass opts.appData for CachedData root');
  }
  const jsDir = path.join(appData, 'Cursor', 'CachedData', commit, 'chrome', 'js');
  if (!fs.existsSync(jsDir)) {
    return { commit, jsDir, removed: 0, skipped: true };
  }
  let removed = 0;
  for (const name of fs.readdirSync(jsDir)) {
    const full = path.join(jsDir, name);
    const st = fs.statSync(full);
    if (st.isFile()) {
      fs.unlinkSync(full);
      removed += 1;
    } else if (st.isDirectory() && name === 'index-dir') {
      for (const n2 of fs.readdirSync(full)) {
        fs.unlinkSync(path.join(full, n2));
        removed += 1;
      }
    }
  }
  return { commit, jsDir, removed, skipped: false };
}

module.exports = {
  LOADER_MARKER,
  LOADER_MARKER_COMMENT,
  SUPPORTED_BASELINES,
  SIDECAR_NAME,
  RUNTIME_GUARD,
  sha256File,
  sha256Text,
  cursorProcessesRunning,
  fileContainsMarker,
  countMarkerOccurrences,
  buildLoaderSource,
  ensureLoaderStartsOnOwnLine,
  composeGlassWithLoader,
  assertLoaderNotInLineComment,
  countMarkerInString,
  clearCursorJsCodeCache,
  resolveRepoRoot,
  resolveAppRoot,
  pathsForApp,
  readSupportedIdentity,
  backupPathsForIdentity,
  verifyVersionedBackupOrThrow,
  createVersionedBackupOrThrow,
  assertGlassNotChecksummed,
  verifyExistingBackupOrThrow,
  PHASE_1D1_EXACT_KEYS,
  loadTranslationsPack,
  buildSidecarSource,
  deploySidecar,
  parseArgs,
};
