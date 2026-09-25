#!/usr/bin/env node
'use strict';

const assert = require('assert');
const path = require('path');
const shared = require('./lib/glass-loader-shared');
const pack = shared.loadTranslationsPack(path.join(__dirname, '..'));
globalThis.__cursorAgentZhTranslations = pack;
delete globalThis.__cursorAgentZhRuntime;
const runtime = require('../runtime/bootstrap.js');

function el(tag, attrs = {}, parent) {
  const node = {
    nodeType: 1, tagName: tag.toUpperCase(), className: attrs.className || '',
    attrs, parentNode: parent || null, childNodes: [],
    getAttribute(name) { return this.attrs[name] == null ? null : String(this.attrs[name]); },
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
  const sidebar = el('div', { 'data-component': options.component || 'glass-settings-sidebar' }, body);
  const button = el('div', { className: 'ui-sidebar-menu-button', role: 'button' }, sidebar);
  const label = el('span', { className: options.labelClass || 'ui-sidebar-menu-button-label' }, button);
  const node = text(value, label);
  return { body, sidebar, button, label, node };
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
const names = {
  General: '常规',
  Profile: '个人资料',
  Appearance: '外观',
  'Plan & Usage': '套餐与用量',
  Agents: '智能体',
  'Cloud Agents': '云端智能体',
  Models: '模型',
  'Git & PRs': 'Git 与拉取请求',
  Worktrees: '工作树',
  'Browser & Network': '浏览器与网络',
  Tab: '标签页',
  'Code Intelligence': '代码智能',
  Beta: '测试版',
  Docs: '文档',
};
assert.strictEqual(runtime.RUNTIME_PHASE, '2E.1');
assert.strictEqual(pack.contextual.length, 55);
for (const [en, zh] of Object.entries(names)) {
  const f = fixture('  ' + en + '  ');
  assert.strictEqual(runtime.matchesContextualWhen('settings-sidebar-label', f.node), true);
  assert.strictEqual(runtime.tryApplyContextualTranslation(f.node).key, en);
  assert.strictEqual(f.node.nodeValue, '  ' + zh + '  ');
}
for (const opts of [
  { glass: false },
  { component: 'workspace-sidebar' },
  { component: 'glass-settings-panel' },
  { labelClass: 'ui-sidebar-menu-button-content' },
]) {
  const f = fixture('General', opts);
  assert.strictEqual(runtime.tryApplyContextualTranslation(f.node), null);
  assert.strictEqual(f.node.nodeValue, 'General');
}
{
  const f = fixture('General');
  assert.strictEqual(runtime.tryApplyContextualTranslation(text('General', f.button)), null);
  assert.strictEqual(runtime.tryApplyContextualTranslation(text('General', f.sidebar)), null);
  assert.strictEqual(runtime.tryApplyContextualTranslation(text('Back', f.label)), null);
  assert.strictEqual(runtime.tryApplyContextualTranslation(text('Search Settings', f.label)), null);
}
for (const attrs of [
  { 'data-message-kind': 'human' }, { 'data-message-kind': 'thinking' },
  { 'data-message-kind': 'tool' }, { 'data-message-role': 'ai' },
]) {
  const f = fixture('General');
  const box = el('div', attrs, f.label);
  assert.strictEqual(runtime.tryApplyContextualTranslation(text('General', box)), null);
}
{
  const f = fixture('General');
  const code = el('code', {}, f.label);
  assert.strictEqual(runtime.tryApplyContextualTranslation(text('General', code)), null);
  const editable = el('div', { contenteditable: 'true' }, f.label);
  assert.strictEqual(runtime.tryApplyContextualTranslation(text('General', editable)), null);
}
{
  const f = fixture('General');
  const stats = runtime.runSafetyScan(f.body, doc(), { applyExact: true });
  assert.strictEqual(f.node.nodeValue, '常规');
  assert.strictEqual(stats.contextualTranslationsApplied, 1);
}
{
  const f = fixture('Worktrees');
  const state = { skipCounts: { message: 0, code: 0, editable: 0, empty: 0 } };
  runtime.processAddedNodes([f.sidebar], state, doc());
  assert.strictEqual(f.node.nodeValue, '工作树');
  assert.strictEqual(state.dynamicContextualTranslationsApplied, 1);
}
console.log('OK Phase 2E.1 Settings sidebar: 14 labels, safety, scan, dynamic');
