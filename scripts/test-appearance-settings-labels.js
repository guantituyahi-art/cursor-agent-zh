#!/usr/bin/env node
'use strict';

const assert = require('assert');
const path = require('path');
const shared = require('./lib/glass-loader-shared');

const pack = shared.loadTranslationsPack(path.join(__dirname, '..'));
globalThis.__cursorAgentZhTranslations = pack;
delete globalThis.__cursorAgentZhRuntime;
const runtime = require('../runtime/bootstrap.js');

function element(tag, attrs, parent) {
  const values = attrs || {};
  const node = {
    nodeType: 1,
    tagName: tag.toUpperCase(),
    className: values.className || '',
    parentNode: parent || null,
    childNodes: [],
    attrs: values,
    getAttribute(name) {
      return this.attrs[name] == null ? null : String(this.attrs[name]);
    },
  };
  if (parent) parent.childNodes.push(node);
  return node;
}

function text(value, parent) {
  const node = { nodeType: 3, nodeValue: value, parentNode: parent };
  parent.childNodes.push(node);
  return node;
}

function fixture(label, opts = {}) {
  const body = element('body', { 'data-cursor-glass-mode': opts.glass === false ? 'false' : 'true' });
  const panel = element('div', {
    'data-component': 'glass-settings-panel',
    'data-react-tab': opts.tab || 'appearance',
  }, body);
  const tab = element('div', { 'data-component': 'glass-settings-tab' }, panel);
  const row = element('div', { className: 'ui-field-group__entry ui-random' }, tab);
  const labelBox = element('div', { className: opts.labelClass || 'ui-field-group__entry-label ui-random' }, row);
  const span = element('span', {}, labelBox);
  const node = text(label, span);
  return { body, panel, row, labelBox, span, node };
}

function walkerDocument() {
  return {
    createTreeWalker(root) {
      const found = [];
      function visit(node) {
        if (node.nodeType === 3) found.push(node);
        for (const child of node.childNodes || []) visit(child);
      }
      visit(root);
      let index = 0;
      return { nextNode: () => found[index++] || null };
    },
  };
}

const wanted = {
  Theme: '主题',
  'Tool Call Density': '工具调用详情密度',
  'Code Block Word Wrap': '代码块自动换行',
  'Reduce Motion': '减少动画',
  'Themed Diff Backgrounds': '差异背景跟随主题',
  Hue: '色相',
  Intensity: '强度',
  'Reduce Transparency': '降低透明度',
  'UI Font Size': '界面字号',
  'Code Font Size': '代码字号',
  'UI Font Family': '界面字体',
  'Code Font Family': '代码字体',
  'Follow System High Contrast': '跟随系统高对比度',
};
assert.strictEqual(pack.runtimePhase, '2D.1');
assert.strictEqual(runtime.RUNTIME_PHASE, '2D.1');
assert.strictEqual(pack.contextual.length, 35);
assert.deepStrictEqual(Object.keys(pack.exact), ['New Chat', 'New Project', 'Automations']);

for (const [en, zh] of Object.entries(wanted)) {
  const f = fixture('  ' + en + '  ');
  assert.strictEqual(runtime.matchesContextualWhen('appearance-settings-label', f.node), true);
  const result = runtime.tryApplyContextualTranslation(f.node);
  assert.strictEqual(result.key, en);
  assert.strictEqual(f.node.nodeValue, '  ' + zh + '  ');
}

for (const options of [
  { glass: false },
  { tab: 'general' },
  { tab: 'chat' },
  { labelClass: 'ui-field-group__entry ui-random' },
]) {
  const f = fixture('Theme', options);
  assert.strictEqual(runtime.tryApplyContextualTranslation(f.node), null);
  assert.strictEqual(f.node.nodeValue, 'Theme');
}

{
  const f = fixture('Theme');
  const outside = text('Theme', f.row);
  assert.strictEqual(runtime.tryApplyContextualTranslation(outside), null);
  assert.strictEqual(outside.nodeValue, 'Theme');
}
{
  const f = fixture('Theme');
  const code = element('code', {}, f.labelBox);
  const codeText = text('Theme', code);
  assert.strictEqual(runtime.tryApplyContextualTranslation(codeText), null);
  assert.strictEqual(codeText.nodeValue, 'Theme');
}
for (const attrs of [
  { 'data-message-kind': 'human' },
  { 'data-message-kind': 'thinking' },
  { 'data-message-kind': 'tool' },
  { 'data-message-role': 'ai' },
]) {
  const f = fixture('Theme');
  const message = element('div', attrs, f.labelBox);
  const messageText = text('Theme', message);
  assert.strictEqual(runtime.tryApplyContextualTranslation(messageText), null);
}
{
  const f = fixture('Theme');
  const input = element('input', {}, f.labelBox);
  assert.strictEqual(runtime.tryApplyContextualTranslation(text('Theme', input)), null);
  const editable = element('div', { contenteditable: 'true' }, f.labelBox);
  assert.strictEqual(runtime.tryApplyContextualTranslation(text('Theme', editable)), null);
}
{
  const f = fixture('Theme');
  for (const value of ['Theme Preview', 'Choose between light, dark, or high contrast themes', 'Run Mode']) {
    const t = text(value, f.span);
    assert.strictEqual(runtime.tryApplyContextualTranslation(t), null);
    assert.strictEqual(t.nodeValue, value);
  }
}
{
  const f = fixture('Theme');
  const stats = runtime.runSafetyScan(f.body, walkerDocument(), { applyExact: true });
  assert.strictEqual(f.node.nodeValue, '主题');
  assert.strictEqual(stats.contextualTranslationsApplied, 1);
}
{
  const f = fixture('Reduce Motion');
  const state = { skipCounts: { message: 0, code: 0, editable: 0, empty: 0 } };
  runtime.processAddedNodes([f.row], state, walkerDocument());
  assert.strictEqual(f.node.nodeValue, '减少动画');
  assert.strictEqual(state.dynamicContextualTranslationsApplied, 1);
}

console.log('OK Phase 2B.2 Appearance label scope, safety, scan and dynamic tests');
