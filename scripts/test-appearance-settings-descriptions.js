#!/usr/bin/env node
'use strict';

const assert = require('assert');
const path = require('path');
const shared = require('./lib/glass-loader-shared');
const pack = shared.loadTranslationsPack(path.join(__dirname, '..'));
globalThis.__cursorAgentZhTranslations = pack;
delete globalThis.__cursorAgentZhRuntime;
const runtime = require('../runtime/bootstrap.js');

function el(tag, attrs, parent) {
  const node = {
    nodeType: 1,
    tagName: tag.toUpperCase(),
    className: attrs.className || '',
    attrs,
    parentNode: parent || null,
    childNodes: [],
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

function fixture(value, options = {}) {
  const body = el('body', { 'data-cursor-glass-mode': options.glass === false ? 'false' : 'true' });
  const panel = el('div', {
    'data-component': 'glass-settings-panel',
    'data-react-tab': options.tab || 'appearance',
  }, body);
  const row = el('div', { className: 'ui-field-group__entry' }, panel);
  const label = el('div', { className: 'ui-field-group__entry-label' }, row);
  text('主题', label);
  const description = el('div', { className: options.descriptionClass || 'ui-field-group__entry-description ui-random' }, row);
  const node = text(value, description);
  return { body, panel, row, label, description, node };
}

function doc() {
  return {
    createTreeWalker(root) {
      const nodes = [];
      function visit(n) {
        if (n.nodeType === 3) nodes.push(n);
        for (const child of n.childNodes || []) visit(child);
      }
      visit(root);
      let i = 0;
      return { nextNode: () => nodes[i++] || null };
    },
  };
}

const translations = {
  'Choose between light, dark, or high contrast themes': '选择浅色、深色或高对比度主题',
  'Adjust how much detail is shown for tool calls': '调整工具调用显示的详细程度',
  'Wrap long lines in Agent conversation code blocks': '让智能体对话中的代码块长行自动换行',
  'Minimize interface animations. System follows your OS preference.': '减少界面动画。设为 System 时遵循操作系统偏好。',
};
assert.strictEqual(runtime.RUNTIME_PHASE, '2C.1');
assert.strictEqual(pack.contextual.length, 18);

for (const [en, zh] of Object.entries(translations)) {
  const f = fixture('  ' + en + '  ');
  assert.strictEqual(runtime.matchesContextualWhen('appearance-settings-description', f.node), true);
  const result = runtime.tryApplyContextualTranslation(f.node);
  assert.strictEqual(result.key, en);
  assert.strictEqual(f.node.nodeValue, '  ' + zh + '  ');
}

for (const opts of [
  { glass: false },
  { tab: 'general' },
  { tab: 'chat' },
  { descriptionClass: 'ui-field-group__entry-label' },
]) {
  const f = fixture('Choose between light, dark, or high contrast themes', opts);
  assert.strictEqual(runtime.tryApplyContextualTranslation(f.node), null);
}
{
  const f = fixture('Choose between light, dark, or high contrast themes');
  const outside = text('Choose between light, dark, or high contrast themes', f.row);
  assert.strictEqual(runtime.tryApplyContextualTranslation(outside), null);
  const inLabel = text('Choose between light, dark, or high contrast themes', f.label);
  assert.strictEqual(runtime.tryApplyContextualTranslation(inLabel), null);
}
for (const attrs of [
  { 'data-message-kind': 'human' },
  { 'data-message-kind': 'thinking' },
  { 'data-message-kind': 'tool' },
  { 'data-message-role': 'ai' },
]) {
  const f = fixture('Choose between light, dark, or high contrast themes');
  const box = el('div', attrs, f.description);
  assert.strictEqual(runtime.tryApplyContextualTranslation(text('Choose between light, dark, or high contrast themes', box)), null);
}
{
  const f = fixture('Choose between light, dark, or high contrast themes');
  const code = el('code', {}, f.description);
  assert.strictEqual(runtime.tryApplyContextualTranslation(text('Choose between light, dark, or high contrast themes', code)), null);
  const editable = el('div', { contenteditable: 'true' }, f.description);
  assert.strictEqual(runtime.tryApplyContextualTranslation(text('Choose between light, dark, or high contrast themes', editable)), null);
  assert.strictEqual(runtime.tryApplyContextualTranslation(text('System', f.description)), null);
}
{
  const f = fixture('Choose between light, dark, or high contrast themes');
  const stats = runtime.runSafetyScan(f.body, doc(), { applyExact: true });
  assert.strictEqual(f.node.nodeValue, translations['Choose between light, dark, or high contrast themes']);
  assert.strictEqual(stats.contextualTranslationsApplied, 1);
}
{
  const f = fixture('Adjust how much detail is shown for tool calls');
  const state = { skipCounts: { message: 0, code: 0, editable: 0, empty: 0 } };
  runtime.processAddedNodes([f.row], state, doc());
  assert.strictEqual(f.node.nodeValue, translations['Adjust how much detail is shown for tool calls']);
  assert.strictEqual(state.dynamicContextualTranslationsApplied, 1);
}
console.log('OK Phase 2C.1 Appearance descriptions: scope, safety, scan, dynamic');
