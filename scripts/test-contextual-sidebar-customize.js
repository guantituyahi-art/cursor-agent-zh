#!/usr/bin/env node
'use strict';

/**
 * Phase 2G.1 — Sidebar "Customize" contextual translation tests (no third-party deps).
 *
 * Uses the REAL translations/zh-CN.json (not a local fixture) so this test fails
 * if the dictionary entry or its `when` scope drifts.
 */

const assert = require('assert');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
const shared = require(path.join(REPO_ROOT, 'scripts', 'lib', 'glass-loader-shared.js'));

/**
 * Known, implemented contextual scopes.
 * Keep in sync with matchesContextualWhen() in runtime/bootstrap.js.
 * loadTranslationsPack() does not validate `when`, so an unknown value would
 * silently create an inert rule; this guard catches that drift.
 */
const KNOWN_WHEN = new Set([
  'sidebar-menu-button',
  'appearance-settings-label',
  'appearance-settings-description',
  'general-settings-label',
  'general-settings-description',
  'settings-sidebar-label',
  'agents-settings-label',
  'agents-settings-description',
]);

const pack = shared.loadTranslationsPack(REPO_ROOT);
globalThis.__cursorAgentZhTranslations = pack;
delete globalThis.__cursorAgentZhRuntime;

const safety = require(path.join(REPO_ROOT, 'runtime', 'bootstrap.js'));

function el(tag, attrs, parent) {
  const node = {
    nodeType: 1,
    tagName: String(tag).toUpperCase(),
    parentNode: parent || null,
    className: (attrs && attrs.className) || '',
    isContentEditable: !!(attrs && attrs.isContentEditable),
    childNodes: [],
    attrs: Object.assign({}, attrs || {}),
    getAttribute(name) {
      if (!this.attrs || this.attrs[name] == null) return null;
      return String(this.attrs[name]);
    },
    appendChild(child) {
      child.parentNode = this;
      this.childNodes.push(child);
      return child;
    },
  };
  if (attrs && attrs.contenteditable != null) {
    node.attrs.contenteditable = attrs.contenteditable;
  }
  return node;
}

function text(value, parent) {
  const t = { nodeType: 3, nodeValue: value, parentNode: parent || null };
  if (parent && parent.childNodes) parent.childNodes.push(t);
  return t;
}

function attachTreeWalker(doc) {
  doc.createTreeWalker = function (root) {
    const nodes = [];
    function walk(n) {
      if (!n) return;
      if (n.nodeType === 3) nodes.push(n);
      const kids = n.childNodes || [];
      for (let i = 0; i < kids.length; i++) walk(kids[i]);
    }
    walk(root);
    let i = -1;
    return {
      nextNode() {
        i += 1;
        return i < nodes.length ? nodes[i] : null;
      },
    };
  };
  return doc;
}

function freshState() {
  return {
    textNodesSeen: 0,
    candidateCount: 0,
    skipCounts: { message: 0, code: 0, editable: 0, empty: 0 },
    exactMatches: 0,
    translationsApplied: 0,
    translationCounts: {},
    contextualMatches: 0,
    contextualTranslationsApplied: 0,
    contextualTranslationCounts: { Customize: 0 },
    observerAttached: false,
    mutationBatches: 0,
    mutatedNodesSeen: 0,
    dynamicExactMatches: 0,
    dynamicTranslationsApplied: 0,
    dynamicContextualMatches: 0,
    dynamicContextualTranslationsApplied: 0,
    isGlass: true,
  };
}

/** Sidebar menu button with a text node inside. */
function sidebarText(value) {
  const btn = el('button', { 'data-sidebar-menu-button': '' });
  const span = el('span', {});
  btn.appendChild(span);
  const t = text(value, span);
  return { btn, span, t };
}

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log('PASS ' + name);
}

const doc = attachTreeWalker({});

// A — positive: Customize under the researched sidebar anchor
test('A Customize under data-sidebar-menu-button → 自定义', () => {
  const { t } = sidebarText('Customize');
  const r = safety.tryApplyContextualTranslation(t);
  assert.ok(r);
  assert.strictEqual(r.applied, true);
  assert.strictEqual(r.key, 'Customize');
  assert.strictEqual(r.when, 'sidebar-menu-button');
  assert.strictEqual(t.nodeValue, '自定义');
  assert.ok(safety.matchesContextualWhen('sidebar-menu-button', t));
});

// B — negative: same word without the anchor stays English
test('B bare Customize without sidebar anchor → unchanged', () => {
  const t = text('Customize', el('span', {}));
  assert.strictEqual(safety.tryApplyExactTranslation(t), null);
  assert.strictEqual(safety.tryApplyContextualTranslation(t), null);
  assert.strictEqual(t.nodeValue, 'Customize');
});

// C — negative: safety invariants win even with a forged sidebar ancestor
test('C message kinds and ai role skip Customize', () => {
  for (const attrs of [
    { 'data-message-kind': 'human' },
    { 'data-message-kind': 'assistant' },
    { 'data-message-kind': 'thinking' },
    { 'data-message-kind': 'tool' },
    { 'data-message-role': 'ai' },
  ]) {
    const box = el('div', attrs);
    const btn = el('button', { 'data-sidebar-menu-button': '' });
    box.appendChild(btn);
    const t = text('Customize', btn);
    assert.strictEqual(safety.shouldSkipNode(t), true);
    assert.strictEqual(safety.tryApplyContextualTranslation(t), null);
    assert.strictEqual(t.nodeValue, 'Customize');
  }
});

// D — negative: code / terminal surfaces
test('D code/pre/monaco/xterm skip Customize', () => {
  for (const c of [
    el('pre', {}),
    el('code', {}),
    el('div', { className: 'monaco-editor' }),
    el('div', { className: 'xterm' }),
  ]) {
    const btn = el('button', { 'data-sidebar-menu-button': '' });
    c.appendChild(btn);
    const t = text('Customize', btn);
    assert.strictEqual(safety.tryApplyContextualTranslation(t), null);
    assert.strictEqual(t.nodeValue, 'Customize');
  }
});

// E — negative: editable content
test('E input/textarea/contenteditable skip Customize', () => {
  for (const host of [
    el('input', {}),
    el('textarea', {}),
    el('div', { contenteditable: 'true', isContentEditable: true }),
  ]) {
    const btn = el('button', { 'data-sidebar-menu-button': '' });
    host.appendChild(btn);
    const t = text('Customize', btn);
    assert.strictEqual(safety.tryApplyContextualTranslation(t), null);
    assert.strictEqual(t.nodeValue, 'Customize');
  }
});

// F — dynamic subtree via the MutationObserver path
test('F processAddedNodes dynamic sidebar Customize → 自定义', () => {
  const state = freshState();
  const { t } = sidebarText('Customize');
  safety.processAddedNodes([t], state, doc);
  assert.strictEqual(t.nodeValue, '自定义');
  assert.strictEqual(state.dynamicContextualTranslationsApplied, 1);
  assert.strictEqual(state.contextualTranslationsApplied, 1);
  assert.strictEqual(state.contextualMatches, 1);
  assert.strictEqual(state.contextualTranslationCounts.Customize, 1);
  assert.strictEqual(state.dynamicExactMatches, 0);
});

// F2 — dynamic plain Customize still untouched
test('F2 processAddedNodes plain Customize → no', () => {
  const state = freshState();
  const t = text('Customize', el('span', {}));
  safety.processAddedNodes([t], state, doc);
  assert.strictEqual(t.nodeValue, 'Customize');
  assert.strictEqual(state.dynamicContextualTranslationsApplied, 0);
  assert.strictEqual(state.contextualMatches, 0);
});

// G — rescanning an already translated node is a no-op
test('G already 自定义 rescanned → no change', () => {
  const state = freshState();
  const { t } = sidebarText('Customize');
  t.nodeValue = '自定义';
  safety.processAddedNodes([t], state, doc);
  assert.strictEqual(t.nodeValue, '自定义');
  assert.strictEqual(state.contextualTranslationsApplied, 0);
  assert.strictEqual(state.dynamicContextualTranslationsApplied, 0);
});

// H — regression: Search still uses the same scope
test('H Search still translated under the same scope', () => {
  const { t } = sidebarText('Search');
  const r = safety.tryApplyContextualTranslation(t);
  assert.ok(r);
  assert.strictEqual(r.key, 'Search');
  assert.strictEqual(t.nodeValue, '搜索');
});

// I — dictionary guard: real JSON is consistent
test('I translations/zh-CN.json: Customize rule present and every when implemented', () => {
  const ctx = pack.contextual;
  const customize = ctx.filter((r) => r.en === 'Customize');
  assert.strictEqual(customize.length, 1, 'exactly one Customize rule');
  assert.strictEqual(customize[0].zh, '自定义');
  assert.strictEqual(customize[0].when, 'sidebar-menu-button');
  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(pack.exact, 'Customize'),
    false,
    'Customize must not be an exact key',
  );
  const seen = new Set();
  for (const rule of ctx) {
    assert.ok(KNOWN_WHEN.has(rule.when), 'unknown when scope: ' + rule.when);
    const key = rule.when + '|' + rule.en;
    assert.ok(!seen.has(key), 'duplicate contextual rule: ' + key);
    seen.add(key);
  }
});

// J — unknown when fails closed
test('J unknown when fails closed', () => {
  assert.strictEqual(
    safety.matchesContextualWhen('not-a-real-when', text('Customize', el('span', {}))),
    false,
  );
});

// K — Customize never via the exact map
test('K Customize never via exact map', () => {
  assert.strictEqual(safety.matchExactTranslation('Customize'), null);
});

console.log('OK ' + passed + ' contextual-sidebar-customize tests');
