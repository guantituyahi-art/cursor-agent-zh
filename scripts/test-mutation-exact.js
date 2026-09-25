#!/usr/bin/env node
'use strict';

/**
 * Phase 1D.2a — MutationObserver dynamic exact tests (no jsdom / no third-party deps).
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
  runtimePhase: '2E.1',
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

/** Minimal TreeWalker over a mock element subtree. */
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
    observerAttached: false,
    mutationBatches: 0,
    mutatedNodesSeen: 0,
    dynamicExactMatches: 0,
    dynamicTranslationsApplied: 0,
    isGlass: true,
  };
}

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log('PASS ' + name);
}

const doc = attachTreeWalker({});

// A–C dynamic safe UI
test('A dynamic New Chat translates', () => {
  const state = freshState();
  const span = el('span', {});
  const t = text('New Chat', span);
  safety.processAddedNodes([t], state, doc);
  assert.strictEqual(t.nodeValue, '新建聊天');
  assert.strictEqual(state.dynamicTranslationsApplied, 1);
  assert.strictEqual(state.translationsApplied, 1);
});

test('B dynamic New Project translates', () => {
  const state = freshState();
  const t = text('New Project', el('span', {}));
  safety.processAddedNodes([t], state, doc);
  assert.strictEqual(t.nodeValue, '新建项目');
});

test('C dynamic Automations translates', () => {
  const state = freshState();
  const t = text('Automations', el('span', {}));
  safety.processAddedNodes([t], state, doc);
  assert.strictEqual(t.nodeValue, '自动化');
});

test('D dynamic human New Chat skipped', () => {
  const state = freshState();
  const human = el('div', { 'data-message-kind': 'human' });
  const t = text('New Chat', human);
  safety.processAddedNodes([t], state, doc);
  assert.strictEqual(t.nodeValue, 'New Chat');
  assert.strictEqual(state.dynamicTranslationsApplied, 0);
  assert.strictEqual(state.skipCounts.message, 1);
});

test('E dynamic assistant skipped', () => {
  const state = freshState();
  const box = el('div', { 'data-message-kind': 'assistant' });
  const t = text('New Project', box);
  safety.processAddedNodes([t], state, doc);
  assert.strictEqual(t.nodeValue, 'New Project');
});

test('F dynamic tool skipped', () => {
  const state = freshState();
  const box = el('div', { 'data-message-kind': 'tool' });
  const t = text('Automations', box);
  safety.processAddedNodes([t], state, doc);
  assert.strictEqual(t.nodeValue, 'Automations');
});

test('G dynamic code/pre/monaco/xterm skipped', () => {
  const state = freshState();
  for (const c of [
    el('pre', {}),
    el('code', {}),
    el('div', { className: 'monaco-editor' }),
    el('div', { className: 'xterm' }),
  ]) {
    const t = text('New Chat', c);
    safety.processAddedNodes([t], state, doc);
    assert.strictEqual(t.nodeValue, 'New Chat');
  }
  assert.strictEqual(state.dynamicTranslationsApplied, 0);
});

test('H dynamic editable skipped', () => {
  const state = freshState();
  const ce = el('div', { contenteditable: 'true', isContentEditable: true });
  const t = text('New Chat', ce);
  safety.processAddedNodes([t], state, doc);
  assert.strictEqual(t.nodeValue, 'New Chat');
});

test('I added subtree only (not whole body)', () => {
  const state = freshState();
  const body = el('body', {});
  const ignored = text('New Chat', el('span', {}));
  ignored.parentNode.parentNode = body;
  body.appendChild(ignored.parentNode);

  const sidebar = el('div', { className: 'sidebar' });
  const target = text('New Project', el('button', {}));
  target.parentNode.parentNode = sidebar;
  sidebar.appendChild(target.parentNode);

  // Only process the sidebar subtree root — body sibling must stay English.
  safety.processAddedNodes([sidebar], state, doc);
  assert.strictEqual(target.nodeValue, '新建项目');
  assert.strictEqual(ignored.nodeValue, 'New Chat');
  assert.ok(state.dynamicTranslationsApplied >= 1);
});

test('J non-target string unchanged', () => {
  const state = freshState();
  const t = text('Totally Unknown', el('span', {}));
  safety.processAddedNodes([t], state, doc);
  assert.strictEqual(t.nodeValue, 'Totally Unknown');
  assert.strictEqual(state.dynamicTranslationsApplied, 0);
});

test('K observer attaches once; second attach no-op', () => {
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
  assert.deepStrictEqual(safety.TRANSLATION_OBSERVER_OPTIONS, {
    childList: true,
    subtree: true,
  });
});

test('L translate does not loop translationsApplied', () => {
  const state = freshState();
  const t = text('New Chat', el('span', {}));
  safety.processAddedNodes([t], state, doc);
  assert.strictEqual(t.nodeValue, '新建聊天');
  assert.strictEqual(state.translationsApplied, 1);
  // Re-process translated node (simulates spurious re-delivery): Chinese ≠ exact key.
  safety.processAddedNodes([t], state, doc);
  assert.strictEqual(t.nodeValue, '新建聊天');
  assert.strictEqual(state.translationsApplied, 1);
  assert.strictEqual(state.dynamicTranslationsApplied, 1);
});

test('batcher dedupes + scheduled flush', () => {
  const state = freshState();
  let scheduled = null;
  const batcher = safety.createMutationBatcher(state, doc, {
    schedule(fn) {
      scheduled = fn;
    },
  });
  const t = text('Automations', el('span', {}));
  batcher.enqueue(t);
  batcher.enqueue(t); // dedupe
  assert.strictEqual(batcher.pendingCount(), 1);
  assert.strictEqual(t.nodeValue, 'Automations');
  assert.ok(scheduled);
  scheduled();
  assert.strictEqual(t.nodeValue, '自动化');
  assert.strictEqual(state.mutationBatches, 1);
  assert.strictEqual(state.dynamicTranslationsApplied, 1);
});

// Performance / policy static gates
test('no setInterval / no attr observer / no full-body rescan helper', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'runtime', 'bootstrap.js'),
    'utf8',
  );
  assert.ok(!/\bsetInterval\b/.test(src));
  // Translation observer options must not include attributes
  assert.ok(src.includes('TRANSLATION_OBSERVER_OPTIONS = { childList: true, subtree: true }'));
  assert.ok(!/TRANSLATION_OBSERVER_OPTIONS = \{[^}]*attributes\s*:/.test(src));
  // processAddedNode must not call runSafetyScan(doc.body
  assert.ok(!/processAddedNode[\s\S]{0,400}runSafetyScan\(\s*doc\.body/.test(src));
  assert.strictEqual(safety.RUNTIME_PHASE, '2E.1');
});


test('3.22.7 thinking and ai dynamic text never translates', () => {
  const state = freshState();
  const thinking = text('New Chat', el('div', { 'data-message-kind': 'thinking' }));
  const ai = text('New Project', el('div', { 'data-message-role': 'ai' }));
  safety.processAddedNodes([thinking, ai], state, doc);
  assert.strictEqual(thinking.nodeValue, 'New Chat');
  assert.strictEqual(ai.nodeValue, 'New Project');
  assert.strictEqual(state.dynamicTranslationsApplied, 0);
  assert.strictEqual(state.skipCounts.message, 2);
});

console.log('OK ' + passed + ' mutation-exact tests');
