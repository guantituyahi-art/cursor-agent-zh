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
  const panel = el('div', { 'data-component': 'glass-settings-panel', 'data-react-tab': options.tab || 'chat' }, body);
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
  ['Default Environment', '默认环境', 'Where new agents start by default', '新建智能体默认启动的环境'],
  ['Default Model', '默认模型', 'What model new agents use by default', '新建智能体默认使用的模型'],
  ['Usage Summary', '用量摘要', 'When to show the usage summary at the bottom of the chat pane', '何时在聊天面板底部显示用量摘要'],
  ['Agent Autocomplete', '智能体提示词补全', 'Contextual suggestions while prompting Agent', '编写智能体提示词时提供上下文建议'],
  ['Legacy Terminal Tool', '旧版终端工具', 'Use the legacy terminal tool in agent mode, for use on systems with unsupported shell configurations', '在智能体模式下使用旧版终端工具，适用于不受支持的 Shell 配置'],
  ['New Messages', '新消息', 'Choose the default behavior of messages sent while Agent is working', '选择智能体工作时发送消息的默认处理方式'],
  ['Manually Sent Messages from Queue', '从队列手动发送的消息', 'Choose the default behavior of messages sent from the queue', '选择从队列发送消息时的默认处理方式'],
  ['Auto-Parse Links', '自动解析链接', 'Automatically parse links when pasted into Quick Edit (Ctrl+K) input', '将链接粘贴到快速编辑（Ctrl+K）输入框时自动解析'],
  ['Submit with Ctrl + Enter', '使用 Ctrl + Enter 提交', 'Ctrl+Enter submits chat, Enter inserts a newline, and primary actions move to Ctrl+Alt+Enter', 'Ctrl+Enter 提交聊天，Enter 插入换行，主要操作改用 Ctrl+Alt+Enter'],
  ['Voice Submit Keywords', '语音提交关键词', 'Custom words that submit a voice prompt. Spaces and punctuation are ignored.', '用于提交语音提示词的自定义词语；空格和标点符号会被忽略。'],
];
assert.strictEqual(runtime.RUNTIME_PHASE, '2F.3');
assert.strictEqual(pack.contextual.length, 75);
for (const [enLabel, zhLabel, enDescription, zhDescription] of pairs) {
  const f = fixture('  ' + enLabel + '  ', '  ' + enDescription + '  ');
  assert.strictEqual(runtime.matchesContextualWhen('agents-settings-label', f.labelNode), true);
  assert.strictEqual(runtime.matchesContextualWhen('agents-settings-description', f.descriptionNode), true);
  assert.strictEqual(runtime.tryApplyContextualTranslation(f.labelNode).key, enLabel);
  assert.strictEqual(runtime.tryApplyContextualTranslation(f.descriptionNode).key, enDescription);
  assert.strictEqual(f.labelNode.nodeValue, '  ' + zhLabel + '  ');
  assert.strictEqual(f.descriptionNode.nodeValue, '  ' + zhDescription + '  ');
}
for (const opts of [
  { glass: false }, { tab: 'general' }, { tab: 'appearance' },
  { labelClass: 'ui-field-group__entry-description', descriptionClass: 'ui-field-group__entry-label' },
]) {
  const f = fixture(pairs[0][0], pairs[0][2], opts);
  assert.strictEqual(runtime.tryApplyContextualTranslation(f.labelNode), null);
  assert.strictEqual(runtime.tryApplyContextualTranslation(f.descriptionNode), null);
}
{
  const f = fixture(pairs[0][0], pairs[0][2]);
  assert.strictEqual(runtime.tryApplyContextualTranslation(text('Default Environment', f.row)), null);
  assert.strictEqual(runtime.tryApplyContextualTranslation(text('Default Environment', f.descriptionBox)), null);
  assert.strictEqual(runtime.tryApplyContextualTranslation(text(pairs[0][2], f.labelBox)), null);
  assert.strictEqual(runtime.tryApplyContextualTranslation(text('Run Mode', f.labelBox)), null);
  assert.strictEqual(runtime.tryApplyContextualTranslation(text('Last Used', f.row)), null);
  assert.strictEqual(runtime.tryApplyContextualTranslation(text('Automatically parse links when pasted into Quick Edit (⌘K) input', f.descriptionBox)), null);
  assert.strictEqual(runtime.tryApplyContextualTranslation(text('Submit with ⌘ + Enter', f.labelBox)), null);
  assert.strictEqual(runtime.tryApplyContextualTranslation(text('submit', f.row)), null);
}
for (const attrs of [
  { 'data-message-kind': 'human' }, { 'data-message-kind': 'thinking' },
  { 'data-message-kind': 'tool' }, { 'data-message-role': 'ai' },
]) {
  const f = fixture(pairs[0][0], pairs[0][2]);
  const box = el('div', attrs, f.labelBox);
  assert.strictEqual(runtime.tryApplyContextualTranslation(text('Default Environment', box)), null);
}
{
  const f = fixture(pairs[0][0], pairs[0][2]);
  const code = el('code', {}, f.descriptionBox);
  assert.strictEqual(runtime.tryApplyContextualTranslation(text(pairs[0][2], code)), null);
  const editable = el('div', { contenteditable: 'true' }, f.labelBox);
  assert.strictEqual(runtime.tryApplyContextualTranslation(text('Default Environment', editable)), null);
  assert.strictEqual(runtime.tryApplyContextualTranslation(text('Voice Submit Keywords', editable)), null);
}
{
  const f = fixture(pairs[0][0], pairs[0][2]);
  const stats = runtime.runSafetyScan(f.body, doc(), { applyExact: true });
  assert.strictEqual(f.labelNode.nodeValue, pairs[0][1]);
  assert.strictEqual(f.descriptionNode.nodeValue, pairs[0][3]);
  assert.strictEqual(stats.contextualTranslationsApplied, 2);
}
{
  const f = fixture(pairs[4][0], pairs[4][2]);
  const state = { skipCounts: { message: 0, code: 0, editable: 0, empty: 0 } };
  runtime.processAddedNodes([f.row], state, doc());
  assert.strictEqual(f.labelNode.nodeValue, pairs[4][1]);
  assert.strictEqual(f.descriptionNode.nodeValue, pairs[4][3]);
  assert.strictEqual(state.dynamicContextualTranslationsApplied, 2);
}
console.log('OK Phase 2F.3 Agents settings: 10 rows, safety, scan, dynamic');
