/**
 * cursor-agent-zh — Phase 1D.2b.1 Sidebar Search Contextual Translation
 *
 * SOURCE OF TRUTH for runtime logic. Deploy builds install sidecar from:
 *   translations/zh-CN.json  (dictionary SoT)
 *   runtime/bootstrap.js     (this file — logic SoT)
 * → out/vs/workbench/cursor-agent-zh-bootstrap.js
 *
 * Phase 1D.2b.1: keep 1C/1D.1/1D.2a scan + one Glass-only MutationObserver
 * (childList+subtree). Pipeline: safety → exact → contextual → nodeValue.
 * Contextual "Search" → "搜索" only when ancestor has data-sidebar-menu-button.
 * No Keep/Undo/Review/other contextual words. No attributes. No characterData.
 * Dictionary is NEVER hard-coded here; read globalThis.__cursorAgentZhTranslations
 * injected by deploy (or tests).
 */
(function cursorAgentZhBootstrap(root) {
  'use strict';

  var LOG_PREFIX = '[cursor-agent-zh]';
  var RUNTIME_GUARD = '__cursorAgentZhRuntime';

  /** Message kind/role attribute values that mark chat bodies (never translate). */
  var MESSAGE_KINDS = { human: 1, assistant: 1, tool: 1 };

  /**
   * Element selectors / tags that permanently exclude a node and descendants
   * from translation candidates (code / terminal / monaco / codemirror).
   * Kept intentionally small — only stable, researched targets.
   */
  var CODE_TAG_SKIP = { PRE: 1, CODE: 1 };
  var CODE_CLASS_SUBSTRINGS = [
    'monaco-editor',
    'view-lines',
    'xterm',
    'cm-editor',
    'cm-content',
  ];

  // --- pure helpers (Node-testable with mock elements) ---

  function safeStr(v) {
    return v == null ? '' : String(v);
  }

  function getAttr(el, name) {
    if (!el) return null;
    if (typeof el.getAttribute === 'function') {
      try {
        return el.getAttribute(name);
      } catch (_) {
        return null;
      }
    }
    return null;
  }

  function tagNameOf(el) {
    if (!el || !el.tagName) return '';
    return String(el.tagName).toUpperCase();
  }

  function classNameOf(el) {
    var c = el && el.className;
    if (!c) return '';
    if (typeof c === 'string') return c;
    if (typeof c.baseVal === 'string') return c.baseVal;
    return safeStr(c);
  }

  function isElementNode(node) {
    return !!(node && node.nodeType === 1);
  }

  function isTextNode(node) {
    return !!(node && node.nodeType === 3);
  }

  /**
   * Glass / Agent Window scope. Prefer stable researched signal.
   * @param {Document} doc
   */
  function isGlassDocument(doc) {
    try {
      var body = doc && doc.body;
      if (!body) return false;
      return getAttr(body, 'data-cursor-glass-mode') === 'true';
    } catch (_) {
      return false;
    }
  }

  /**
   * True if element itself is a message-body container (human/assistant/tool).
   */
  function isMessageContainer(el) {
    if (!isElementNode(el)) return false;
    var kind = getAttr(el, 'data-message-kind');
    if (kind && MESSAGE_KINDS[kind]) return true;
    var role = getAttr(el, 'data-message-role');
    if (role && MESSAGE_KINDS[role]) return true;
    return false;
  }

  /**
   * True if element is code / editor / terminal chrome we must never touch.
   */
  function isCodeLikeElement(el) {
    if (!isElementNode(el)) return false;
    var tag = tagNameOf(el);
    if (CODE_TAG_SKIP[tag]) return true;
    var cls = classNameOf(el).toLowerCase();
    if (!cls) return false;
    for (var i = 0; i < CODE_CLASS_SUBSTRINGS.length; i++) {
      if (cls.indexOf(CODE_CLASS_SUBSTRINGS[i]) !== -1) return true;
    }
    return false;
  }

  /**
   * True if element is user-editable (inputs must never be rewritten).
   */
  function isEditableElement(el) {
    if (!isElementNode(el)) return false;
    var tag = tagNameOf(el);
    if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
    var ce = getAttr(el, 'contenteditable');
    if (ce && ce.toLowerCase() !== 'false') return true;
    try {
      if (el.isContentEditable === true) return true;
    } catch (_) {}
    return false;
  }

  /**
   * Walk ancestors (including self for elements; parent chain for text nodes)
   * and classify skip reason. Returns null if not skipped.
   *
   * @returns {'message'|'code'|'editable'|null}
   */
  function skipReasonForNode(node) {
    var el = isTextNode(node) ? node.parentNode : node;
    while (el && isElementNode(el)) {
      if (isMessageContainer(el)) return 'message';
      if (isCodeLikeElement(el)) return 'code';
      if (isEditableElement(el)) return 'editable';
      el = el.parentNode;
    }
    return null;
  }

  /**
   * Public invariant gate for future translators.
   * @returns {boolean} true = must NOT translate / must not be a candidate
   */
  function shouldSkipNode(node) {
    return skipReasonForNode(node) !== null;
  }

  /**
   * Text node eligible as a translation candidate (must pass invariants).
   */
  function isCandidateTextNode(node) {
    if (!isTextNode(node)) return false;
    var raw = node.nodeValue;
    if (raw == null) return false;
    // Non-empty after trim — still do not log the text.
    if (!String(raw).replace(/\s+/g, '').length) return false;
    return !shouldSkipNode(node);
  }

  var TRANSLATIONS_GLOBAL = '__cursorAgentZhTranslations';
  var RUNTIME_PHASE = '1D.2b.1';

  /**
   * Dictionary pack from deploy injection (or test harness). Never hard-coded.
   */
  function getTranslationsPack() {
    try {
      var pack = root[TRANSLATIONS_GLOBAL];
      if (!pack || typeof pack !== 'object') {
        return { exact: {} };
      }
      var exact = pack.exact;
      if (!exact || typeof exact !== 'object' || Array.isArray(exact)) {
        return { exact: {} };
      }
      return pack;
    } catch (_) {
      return { exact: {} };
    }
  }

  function getExactMap() {
    return getTranslationsPack().exact || {};
  }

  /**
   * Split outer whitespace; core must equal an exact key (full-string only).
   * @returns {{ key: string, next: string }|null}
   */
  function matchExactTranslation(raw) {
    if (raw == null) return null;
    var s = String(raw);
    var leadMatch = s.match(/^\s*/);
    var trailMatch = s.match(/\s*$/);
    var lead = leadMatch ? leadMatch[0] : '';
    var trail = trailMatch ? trailMatch[0] : '';
    if (lead.length + trail.length > s.length) {
      return null;
    }
    var core = s.slice(lead.length, s.length - trail.length);
    if (!core) return null;
    var map = getExactMap();
    if (!Object.prototype.hasOwnProperty.call(map, core)) return null;
    var zh = map[core];
    if (typeof zh !== 'string') return null;
    return { key: core, next: lead + zh + trail };
  }

  /**
   * Apply exact translation to a text node if candidate + exact hit.
   * Safety (shouldSkipNode) always wins.
   * @returns {{ key: string, applied: boolean, already?: boolean }|null}
   */
  function tryApplyExactTranslation(node) {
    if (!isTextNode(node)) return null;
    if (shouldSkipNode(node)) return null;
    var raw = node.nodeValue;
    if (raw == null) return null;
    if (!String(raw).replace(/\s+/g, '').length) return null;
    var hit = matchExactTranslation(raw);
    if (!hit) return null;
    if (raw === hit.next) {
      return { key: hit.key, applied: false, already: true };
    }
    try {
      node.nodeValue = hit.next;
    } catch (_) {
      return null;
    }
    return { key: hit.key, applied: true };
  }

  /**
   * Contextual rules from pack.contextual (safe empty if missing).
   * @returns {Array<{en:string,zh:string,when:string}>}
   */
  function getContextualRules() {
    try {
      var pack = getTranslationsPack();
      var list = pack && pack.contextual;
      if (!list || !Array.isArray(list)) return [];
      return list;
    } catch (_) {
      return [];
    }
  }

  /**
   * Walk ancestors; for text nodes start at parent.
   * True if any ancestor has attrName present (getAttribute != null).
   */
  function hasAncestorDataAttr(node, attrName) {
    if (!node || !attrName) return false;
    var cur = isTextNode(node) ? node.parentNode : node;
    var guard = 0;
    while (cur && guard < 64) {
      guard += 1;
      if (isElementNode(cur)) {
        var v = getAttr(cur, attrName);
        if (v != null) return true;
      }
      cur = cur.parentNode;
    }
    return false;
  }

  /**
   * Resolve semantic when-id to DOM predicate. Unknown → fail closed.
   */
  function matchesContextualWhen(when, node) {
    if (!when || !node) return false;
    if (when === 'sidebar-menu-button') {
      return hasAncestorDataAttr(node, 'data-sidebar-menu-button');
    }
    return false;
  }

  /**
   * Same whitespace split as exact; core must equal rule.en AND when matches.
   * @returns {{ key: string, next: string, when: string }|null}
   */
  function matchContextualTranslation(raw, node) {
    if (raw == null || !node) return null;
    var s = String(raw);
    var leadMatch = s.match(/^\s*/);
    var trailMatch = s.match(/\s*$/);
    var lead = leadMatch ? leadMatch[0] : '';
    var trail = trailMatch ? trailMatch[0] : '';
    if (lead.length + trail.length > s.length) {
      return null;
    }
    var core = s.slice(lead.length, s.length - trail.length);
    if (!core) return null;
    var rules = getContextualRules();
    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i];
      if (!rule || typeof rule.en !== 'string' || typeof rule.zh !== 'string') {
        continue;
      }
      if (typeof rule.when !== 'string') continue;
      if (core !== rule.en) continue;
      if (!matchesContextualWhen(rule.when, node)) continue;
      return { key: rule.en, next: lead + rule.zh + trail, when: rule.when };
    }
    return null;
  }

  /**
   * Apply contextual translation if safety allows + when matches.
   * NEVER translate Search (or any contextual en) without when match.
   * @returns {{ key: string, applied: boolean, already?: boolean, when?: string }|null}
   */
  function tryApplyContextualTranslation(node) {
    if (!isTextNode(node)) return null;
    if (shouldSkipNode(node)) return null;
    var raw = node.nodeValue;
    if (raw == null) return null;
    if (!String(raw).replace(/\s+/g, '').length) return null;
    var hit = matchContextualTranslation(raw, node);
    if (!hit) return null;
    if (raw === hit.next) {
      return { key: hit.key, applied: false, already: true, when: hit.when };
    }
    try {
      node.nodeValue = hit.next;
    } catch (_) {
      return null;
    }
    return { key: hit.key, applied: true, when: hit.when };
  }

  function emptyTranslationCounts() {
    var counts = {};
    var map = getExactMap();
    for (var k in map) {
      if (Object.prototype.hasOwnProperty.call(map, k)) counts[k] = 0;
    }
    return counts;
  }

  function emptyContextualTranslationCounts() {
    var counts = {};
    var rules = getContextualRules();
    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i];
      if (rule && typeof rule.en === 'string' && rule.en) {
        counts[rule.en] = 0;
      }
    }
    return counts;
  }

  /** Glass translation observer options — childList only (no attributes / characterData). */
  var TRANSLATION_OBSERVER_OPTIONS = { childList: true, subtree: true };

  function bumpTranslationCount(state, key) {
    if (!state.translationCounts) state.translationCounts = emptyTranslationCounts();
    if (Object.prototype.hasOwnProperty.call(state.translationCounts, key)) {
      state.translationCounts[key] += 1;
    } else {
      state.translationCounts[key] = 1;
    }
  }

  function bumpContextualTranslationCount(state, key) {
    if (!state.contextualTranslationCounts) {
      state.contextualTranslationCounts = emptyContextualTranslationCounts();
    }
    if (Object.prototype.hasOwnProperty.call(state.contextualTranslationCounts, key)) {
      state.contextualTranslationCounts[key] += 1;
    } else {
      state.contextualTranslationCounts[key] = 1;
    }
  }

  function mergeScanStatsIntoState(state, stats, asDynamic) {
    if (!stats) return;
    state.textNodesSeen = (state.textNodesSeen | 0) + (stats.textNodesSeen | 0);
    state.candidateCount = (state.candidateCount | 0) + (stats.candidateCount | 0);
    if (!state.skipCounts) {
      state.skipCounts = { message: 0, code: 0, editable: 0, empty: 0 };
    }
    state.skipCounts.message =
      (state.skipCounts.message | 0) + (stats.skippedMessage | 0);
    state.skipCounts.code =
      (state.skipCounts.code | 0) + (stats.skippedCode | 0);
    state.skipCounts.editable =
      (state.skipCounts.editable | 0) + (stats.skippedEditable | 0);
    state.skipCounts.empty =
      (state.skipCounts.empty | 0) + (stats.skippedEmpty | 0);
    state.exactMatches = (state.exactMatches | 0) + (stats.exactMatches | 0);
    state.translationsApplied =
      (state.translationsApplied | 0) + (stats.translationsApplied | 0);
    state.contextualMatches =
      (state.contextualMatches | 0) + (stats.contextualMatches | 0);
    state.contextualTranslationsApplied =
      (state.contextualTranslationsApplied | 0) +
      (stats.contextualTranslationsApplied | 0);
    if (asDynamic) {
      state.dynamicExactMatches =
        (state.dynamicExactMatches | 0) + (stats.exactMatches | 0);
      state.dynamicTranslationsApplied =
        (state.dynamicTranslationsApplied | 0) + (stats.translationsApplied | 0);
      state.dynamicContextualMatches =
        (state.dynamicContextualMatches | 0) + (stats.contextualMatches | 0);
      state.dynamicContextualTranslationsApplied =
        (state.dynamicContextualTranslationsApplied | 0) +
        (stats.contextualTranslationsApplied | 0);
    }
    var src = stats.translationCounts || {};
    for (var k in src) {
      if (!Object.prototype.hasOwnProperty.call(src, k)) continue;
      if (!state.translationCounts) state.translationCounts = emptyTranslationCounts();
      if (Object.prototype.hasOwnProperty.call(state.translationCounts, k)) {
        state.translationCounts[k] += src[k] | 0;
      } else {
        state.translationCounts[k] = src[k] | 0;
      }
    }
    var csrc = stats.contextualTranslationCounts || {};
    for (var ck in csrc) {
      if (!Object.prototype.hasOwnProperty.call(csrc, ck)) continue;
      if (!state.contextualTranslationCounts) {
        state.contextualTranslationCounts = emptyContextualTranslationCounts();
      }
      if (Object.prototype.hasOwnProperty.call(state.contextualTranslationCounts, ck)) {
        state.contextualTranslationCounts[ck] += csrc[ck] | 0;
      } else {
        state.contextualTranslationCounts[ck] = csrc[ck] | 0;
      }
    }
  }

  /**
   * Record one exact try result onto cumulative (+ optional dynamic) counters.
   * already-translated nodes do not bump translationsApplied (loop-safe).
   */
  function recordExactResult(state, result, asDynamic) {
    if (!result || !result.key) return;
    state.exactMatches = (state.exactMatches | 0) + 1;
    bumpTranslationCount(state, result.key);
    if (asDynamic) {
      state.dynamicExactMatches = (state.dynamicExactMatches | 0) + 1;
    }
    if (result.applied) {
      state.translationsApplied = (state.translationsApplied | 0) + 1;
      if (asDynamic) {
        state.dynamicTranslationsApplied =
          (state.dynamicTranslationsApplied | 0) + 1;
      }
    }
  }

  /**
   * Record one contextual try result (+ optional dynamic counters).
   * already-translated nodes do not bump contextualTranslationsApplied.
   */
  function recordContextualResult(state, result, asDynamic) {
    if (!result || !result.key) return;
    state.contextualMatches = (state.contextualMatches | 0) + 1;
    bumpContextualTranslationCount(state, result.key);
    if (asDynamic) {
      state.dynamicContextualMatches =
        (state.dynamicContextualMatches | 0) + 1;
    }
    if (result.applied) {
      state.contextualTranslationsApplied =
        (state.contextualTranslationsApplied | 0) + 1;
      if (asDynamic) {
        state.dynamicContextualTranslationsApplied =
          (state.dynamicContextualTranslationsApplied | 0) + 1;
      }
    }
  }

  /**
   * Incremental: one added Text / Element / DocumentFragment.
   * Always reuses shouldSkipNode + exact then contextual / runSafetyScan.
   * Never rescans document.body.
   */
  function processAddedNode(node, state, doc) {
    if (!node || !state) return;
    state.mutatedNodesSeen = (state.mutatedNodesSeen | 0) + 1;

    if (isTextNode(node)) {
      var raw = node.nodeValue;
      var empty = raw == null || !String(raw).replace(/\s+/g, '').length;
      if (empty) {
        state.skipCounts.empty = (state.skipCounts.empty | 0) + 1;
        return;
      }
      var reason = skipReasonForNode(node);
      if (reason === 'message') {
        state.skipCounts.message = (state.skipCounts.message | 0) + 1;
        return;
      }
      if (reason === 'code') {
        state.skipCounts.code = (state.skipCounts.code | 0) + 1;
        return;
      }
      if (reason === 'editable') {
        state.skipCounts.editable = (state.skipCounts.editable | 0) + 1;
        return;
      }
      state.candidateCount = (state.candidateCount | 0) + 1;
      var exactHit = tryApplyExactTranslation(node);
      if (exactHit && exactHit.key) {
        recordExactResult(state, exactHit, true);
      } else {
        recordContextualResult(state, tryApplyContextualTranslation(node), true);
      }
      return;
    }

    // Element (1) or DocumentFragment (11): scan only this subtree.
    var nt = node.nodeType;
    if (nt === 1 || nt === 11) {
      var stats = runSafetyScan(node, doc, { applyExact: true });
      mergeScanStatsIntoState(state, stats, true);
    }
  }

  function processAddedNodes(nodes, state, doc) {
    if (!nodes || !nodes.length) return;
    for (var i = 0; i < nodes.length; i++) {
      processAddedNode(nodes[i], state, doc);
    }
  }

  /**
   * Lightweight microtask batching + per-node dedupe.
   */
  function createMutationBatcher(state, doc, hooks) {
    hooks = hooks || {};
    var pending = [];
    var pendingSet = typeof Set !== 'undefined' ? new Set() : null;
    var scheduled = false;
    var schedule =
      hooks.schedule ||
      function (fn) {
        if (typeof queueMicrotask === 'function') {
          queueMicrotask(fn);
        } else if (typeof Promise !== 'undefined') {
          Promise.resolve().then(fn);
        } else {
          setTimeout(fn, 0);
        }
      };

    function flush() {
      scheduled = false;
      if (!pending.length) return;
      var nodes = pending;
      pending = [];
      if (pendingSet) pendingSet.clear();
      state.mutationBatches = (state.mutationBatches | 0) + 1;
      processAddedNodes(nodes, state, doc);
    }

    function enqueue(node) {
      if (!node) return;
      if (pendingSet) {
        if (pendingSet.has(node)) return;
        pendingSet.add(node);
      }
      pending.push(node);
      if (!scheduled) {
        scheduled = true;
        schedule(flush);
      }
    }

    return {
      enqueue: enqueue,
      flushSync: flush,
      pendingCount: function () {
        return pending.length;
      },
    };
  }

  /**
   * Attach at most one translation MutationObserver on confirmed Glass docs.
   * Observes body (narrowest stable root available) with childList+subtree only.
   */
  function attachTranslationObserver(state, doc, hooks) {
    hooks = hooks || {};
    if (!state || state.observerAttached) {
      return state && state.translationObserver ? state.translationObserver : null;
    }
    if (!state.isGlass) return null;
    var MO = hooks.MutationObserver;
    if (MO == null && typeof MutationObserver !== 'undefined') {
      MO = MutationObserver;
    }
    if (typeof MO !== 'function') {
      state.observerAttached = false;
      return null;
    }
    if (!doc) return null;
    var observeRoot = doc.body || doc.documentElement;
    if (!observeRoot) return null;

    var batcher = createMutationBatcher(state, doc, hooks);
    state.mutationBatcher = batcher;

    var obs = new MO(function (records) {
      if (!records || !records.length) return;
      for (var i = 0; i < records.length; i++) {
        var rec = records[i];
        var added = rec && rec.addedNodes;
        if (!added || !added.length) continue;
        for (var j = 0; j < added.length; j++) {
          batcher.enqueue(added[j]);
        }
      }
    });

    try {
      obs.observe(observeRoot, TRANSLATION_OBSERVER_OPTIONS);
    } catch (_) {
      state.observerAttached = false;
      state.translationObserver = null;
      return null;
    }

    state.translationObserver = obs;
    state.observerAttached = true;
    return obs;
  }

  /**
   * TreeWalker scan: classify + exact then contextual apply on safe candidates.
   * @param {ParentNode} rootEl
   * @param {Document} doc
   * @param {{ applyExact?: boolean }} [opts]
   */
  function runSafetyScan(rootEl, doc, opts) {
    opts = opts || {};
    var applyExact = opts.applyExact !== false;
    var stats = {
      textNodesSeen: 0,
      candidateCount: 0,
      skippedMessage: 0,
      skippedCode: 0,
      skippedEditable: 0,
      skippedEmpty: 0,
      exactMatches: 0,
      translationsApplied: 0,
      translationCounts: emptyTranslationCounts(),
      contextualMatches: 0,
      contextualTranslationsApplied: 0,
      contextualTranslationCounts: emptyContextualTranslationCounts(),
    };

    if (!rootEl || !doc || typeof doc.createTreeWalker !== 'function') {
      return stats;
    }

    var SHOW_TEXT = (typeof Node !== 'undefined' && Node.TEXT_NODE) ? 4 : 4;
    var walker;
    try {
      walker = doc.createTreeWalker(rootEl, SHOW_TEXT, null);
    } catch (_) {
      return stats;
    }

    var node = walker.nextNode();
    while (node) {
      stats.textNodesSeen += 1;
      var raw = node.nodeValue;
      var empty =
        raw == null || !String(raw).replace(/\s+/g, '').length;
      if (empty) {
        stats.skippedEmpty += 1;
      } else {
        var reason = skipReasonForNode(node);
        if (reason === 'message') stats.skippedMessage += 1;
        else if (reason === 'code') stats.skippedCode += 1;
        else if (reason === 'editable') stats.skippedEditable += 1;
        else {
          stats.candidateCount += 1;
          if (applyExact) {
            var result = tryApplyExactTranslation(node);
            if (result && result.key) {
              stats.exactMatches += 1;
              if (result.applied) stats.translationsApplied += 1;
              if (
                Object.prototype.hasOwnProperty.call(
                  stats.translationCounts,
                  result.key,
                )
              ) {
                stats.translationCounts[result.key] += 1;
              } else {
                stats.translationCounts[result.key] = 1;
              }
            } else {
              var cresult = tryApplyContextualTranslation(node);
              if (cresult && cresult.key) {
                stats.contextualMatches += 1;
                if (cresult.applied) {
                  stats.contextualTranslationsApplied += 1;
                }
                if (
                  Object.prototype.hasOwnProperty.call(
                    stats.contextualTranslationCounts,
                    cresult.key,
                  )
                ) {
                  stats.contextualTranslationCounts[cresult.key] += 1;
                } else {
                  stats.contextualTranslationCounts[cresult.key] = 1;
                }
              }
            }
          }
        }
      }
      node = walker.nextNode();
    }
    return stats;
  }

  function emptyStatus() {
    return {
      initialized: false,
      isGlass: false,
      scanCompleted: false,
      skippedNotGlass: false,
      waitingForGlass: false,
      scopeSettled: false,
      textNodesSeen: 0,
      candidateCount: 0,
      skipCounts: {
        message: 0,
        code: 0,
        editable: 0,
        empty: 0,
      },
      exactMatches: 0,
      translationsApplied: 0,
      translationCounts: emptyTranslationCounts(),
      contextualMatches: 0,
      contextualTranslationsApplied: 0,
      contextualTranslationCounts: emptyContextualTranslationCounts(),
      observerAttached: false,
      mutationBatches: 0,
      mutatedNodesSeen: 0,
      dynamicExactMatches: 0,
      dynamicTranslationsApplied: 0,
      dynamicContextualMatches: 0,
      dynamicContextualTranslationsApplied: 0,
      translationObserver: null,
      mutationBatcher: null,
      phase: '1d.2b.1-sidebar-contextual',
      runtimePhase: RUNTIME_PHASE,
      translates: true,
    };
  }

  /** Bounded wait for body[data-cursor-glass-mode="true"] (Agents Window sets it after bootstrap may load). */
  var GLASS_WAIT_MS = 8000;
  var GLASS_POLL_MS = 50;
  var GLASS_ATTR = 'data-cursor-glass-mode';

  function buildApi(state) {
    return {
      getStatus: function getStatus() {
        var counts = {};
        var src = state.translationCounts || {};
        for (var k in src) {
          if (Object.prototype.hasOwnProperty.call(src, k)) {
            counts[k] = src[k] | 0;
          }
        }
        var ccounts = {};
        var csrc = state.contextualTranslationCounts || {};
        for (var ck in csrc) {
          if (Object.prototype.hasOwnProperty.call(csrc, ck)) {
            ccounts[ck] = csrc[ck] | 0;
          }
        }
        return {
          initialized: !!state.initialized,
          isGlass: !!state.isGlass,
          scanCompleted: !!state.scanCompleted,
          skippedNotGlass: !!state.skippedNotGlass,
          waitingForGlass: !!state.waitingForGlass,
          scopeSettled: !!state.scopeSettled,
          textNodesSeen: state.textNodesSeen | 0,
          candidateCount: state.candidateCount | 0,
          skipCounts: {
            message: (state.skipCounts && state.skipCounts.message) | 0,
            code: (state.skipCounts && state.skipCounts.code) | 0,
            editable: (state.skipCounts && state.skipCounts.editable) | 0,
            empty: (state.skipCounts && state.skipCounts.empty) | 0,
          },
          exactMatches: state.exactMatches | 0,
          translationsApplied: state.translationsApplied | 0,
          translationCounts: counts,
          contextualMatches: state.contextualMatches | 0,
          contextualTranslationsApplied:
            state.contextualTranslationsApplied | 0,
          contextualTranslationCounts: ccounts,
          observerAttached: !!state.observerAttached,
          mutationBatches: state.mutationBatches | 0,
          mutatedNodesSeen: state.mutatedNodesSeen | 0,
          dynamicExactMatches: state.dynamicExactMatches | 0,
          dynamicTranslationsApplied: state.dynamicTranslationsApplied | 0,
          dynamicContextualMatches: state.dynamicContextualMatches | 0,
          dynamicContextualTranslationsApplied:
            state.dynamicContextualTranslationsApplied | 0,
          phase: state.phase,
          runtimePhase: state.runtimePhase || RUNTIME_PHASE,
          translates: true,
        };
      },
      shouldSkipNode: shouldSkipNode,
      isGlassDocument: isGlassDocument,
      isCandidateTextNode: isCandidateTextNode,
      matchExactTranslation: matchExactTranslation,
      tryApplyExactTranslation: tryApplyExactTranslation,
      matchContextualTranslation: matchContextualTranslation,
      tryApplyContextualTranslation: tryApplyContextualTranslation,
      getContextualRules: getContextualRules,
      matchesContextualWhen: matchesContextualWhen,
      processAddedNodes: function (nodes) {
        processAddedNodes(nodes, state, typeof document !== 'undefined' ? document : null);
      },
      attachTranslationObserver: function (doc, hooks) {
        return attachTranslationObserver(state, doc, hooks || {});
      },
    };
  }

  function logSafetyAudit(state) {
    try {
      console.log(
        LOG_PREFIX + ' safety audit',
        '\nGlass: ' + state.isGlass,
        '\nruntimePhase: ' + (state.runtimePhase || RUNTIME_PHASE),
        '\ntextNodesSeen: ' + state.textNodesSeen,
        '\ncandidates: ' + state.candidateCount,
        '\nskippedMessage: ' + state.skipCounts.message,
        '\nskippedCode: ' + state.skipCounts.code,
        '\nskippedEditable: ' + state.skipCounts.editable,
        '\nskippedEmpty: ' + state.skipCounts.empty,
        '\nexactMatches: ' + (state.exactMatches | 0),
        '\ntranslationsApplied: ' + (state.translationsApplied | 0),
        '\ncontextualMatches: ' + (state.contextualMatches | 0),
        '\ncontextualTranslationsApplied: ' +
          (state.contextualTranslationsApplied | 0),
        '\nobserverAttached: ' + !!state.observerAttached,
        '\ndynamicExactMatches: ' + (state.dynamicExactMatches | 0),
        '\ndynamicContextualMatches: ' +
          (state.dynamicContextualMatches | 0),
      );
    } catch (_) {}
  }

  /**
   * Classify current Glass attribute without treating "missing" as final.
   * @returns {'glass'|'not-glass'|'pending'}
   */
  function classifyGlassScope(doc) {
    try {
      if (!doc) return 'pending';
      var body = doc.body;
      if (!body) return 'pending';
      var v = getAttr(body, GLASS_ATTR);
      if (v === 'true') return 'glass';
      // Explicit false (if ever set) is settled non-Glass; missing stays pending until timeout.
      if (v === 'false') return 'not-glass';
      return 'pending';
    } catch (_) {
      return 'pending';
    }
  }

  function completeAsGlass(state, doc) {
    state.isGlass = true;
    state.waitingForGlass = false;
    state.skippedNotGlass = false;
    state.runtimePhase = RUNTIME_PHASE;
    state.phase = '1d.2b.1-sidebar-contextual';
    var stats = runSafetyScan(doc.body || doc.documentElement, doc, {
      applyExact: true,
    });
    state.textNodesSeen = stats.textNodesSeen;
    state.candidateCount = stats.candidateCount;
    state.skipCounts.message = stats.skippedMessage;
    state.skipCounts.code = stats.skippedCode;
    state.skipCounts.editable = stats.skippedEditable;
    state.skipCounts.empty = stats.skippedEmpty;
    state.exactMatches = stats.exactMatches;
    state.translationsApplied = stats.translationsApplied;
    state.translationCounts = stats.translationCounts;
    state.contextualMatches = stats.contextualMatches;
    state.contextualTranslationsApplied = stats.contextualTranslationsApplied;
    state.contextualTranslationCounts = stats.contextualTranslationCounts;
    state.scanCompleted = true;
    state.scopeSettled = true;
    state.initialized = true;
    // Phase 1D.2a: supplement (not replace) the one-shot scan.
    attachTranslationObserver(state, doc);
    logSafetyAudit(state);
  }

  function completeAsNotGlass(state) {
    state.isGlass = false;
    state.waitingForGlass = false;
    state.skippedNotGlass = true;
    state.scanCompleted = false;
    state.scopeSettled = true;
    state.initialized = true;
    try {
      console.log(LOG_PREFIX + ' skipped: not Glass');
    } catch (_) {}
  }

  /**
   * Bounded wait helper (testable with injected schedule/now).
   * Does not permanently settle until glass | timeout | explicit false.
   */
  function startGlassScopeWait(doc, state, hooks) {
    hooks = hooks || {};
    var waitMs = hooks.waitMs != null ? hooks.waitMs : GLASS_WAIT_MS;
    var pollMs = hooks.pollMs != null ? hooks.pollMs : GLASS_POLL_MS;
    var setTimeoutFn = hooks.setTimeout || setTimeout;
    var clearTimeoutFn = hooks.clearTimeout || clearTimeout;
    var nowFn = hooks.now || Date.now;
    var started = nowFn();
    var settled = false;
    var timerIds = [];
    var observer = null;

    function cleanup() {
      for (var i = 0; i < timerIds.length; i++) {
        try {
          clearTimeoutFn(timerIds[i]);
        } catch (_) {}
      }
      timerIds = [];
      if (observer) {
        try {
          observer.disconnect();
        } catch (_) {}
        observer = null;
      }
    }

    function settle(kind) {
      if (settled || state.scopeSettled) return;
      settled = true;
      cleanup();
      try {
        if (kind === 'glass') completeAsGlass(state, doc);
        else completeAsNotGlass(state);
      } catch (err) {
        state.waitingForGlass = false;
        state.scopeSettled = true;
        state.initialized = true;
        try {
          console.error(LOG_PREFIX + ' runtime init error', err);
        } catch (_) {}
      }
    }

    function tick() {
      if (settled || state.scopeSettled) return;
      var kind = classifyGlassScope(doc);
      if (kind === 'glass') {
        settle('glass');
        return;
      }
      if (kind === 'not-glass') {
        settle('not-glass');
        return;
      }
      if (nowFn() - started >= waitMs) {
        settle('not-glass');
        return;
      }
    }

    state.waitingForGlass = true;
    state.initialized = false;
    state.scopeSettled = false;
    state.skippedNotGlass = false;

    // Immediate check (may already be Glass).
    tick();
    if (settled) return { cleanup: cleanup, settle: settle };

    // Attribute observer — lifecycle only; not a translation MutationObserver.
    try {
      if (doc && typeof MutationObserver === 'function') {
        observer = new MutationObserver(function () {
          tick();
        });
        var obsTarget = doc.documentElement || doc;
        observer.observe(obsTarget, {
          attributes: true,
          attributeFilter: [GLASS_ATTR],
          subtree: true,
          childList: true,
        });
      }
    } catch (_) {
      observer = null;
    }

    // Polling backup (covers environments without MutationObserver).
    function schedulePoll() {
      if (settled || state.scopeSettled) return;
      var id = setTimeoutFn(function () {
        tick();
        if (!settled && !state.scopeSettled) schedulePoll();
      }, pollMs);
      timerIds.push(id);
    }
    schedulePoll();

    // Hard deadline.
    timerIds.push(
      setTimeoutFn(function () {
        tick();
        if (!settled && !state.scopeSettled) settle('not-glass');
      }, waitMs),
    );

    return { cleanup: cleanup, settle: settle, tick: tick };
  }

  function runInit(doc, hooks) {
    var existing = root[RUNTIME_GUARD];
    if (existing && existing.__booted) {
      // Idempotent: same page must not start a second wait/scan.
      return existing;
    }

    var state = emptyStatus();
    state.phase = '1d.2b.1-sidebar-contextual';
    state.runtimePhase = RUNTIME_PHASE;
    var api = buildApi(state);
    api.__booted = true;
    api.__state = state;
    root[RUNTIME_GUARD] = api;

    try {
      var kind = classifyGlassScope(doc);
      if (kind === 'glass') {
        completeAsGlass(state, doc);
        return api;
      }
      if (kind === 'not-glass') {
        completeAsNotGlass(state);
        return api;
      }
      // Pending: do NOT set initialized / skippedNotGlass yet.
      startGlassScopeWait(doc, state, hooks || {});
      try {
        console.log(LOG_PREFIX + ' waiting for Glass scope');
      } catch (_) {}
      return api;
    } catch (err) {
      state.waitingForGlass = false;
      state.scopeSettled = true;
      state.initialized = true;
      try {
        console.error(LOG_PREFIX + ' runtime init error', err);
      } catch (_) {}
      return api;
    }
  }

  function whenDomReady(doc, fn) {
    try {
      if (!doc) {
        fn();
        return;
      }
      if (doc.readyState === 'loading') {
        doc.addEventListener(
          'DOMContentLoaded',
          function onReady() {
            try {
              fn();
            } catch (e) {
              try {
                console.error(LOG_PREFIX + ' runtime error', e);
              } catch (_) {}
            }
          },
          { once: true },
        );
      } else {
        fn();
      }
    } catch (e) {
      try {
        console.error(LOG_PREFIX + ' runtime error', e);
      } catch (_) {}
    }
  }

  // --- browser entry ---
  function startBrowser() {
    try {
      console.log(LOG_PREFIX + ' runtime loaded');
    } catch (_) {}
    var doc = typeof document !== 'undefined' ? document : null;
    whenDomReady(doc, function () {
      try {
        runInit(doc);
      } catch (e) {
        try {
          console.error(LOG_PREFIX + ' runtime error', e);
        } catch (_) {}
      }
    });
  }

  // Node / test exports (no auto-init when required from Node)
  var exported = {
    MESSAGE_KINDS: MESSAGE_KINDS,
    CODE_CLASS_SUBSTRINGS: CODE_CLASS_SUBSTRINGS.slice(),
    GLASS_WAIT_MS: GLASS_WAIT_MS,
    GLASS_ATTR: GLASS_ATTR,
    TRANSLATIONS_GLOBAL: TRANSLATIONS_GLOBAL,
    RUNTIME_PHASE: RUNTIME_PHASE,
    isGlassDocument: isGlassDocument,
    classifyGlassScope: classifyGlassScope,
    isMessageContainer: isMessageContainer,
    isCodeLikeElement: isCodeLikeElement,
    isEditableElement: isEditableElement,
    skipReasonForNode: skipReasonForNode,
    shouldSkipNode: shouldSkipNode,
    isCandidateTextNode: isCandidateTextNode,
    getTranslationsPack: getTranslationsPack,
    getExactMap: getExactMap,
    matchExactTranslation: matchExactTranslation,
    tryApplyExactTranslation: tryApplyExactTranslation,
    getContextualRules: getContextualRules,
    hasAncestorDataAttr: hasAncestorDataAttr,
    matchesContextualWhen: matchesContextualWhen,
    matchContextualTranslation: matchContextualTranslation,
    tryApplyContextualTranslation: tryApplyContextualTranslation,
    runSafetyScan: runSafetyScan,
    processAddedNode: processAddedNode,
    processAddedNodes: processAddedNodes,
    createMutationBatcher: createMutationBatcher,
    attachTranslationObserver: attachTranslationObserver,
    TRANSLATION_OBSERVER_OPTIONS: TRANSLATION_OBSERVER_OPTIONS,
    runInit: runInit,
    startGlassScopeWait: startGlassScopeWait,
    RUNTIME_GUARD: RUNTIME_GUARD,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exported;
  }

  var isBrowser =
    typeof document !== 'undefined' &&
    typeof window !== 'undefined' &&
    root === window;

  if (isBrowser) {
    startBrowser();
  }

  return exported;
})(
  typeof globalThis !== 'undefined'
    ? globalThis
    : typeof window !== 'undefined'
      ? window
      : typeof global !== 'undefined'
        ? global
        : this,
);
