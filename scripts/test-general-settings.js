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
function fixture(label, description, options = {}) {
  const body = el('body', { 'data-cursor-glass-mode': options.glass === false ? 'false' : 'true' });
  const panel = el('div', { 'data-component': 'glass-settings-panel', 'data-react-tab': options.tab || 'general' }, body);
  const row = el('div', { className: 'ui-field-group__entry' }, panel);
  const labelBox = el('div', { className: options.labelClass || 'ui-field-group__entry-label' }, row);
  const descriptionBox = el('div', { className: options.descriptionClass || 'ui-field-group__entry-description' }, row);
  return { body, panel, row, labelBox, descriptionBox, labelNode: text(label, labelBox), descriptionNode: text(description, descriptionBox) };
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

const pairs = [
  ['Tips', '提示', 'Show rotating tips on the empty screen', '在空白页面轮播使用提示'],
  ['Window Restoration', '窗口恢复', 'Controls which windows Cursor restores on startup', '控制 Cursor 启动时恢复哪些窗口'],
  ['System Notifications', '系统通知', 'Show system notifications when Agent completes or needs attention', '当智能体完成任务或需要关注时显示系统通知'],
  ['Warning Notifications', '警告通知', 'Show notifications for less urgent issues', '对不太紧急的问题显示通知'],
  ['Continue Interrupted Agents', '继续中断的智能体任务', 'Automatically resume working on agents and their subagents after a reload or restart', '重新加载或重启后，自动恢复智能体及其子智能体的任务'],
  ['System Tray Icon', '系统托盘图标', 'Show Cursor in system tray', '在系统托盘中显示 Cursor'],
  ['Completion Sound', '完成提示音', 'Play a sound when agents finish or need attention', '智能体完成任务或需要关注时播放提示音'],
];
assert.strictEqual(runtime.RUNTIME_PHASE, '2E.1');
assert.strictEqual(pack.contextual.length, 55);

for (const [enLabel, zhLabel, enDescription, zhDescription] of pairs) {
  const f = fixture('  ' + enLabel + '  ', '  ' + enDescription + '  ');
  assert.strictEqual(runtime.matchesContextualWhen('general-settings-label', f.labelNode), true);
  assert.strictEqual(runtime.matchesContextualWhen('general-settings-description', f.descriptionNode), true);
  assert.strictEqual(runtime.tryApplyContextualTranslation(f.labelNode).key, enLabel);
  assert.strictEqual(runtime.tryApplyContextualTranslation(f.descriptionNode).key, enDescription);
  assert.strictEqual(f.labelNode.nodeValue, '  ' + zhLabel + '  ');
  assert.strictEqual(f.descriptionNode.nodeValue, '  ' + zhDescription + '  ');
}
for (const opts of [
  { glass: false }, { tab: 'appearance' }, { tab: 'chat' },
  { labelClass: 'ui-field-group__entry-description', descriptionClass: 'ui-field-group__entry-label' },
]) {
  const f = fixture(pairs[0][0], pairs[0][2], opts);
  assert.strictEqual(runtime.tryApplyContextualTranslation(f.labelNode), null);
  assert.strictEqual(runtime.tryApplyContextualTranslation(f.descriptionNode), null);
}
{
  const f = fixture(pairs[0][0], pairs[0][2]);
  assert.strictEqual(runtime.tryApplyContextualTranslation(text('Tips', f.descriptionBox)), null);
  assert.strictEqual(runtime.tryApplyContextualTranslation(text(pairs[0][2], f.labelBox)), null);
  assert.strictEqual(runtime.tryApplyContextualTranslation(text('Tips', f.row)), null);
  assert.strictEqual(runtime.tryApplyContextualTranslation(text('System', f.row)), null);
}
for (const attrs of [
  { 'data-message-kind': 'human' }, { 'data-message-kind': 'thinking' },
  { 'data-message-kind': 'tool' }, { 'data-message-role': 'ai' },
]) {
  const f = fixture('Tips', pairs[0][2]);
  const message = el('div', attrs, f.labelBox);
  assert.strictEqual(runtime.tryApplyContextualTranslation(text('Tips', message)), null);
}
{
  const f = fixture('Tips', pairs[0][2]);
  const code = el('code', {}, f.descriptionBox);
  assert.strictEqual(runtime.tryApplyContextualTranslation(text(pairs[0][2], code)), null);
  const editable = el('div', { contenteditable: 'true' }, f.labelBox);
  assert.strictEqual(runtime.tryApplyContextualTranslation(text('Tips', editable)), null);
}
{
  const f = fixture('Tips', pairs[0][2]);
  const stats = runtime.runSafetyScan(f.body, doc(), { applyExact: true });
  assert.strictEqual(f.labelNode.nodeValue, '提示');
  assert.strictEqual(f.descriptionNode.nodeValue, pairs[0][3]);
  assert.strictEqual(stats.contextualTranslationsApplied, 2);
}
{
  const f = fixture('Warning Notifications', pairs[3][2]);
  const state = { skipCounts: { message: 0, code: 0, editable: 0, empty: 0 } };
  runtime.processAddedNodes([f.row], state, doc());
  assert.strictEqual(f.labelNode.nodeValue, '警告通知');
  assert.strictEqual(f.descriptionNode.nodeValue, pairs[3][3]);
  assert.strictEqual(state.dynamicContextualTranslationsApplied, 2);
}
console.log('OK Phase 2D.2 General settings: scope, safety, scan, dynamic');
