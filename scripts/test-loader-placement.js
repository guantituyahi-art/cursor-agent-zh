#!/usr/bin/env node
'use strict';

/**
 * Loader placement / comment-swallow tests (no Cursor install required).
 * Test F: //# sourceMappingURL at EOF without trailing newline must not
 * leave the loader inside a line comment.
 */

const assert = require('assert');
const shared = require('./lib/glass-loader-shared');

function pass(name) {
  console.log('PASS ' + name);
}

function run(name, fn) {
  try {
    fn();
    pass(name);
  } catch (e) {
    console.error('FAIL ' + name);
    console.error(e && e.stack ? e.stack : e);
    process.exitCode = 1;
  }
}

run('Test F: sourceMappingURL EOF without trailing newline', () => {
  const sim = 'var x = 1;\n//# sourceMappingURL=test.js.map'; // no final \n
  assert.equal(sim.endsWith('\n'), false);
  const { contents, placement } = shared.composeGlassWithLoader(sim);
  assert.equal(placement, 'before-sourceMappingURL');
  shared.assertLoaderNotInLineComment(contents);
  const markerIdx = contents.indexOf(shared.LOADER_MARKER);
  const pragmaIdx = contents.indexOf('//# sourceMappingURL=');
  assert.ok(markerIdx >= 0 && pragmaIdx >= 0);
  assert.ok(
    markerIdx < pragmaIdx,
    'loader must appear before sourceMappingURL pragma',
  );
  const lineStart = contents.lastIndexOf('\n', markerIdx) + 1;
  const lineEnd = contents.indexOf('\n', markerIdx);
  const line = contents.slice(lineStart, lineEnd < 0 ? undefined : lineEnd);
  assert.ok(
    line.trimStart().startsWith('/*'),
    'marker line should be a block comment, got: ' + JSON.stringify(line),
  );
  assert.equal(
    /sourceMappingURL=[^\n]*cursor-agent-zh-phase1a-loader/.test(contents),
    false,
  );
});

run('Test F2: plain // comment without trailing newline', () => {
  const sim = 'code();\n// trailing comment';
  assert.equal(sim.endsWith('\n'), false);
  const { contents } = shared.composeGlassWithLoader(sim);
  shared.assertLoaderNotInLineComment(contents);
  const lines = contents.split('\n');
  const mi = lines.findIndex((l) => l.includes(shared.LOADER_MARKER));
  assert.ok(mi >= 0);
  assert.equal(lines[mi].includes('trailing comment'), false);
});

run('Test F3: ensureLoaderStartsOnOwnLine rejects glued simulation via assert', () => {
  const bad =
    '//# sourceMappingURL=test.js.map' + '/* ' + shared.LOADER_MARKER + ' */';
  assert.throws(() => shared.assertLoaderNotInLineComment(bad), /glued|line comment/);
});

run('buildLoaderSource is syntactically checkable', () => {
  const fs = require('fs');
  const { execFileSync } = require('child_process');
  const tmp = require('path').join(require('os').tmpdir(), 'caz-loader-syntax.js');
  fs.writeFileSync(tmp, shared.buildLoaderSource(), 'utf8');
  execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' });
});

if (!process.exitCode) {
  console.log('All loader placement tests passed.');
}
