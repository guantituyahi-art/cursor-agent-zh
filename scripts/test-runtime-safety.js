#!/usr/bin/env node
'use strict';

/**
 * Phase 1C — pure safety classification tests (no jsdom, no translation).
 */

const path = require('path');
const assert = require('assert');
const safety = require(path.join(__dirname, '..', 'runtime', 'bootstrap.js'));

function el(tag, attrs, parent) {
  const node = {
    nodeType: 1,
    tagName: String(tag).toUpperCase(),
    parentNode: parent || null,
    className: (attrs && attrs.className) || '',
    isContentEditable: !!(attrs && attrs.isContentEditable),
    attrs: Object.assign({}, attrs || {}),
    getAttribute(name) {
      if (!this.attrs || this.attrs[name] == null) return null;
      return String(this.attrs[name]);
    },
  };
  if (attrs && attrs.contenteditable != null) {
    node.attrs.contenteditable = attrs.contenteditable;
  }
  return node;
}

function text(value, parent) {
  return {
    nodeType: 3,
    nodeValue: value,
    parentNode: parent || null,
  };
}

function chain(nodes) {
  for (let i = 1; i < nodes.length; i++) {
    nodes[i].parentNode = nodes[i - 1];
  }
  return nodes[nodes.length - 1];
}

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log('PASS ' + name);
}

// A — human message descendant skipped
test('A human message descendant skipped', () => {
  const human = el('div', { 'data-message-kind': 'human' });
  const child = el('span', {}, human);
  child.parentNode = human;
  const t = text('hello user', child);
  assert.strictEqual(safety.skipReasonForNode(t), 'message');
  assert.strictEqual(safety.shouldSkipNode(t), true);
  assert.strictEqual(safety.isCandidateTextNode(t), false);
});

// also data-message-role
test('A′ data-message-role=human skipped', () => {
  const human = el('div', { 'data-message-role': 'human' });
  const t = text('hi', human);
  t.parentNode = human;
  assert.strictEqual(safety.shouldSkipNode(t), true);
});

// B — assistant
test('B assistant message descendant skipped', () => {
  const box = el('div', { 'data-message-kind': 'assistant' });
  const t = text('model reply', box);
  t.parentNode = box;
  assert.strictEqual(safety.skipReasonForNode(t), 'message');
  assert.strictEqual(safety.isCandidateTextNode(t), false);
});

// C — tool
test('C tool message descendant skipped', () => {
  const box = el('div', { 'data-message-kind': 'tool' });
  const t = text('tool output', box);
  t.parentNode = box;
  assert.strictEqual(safety.skipReasonForNode(t), 'message');
});

// D — pre/code/monaco/xterm
test('D pre/code/monaco/xterm skipped', () => {
  const cases = [
    el('pre', {}),
    el('code', {}),
    el('div', { className: 'monaco-editor' }),
    el('div', { className: 'view-lines' }),
    el('div', { className: 'xterm' }),
    el('div', { className: 'cm-editor' }),
    el('div', { className: 'cm-content' }),
  ];
  for (const c of cases) {
    const t = text('code here', c);
    t.parentNode = c;
    assert.strictEqual(
      safety.skipReasonForNode(t),
      'code',
      'expected code skip for ' + c.tagName + '/' + c.className,
    );
  }
});

// E — editable
test('E input/textarea/contenteditable skipped', () => {
  const input = el('input', {});
  const ta = el('textarea', {});
  const ce = el('div', { contenteditable: 'true' });
  for (const c of [input, ta, ce]) {
    const t = text('typing', c);
    t.parentNode = c;
    assert.strictEqual(safety.skipReasonForNode(t), 'editable');
    assert.strictEqual(safety.isCandidateTextNode(t), false);
  }
});

// F — safe UI text is candidate
test('F safe UI text is candidate', () => {
  const toolbar = el('button', { className: 'toolbar-btn' });
  const t = text('New Agent', toolbar);
  t.parentNode = toolbar;
  assert.strictEqual(safety.shouldSkipNode(t), false);
  assert.strictEqual(safety.isCandidateTextNode(t), true);
});

test('empty text not candidate', () => {
  const toolbar = el('button', {});
  const t = text('   \n', toolbar);
  t.parentNode = toolbar;
  assert.strictEqual(safety.isCandidateTextNode(t), false);
});

test('isGlassDocument requires data-cursor-glass-mode=true', () => {
  const docGlass = {
    body: el('body', { 'data-cursor-glass-mode': 'true' }),
  };
  const docEditor = {
    body: el('body', {}),
  };
  assert.strictEqual(safety.isGlassDocument(docGlass), true);
  assert.strictEqual(safety.isGlassDocument(docEditor), false);
});


// --- Phase 1C readiness: Glass scope timing race ---

function clearRuntimeGuard() {
  var g =
    typeof globalThis !== 'undefined'
      ? globalThis
      : typeof global !== 'undefined'
        ? global
        : null;
  if (g && safety.RUNTIME_GUARD && g[safety.RUNTIME_GUARD]) {
    delete g[safety.RUNTIME_GUARD];
  }
}

test('classifyGlassScope: missing attr is pending (not final)', function () {
  var doc = { body: el('body', {}) };
  assert.strictEqual(safety.classifyGlassScope(doc), 'pending');
});

test('classifyGlassScope: true is glass', function () {
  var doc = {
    body: el('body', { 'data-cursor-glass-mode': 'true' }),
  };
  assert.strictEqual(safety.classifyGlassScope(doc), 'glass');
});

test('classifyGlassScope: no body is pending', function () {
  assert.strictEqual(safety.classifyGlassScope({ body: null }), 'pending');
});

test('pending Glass attr must not set initialized/skippedNotGlass', function () {
  clearRuntimeGuard();
  var body = el('body', {});
  var doc = {
    body: body,
    documentElement: body,
    createTreeWalker: function () {
      return {
        nextNode: function () {
          return null;
        },
      };
    },
  };
  var timers = [];
  var now = 0;
  var api = safety.runInit(doc, {
    waitMs: 1000,
    pollMs: 1000,
    now: function () {
      return now;
    },
    setTimeout: function (fn, ms) {
      timers.push({ fn: fn, due: now + (ms || 0), cleared: false });
      return timers.length - 1;
    },
    clearTimeout: function (id) {
      if (timers[id]) timers[id].cleared = true;
    },
  });
  var st = api.getStatus();
  assert.strictEqual(st.initialized, false);
  assert.strictEqual(st.skippedNotGlass, false);
  assert.strictEqual(st.waitingForGlass, true);
  assert.strictEqual(st.scopeSettled, false);

  body.attrs['data-cursor-glass-mode'] = 'true';
  // Drive one poll tick after attr is present.
  now = 1;
  for (var i = 0; i < timers.length; i++) {
    if (!timers[i].cleared) timers[i].fn();
  }
  st = api.getStatus();
  assert.strictEqual(st.isGlass, true);
  assert.strictEqual(st.skippedNotGlass, false);
  assert.strictEqual(st.initialized, true);
  assert.strictEqual(st.scopeSettled, true);
  assert.strictEqual(st.waitingForGlass, false);
  assert.strictEqual(st.scanCompleted, true);
  clearRuntimeGuard();
});

test('timeout without Glass attr settles skippedNotGlass once', function () {
  clearRuntimeGuard();
  var body = el('body', {});
  var doc = {
    body: body,
    documentElement: body,
    createTreeWalker: function () {
      return {
        nextNode: function () {
          return null;
        },
      };
    },
  };
  var timers = [];
  var now = 0;
  var api = safety.runInit(doc, {
    waitMs: 20,
    pollMs: 5,
    now: function () {
      return now;
    },
    setTimeout: function (fn, ms) {
      timers.push({ fn: fn, due: now + (ms || 0), cleared: false });
      return timers.length - 1;
    },
    clearTimeout: function (id) {
      if (timers[id]) timers[id].cleared = true;
    },
  });
  assert.strictEqual(api.getStatus().waitingForGlass, true);
  now = 50;
  for (var i = 0; i < timers.length; i++) {
    if (!timers[i].cleared) timers[i].fn();
  }
  var st = api.getStatus();
  assert.strictEqual(st.skippedNotGlass, true);
  assert.strictEqual(st.isGlass, false);
  assert.strictEqual(st.initialized, true);
  assert.strictEqual(st.scopeSettled, true);
  clearRuntimeGuard();
});

console.log('OK ' + passed + ' tests');
