#!/usr/bin/env node
'use strict';

/**
 * Phase 1D.1 — exact static translation tests (no third-party deps).
 * PoC keys calibrated to Cursor 3.21.18 Glass DOM (2026-09-24).
 */

const path = require('path');
const assert = require('assert');
const shared = require('./lib/glass-loader-shared');

const POC_PACK = {
  exact: {
    'New Chat': '新建聊天',
    'New Project': '新建项目',
    Automations: '自动化',
  },
  contextual: [
    { en: 'Search', zh: '搜索', when: 'sidebar-menu-button' },
  ],
  dynamic: [],
  schema: 'layered-v1',
  runtimePhase: '2F.1',
};

globalThis.__cursorAgentZhTranslations = POC_PACK;

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

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log('PASS ' + name);
}

// A–C exact positive
test('A New Chat exact hit', () => {
  const hit = safety.matchExactTranslation('New Chat');
  assert.deepStrictEqual(hit, { key: 'New Chat', next: '新建聊天' });
  const span = el('span', {});
  const t = text('New Chat', span);
  t.parentNode = span;
  const r = safety.tryApplyExactTranslation(t);
  assert.strictEqual(r.applied, true);
  assert.strictEqual(t.nodeValue, '新建聊天');
});

test('B New Project exact hit', () => {
  assert.strictEqual(
    safety.matchExactTranslation('New Project').next,
    '新建项目',
  );
});

test('C Automations exact hit', () => {
  assert.strictEqual(
    safety.matchExactTranslation('Automations').next,
    '自动化',
  );
});

// D–F exact negative
test('D Create New Chat no hit', () => {
  assert.strictEqual(safety.matchExactTranslation('Create New Chat'), null);
  const span = el('span', {});
  const t = text('Create New Chat', span);
  t.parentNode = span;
  assert.strictEqual(safety.tryApplyExactTranslation(t), null);
  assert.strictEqual(t.nodeValue, 'Create New Chat');
});

test('E New Chat Beta no hit', () => {
  assert.strictEqual(safety.matchExactTranslation('New Chat Beta'), null);
});

test('F unknown string unchanged', () => {
  assert.strictEqual(safety.matchExactTranslation('Totally Unknown'), null);
  const span = el('span', {});
  const t = text('Totally Unknown', span);
  t.parentNode = span;
  assert.strictEqual(safety.tryApplyExactTranslation(t), null);
  assert.strictEqual(t.nodeValue, 'Totally Unknown');
});

// G–K invariants win
test('G human New Chat skipped', () => {
  const human = el('div', { 'data-message-kind': 'human' });
  const t = text('New Chat', human);
  t.parentNode = human;
  assert.strictEqual(safety.shouldSkipNode(t), true);
  assert.strictEqual(safety.tryApplyExactTranslation(t), null);
  assert.strictEqual(t.nodeValue, 'New Chat');
});

test('H assistant New Project skipped', () => {
  const box = el('div', { 'data-message-kind': 'assistant' });
  const t = text('New Project', box);
  t.parentNode = box;
  assert.strictEqual(safety.tryApplyExactTranslation(t), null);
  assert.strictEqual(t.nodeValue, 'New Project');
});

test('I tool Automations skipped', () => {
  const box = el('div', { 'data-message-kind': 'tool' });
  const t = text('Automations', box);
  t.parentNode = box;
  assert.strictEqual(safety.tryApplyExactTranslation(t), null);
  assert.strictEqual(t.nodeValue, 'Automations');
});

test('J code/pre/monaco/xterm skipped', () => {
  const cases = [
    el('pre', {}),
    el('code', {}),
    el('div', { className: 'monaco-editor' }),
    el('div', { className: 'xterm' }),
  ];
  for (const c of cases) {
    const t = text('New Chat', c);
    t.parentNode = c;
    assert.strictEqual(safety.tryApplyExactTranslation(t), null);
    assert.strictEqual(t.nodeValue, 'New Chat');
  }
});

test('K input/textarea/contenteditable skipped', () => {
  const input = el('input', {});
  const t1 = text('New Chat', input);
  t1.parentNode = input;
  assert.strictEqual(safety.tryApplyExactTranslation(t1), null);

  const ta = el('textarea', {});
  const t2 = text('New Chat', ta);
  t2.parentNode = ta;
  assert.strictEqual(safety.tryApplyExactTranslation(t2), null);

  const ce = el('div', { contenteditable: 'true', isContentEditable: true });
  const t3 = text('New Chat', ce);
  t3.parentNode = ce;
  assert.strictEqual(safety.tryApplyExactTranslation(t3), null);
});

// L whitespace
test('L outer whitespace preserved', () => {
  const hit = safety.matchExactTranslation('  New Chat  ');
  assert.strictEqual(hit.next, '  新建聊天  ');
  const span = el('span', {});
  const t = text('\tNew Project\n', span);
  t.parentNode = span;
  const r = safety.tryApplyExactTranslation(t);
  assert.strictEqual(r.applied, true);
  assert.strictEqual(t.nodeValue, '\t新建项目\n');
});

// M idempotency
test('M second apply is stable', () => {
  const span = el('span', {});
  const t = text('Automations', span);
  t.parentNode = span;
  assert.strictEqual(safety.tryApplyExactTranslation(t).applied, true);
  assert.strictEqual(t.nodeValue, '自动化');
  assert.strictEqual(safety.tryApplyExactTranslation(t), null);
  assert.strictEqual(t.nodeValue, '自动化');
});

// Search must NEVER be exact
test('Search is not an exact key', () => {
  assert.strictEqual(safety.matchExactTranslation('Search'), null);
  const span = el('span', {});
  const t = text('Search', span);
  t.parentNode = span;
  assert.strictEqual(safety.tryApplyExactTranslation(t), null);
  assert.strictEqual(t.nodeValue, 'Search');
});

// Dictionary SoT / deploy schema
test('deploy loadTranslationsPack layered schema', () => {
  const pack = shared.loadTranslationsPack(path.join(__dirname, '..'));
  assert.strictEqual(pack.runtimePhase, '2F.1');
  assert.strictEqual(Object.keys(pack.exact).length, 3);
  assert.deepStrictEqual(Object.keys(pack.exact).sort(), [
    'Automations',
    'New Chat',
    'New Project',
  ]);
  assert.ok(Array.isArray(pack.contextual));
  assert.strictEqual(pack.contextual.length, 65);
  assert.strictEqual(pack.contextual[0].en, 'Search');
  assert.strictEqual(pack.contextual[0].zh, '搜索');
  assert.strictEqual(pack.contextual[0].when, 'sidebar-menu-button');
  assert.ok(!Object.prototype.hasOwnProperty.call(pack.exact, 'Search'));
  assert.ok(Array.isArray(pack.dynamic));
});

test('buildSidecarSource injects pack before bootstrap', () => {
  const built = shared.buildSidecarSource(path.join(__dirname, '..'));
  assert.ok(built.source.startsWith('/* cursor-agent-zh generated'));
  assert.ok(built.source.includes('globalThis.__cursorAgentZhTranslations'));
  assert.ok(built.source.includes('"New Chat":"新建聊天"'));
  assert.ok(built.source.includes('"New Project":"新建项目"'));
  assert.ok(built.source.includes('"Automations":"自动化"'));
  assert.ok(built.source.includes('Phase 2F.1 Agents Settings Static Text'));
  assert.ok(built.source.includes('"en":"Search"'));
  assert.ok(built.source.includes('"zh":"搜索"'));
  assert.ok(built.source.includes('sidebar-menu-button'));
  // must not hardcode a second handwritten dictionary inside bootstrap SoT
  const bootstrapOnly = require('fs').readFileSync(
    path.join(__dirname, '..', 'runtime', 'bootstrap.js'),
    'utf8',
  );
  assert.ok(!bootstrapOnly.includes('新建聊天'));
  assert.ok(!bootstrapOnly.includes('新建项目'));
  assert.ok(!bootstrapOnly.includes('自动化'));
});

test('runtimePhase constant', () => {
  assert.strictEqual(safety.RUNTIME_PHASE, '2F.1');
});


test('3.22.7 thinking and ai message text never exact-translates', () => {
  for (const attrs of [
    { 'data-message-kind': 'thinking' },
    { 'data-message-role': 'ai' },
  ]) {
    const box = el('div', attrs);
    const t = text('New Chat', box);
    assert.strictEqual(safety.tryApplyExactTranslation(t), null);
    assert.strictEqual(t.nodeValue, 'New Chat');
  }
});

console.log('OK ' + passed + ' exact-translation tests');
