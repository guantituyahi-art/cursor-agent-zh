#!/usr/bin/env node
'use strict';

/**
 * Phase 1D.2b.1 — Sidebar Search contextual translation tests (no third-party deps).
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

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
  runtimePhase: '2D.1',
};

globalThis.__cursorAgentZhTranslations = POC_PACK;
delete globalThis.__cursorAgentZhRuntime;

const safety = require(path.join(__dirname, '..', 'runtime', 'bootstrap.js'));

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
  const t = {
    nodeType: 3,
    nodeValue: value,
    parentNode: parent || null,
  };
  if (parent && parent.childNodes) parent.childNodes.push(t);
  return t;
}

function attachTreeWalker(doc) {
  doc.createTreeWalker = function (root, _whatToShow) {
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
    translationCounts: {
      'New Chat': 0,
      'New Project': 0,
      Automations: 0,
    },
    contextualMatches: 0,
    contextualTranslationsApplied: 0,
    contextualTranslationCounts: { Search: 0 },
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

function sidebarSearchText() {
  const btn = el('button', { 'data-sidebar-menu-button': '' });
  const span = el('span', {});
  btn.appendChild(span);
  const t = text('Search', span);
  return { btn, span, t };
}

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log('PASS ' + name);
}

const doc = attachTreeWalker({});

assert.strictEqual(safety.RUNTIME_PHASE, '2D.1');

// A — sidebar Search → 搜索
test('A Search under data-sidebar-menu-button → 搜索', () => {
  const { t } = sidebarSearchText();
  const r = safety.tryApplyContextualTranslation(t);
  assert.ok(r);
  assert.strictEqual(r.applied, true);
  assert.strictEqual(r.key, 'Search');
  assert.strictEqual(t.nodeValue, '搜索');
  assert.ok(
    safety.matchesContextualWhen('sidebar-menu-button', t),
  );
});

// B — plain Search unchanged
test('B Search on plain safe UI without attr → unchanged', () => {
  const span = el('span', {});
  const t = text('Search', span);
  assert.strictEqual(safety.tryApplyExactTranslation(t), null);
  assert.strictEqual(safety.tryApplyContextualTranslation(t), null);
  assert.strictEqual(t.nodeValue, 'Search');
});

// C — human message Search with bogus sidebar ancestor → safety first
test('C human Search with sidebar ancestor NOT translated', () => {
  const human = el('div', { 'data-message-kind': 'human' });
  const btn = el('button', { 'data-sidebar-menu-button': '' });
  human.appendChild(btn);
  const t = text('Search', btn);
  assert.strictEqual(safety.shouldSkipNode(t), true);
  assert.strictEqual(safety.tryApplyContextualTranslation(t), null);
  assert.strictEqual(t.nodeValue, 'Search');
});

// D — assistant
test('D assistant Search skipped', () => {
  const box = el('div', { 'data-message-kind': 'assistant' });
  const btn = el('button', { 'data-sidebar-menu-button': '' });
  box.appendChild(btn);
  const t = text('Search', btn);
  assert.strictEqual(safety.tryApplyContextualTranslation(t), null);
  assert.strictEqual(t.nodeValue, 'Search');
});

// E — tool
test('E tool Search skipped', () => {
  const box = el('div', { 'data-message-kind': 'tool' });
  const btn = el('button', { 'data-sidebar-menu-button': '' });
  box.appendChild(btn);
  const t = text('Search', btn);
  assert.strictEqual(safety.tryApplyContextualTranslation(t), null);
  assert.strictEqual(t.nodeValue, 'Search');
});

// F — code/pre/monaco/xterm
test('F code/pre/monaco/xterm Search skipped', () => {
  for (const c of [
    el('pre', {}),
    el('code', {}),
    el('div', { className: 'monaco-editor' }),
    el('div', { className: 'xterm' }),
  ]) {
    const btn = el('button', { 'data-sidebar-menu-button': '' });
    c.appendChild(btn);
    const t = text('Search', btn);
    assert.strictEqual(safety.tryApplyContextualTranslation(t), null);
    assert.strictEqual(t.nodeValue, 'Search');
  }
});

// G — input/textarea/contenteditable
test('G input/textarea/contenteditable Search skipped', () => {
  const input = el('input', {});
  const btn1 = el('button', { 'data-sidebar-menu-button': '' });
  input.appendChild(btn1);
  const t1 = text('Search', btn1);
  assert.strictEqual(safety.tryApplyContextualTranslation(t1), null);

  const ta = el('textarea', {});
  const btn2 = el('button', { 'data-sidebar-menu-button': '' });
  ta.appendChild(btn2);
  const t2 = text('Search', btn2);
  assert.strictEqual(safety.tryApplyContextualTranslation(t2), null);

  const ce = el('div', { contenteditable: 'true', isContentEditable: true });
  const btn3 = el('button', { 'data-sidebar-menu-button': '' });
  ce.appendChild(btn3);
  const t3 = text('Search', btn3);
  assert.strictEqual(safety.tryApplyContextualTranslation(t3), null);
  assert.strictEqual(t3.nodeValue, 'Search');
});

// H — dynamic sidebar Search via processAddedNodes
test('H processAddedNodes dynamic sidebar Search → 搜索', () => {
  const state = freshState();
  const { t } = sidebarSearchText();
  safety.processAddedNodes([t], state, doc);
  assert.strictEqual(t.nodeValue, '搜索');
  assert.strictEqual(state.dynamicContextualTranslationsApplied, 1);
  assert.strictEqual(state.contextualTranslationsApplied, 1);
  assert.strictEqual(state.contextualMatches, 1);
  assert.strictEqual(state.contextualTranslationCounts.Search, 1);
  assert.strictEqual(state.dynamicExactMatches, 0);
});

// I — dynamic plain Search → no
test('I processAddedNodes dynamic plain Search → no', () => {
  const state = freshState();
  const t = text('Search', el('span', {}));
  safety.processAddedNodes([t], state, doc);
  assert.strictEqual(t.nodeValue, 'Search');
  assert.strictEqual(state.dynamicContextualTranslationsApplied, 0);
  assert.strictEqual(state.contextualMatches, 0);
});

// J — already 搜索 rescanned → no change
test('J already 搜索 rescanned → no change', () => {
  const state = freshState();
  const { t } = sidebarSearchText();
  t.nodeValue = '搜索';
  safety.processAddedNodes([t], state, doc);
  assert.strictEqual(t.nodeValue, '搜索');
  assert.strictEqual(state.contextualTranslationsApplied, 0);
  assert.strictEqual(state.dynamicContextualTranslationsApplied, 0);
});

// K — exact still works
test('K New Chat / Automations / New Project still exact', () => {
  const state = freshState();
  const t1 = text('New Chat', el('span', {}));
  const t2 = text('Automations', el('span', {}));
  const t3 = text('New Project', el('span', {}));
  safety.processAddedNodes([t1, t2, t3], state, doc);
  assert.strictEqual(t1.nodeValue, '新建聊天');
  assert.strictEqual(t2.nodeValue, '自动化');
  assert.strictEqual(t3.nodeValue, '新建项目');
  assert.strictEqual(state.dynamicTranslationsApplied, 3);
  assert.strictEqual(state.dynamicContextualTranslationsApplied, 0);
});

// L — observer still only one
test('L attachTranslationObserver still only one', () => {
  delete globalThis.__cursorAgentZhRuntime;
  const state = freshState();
  let constructCount = 0;
  let observeCount = 0;
  function FakeMO(cb) {
    constructCount += 1;
    this._cb = cb;
    this.observe = function () {
      observeCount += 1;
    };
    this.disconnect = function () {};
  }
  const fakeDoc = attachTreeWalker({
    body: el('body', { 'data-cursor-glass-mode': 'true' }),
  });
  fakeDoc.body.getAttribute = function (n) {
    return n === 'data-cursor-glass-mode' ? 'true' : null;
  };

  const o1 = safety.attachTranslationObserver(state, fakeDoc, {
    MutationObserver: FakeMO,
  });
  const o2 = safety.attachTranslationObserver(state, fakeDoc, {
    MutationObserver: FakeMO,
  });
  assert.ok(o1);
  assert.strictEqual(o1, o2);
  assert.strictEqual(constructCount, 1);
  assert.strictEqual(observeCount, 1);
  assert.strictEqual(state.observerAttached, true);
});

// Extra: unknown when fail-closed; Search never exact; scan path
test('unknown when fails closed', () => {
  assert.strictEqual(safety.matchesContextualWhen('not-a-real-when', text('Search', el('span', {}))), false);
});

test('Search never via exact map', () => {
  assert.strictEqual(safety.matchExactTranslation('Search'), null);
});

test('runSafetyScan applies contextual after exact miss', () => {
  const root = el('div', {});
  const { btn, t } = sidebarSearchText();
  root.appendChild(btn);
  const plain = text('Search', el('span', {}));
  root.appendChild(plain.parentNode);
  const scanDoc = attachTreeWalker({});
  const stats = safety.runSafetyScan(root, scanDoc, { applyExact: true });
  assert.strictEqual(t.nodeValue, '搜索');
  assert.strictEqual(plain.nodeValue, 'Search');
  assert.strictEqual(stats.contextualMatches, 1);
  assert.strictEqual(stats.contextualTranslationsApplied, 1);
  assert.ok(stats.contextualTranslationCounts.Search >= 1);
});

test('getContextualRules returns Search rule', () => {
  const rules = safety.getContextualRules();
  assert.strictEqual(rules.length, 1);
  assert.strictEqual(rules[0].en, 'Search');
  assert.strictEqual(rules[0].when, 'sidebar-menu-button');
});


test('3.22.7 thinking and ai skip Search even inside sidebar anchor', () => {
  for (const attrs of [
    { 'data-message-kind': 'thinking' },
    { 'data-message-role': 'ai' },
  ]) {
    const box = el('div', attrs);
    const btn = el('button', { 'data-sidebar-menu-button': '' }, box);
    const t = text('Search', btn);
    assert.strictEqual(safety.tryApplyContextualTranslation(t), null);
    assert.strictEqual(t.nodeValue, 'Search');
  }
});

console.log('OK ' + passed + ' contextual-sidebar-search tests');
