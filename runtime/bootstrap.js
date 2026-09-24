/**
 * cursor-agent-zh — Phase 1C Runtime Safety Skeleton
 *
 * SOURCE OF TRUTH for runtime. Deploy copies this file to:
 *   out/vs/workbench/cursor-agent-zh-bootstrap.js
 *
 * Phase 1C: Glass gate + Translation Invariants + read-only safety scan.
 * Does NOT translate UI. Does NOT mutate text nodes. DOM live observer deferred to Phase 1D.
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
   * Text node eligible as a future translation candidate (Phase 1C: classify only).
   */
  function isCandidateTextNode(node) {
    if (!isTextNode(node)) return false;
    var raw = node.nodeValue;
    if (raw == null) return false;
    // Non-empty after trim — still do not log the text.
    if (!String(raw).replace(/\s+/g, '').length) return false;
    return !shouldSkipNode(node);
  }

  /**
   * Read-only TreeWalker scan. Never mutates DOM text.
   * @param {ParentNode} rootEl
   * @param {Document} doc
   */
  function runSafetyScan(rootEl, doc) {
    var stats = {
      textNodesSeen: 0,
      candidateCount: 0,
      skippedMessage: 0,
      skippedCode: 0,
      skippedEditable: 0,
      skippedEmpty: 0,
    };

    if (!rootEl || !doc || typeof doc.createTreeWalker !== 'function') {
      return stats;
    }

    var SHOW_TEXT = (typeof Node !== 'undefined' && Node.TEXT_NODE) ? 4 : 4;
    // NodeFilter.SHOW_TEXT === 4
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
        else stats.candidateCount += 1;
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
      phase: '1c-safety-skeleton',
      translates: false,
    };
  }

  /** Bounded wait for body[data-cursor-glass-mode="true"] (Agents Window sets it after bootstrap may load). */
  var GLASS_WAIT_MS = 8000;
  var GLASS_POLL_MS = 50;
  var GLASS_ATTR = 'data-cursor-glass-mode';

  function buildApi(state) {
    return {
      getStatus: function getStatus() {
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
            message: state.skipCounts.message | 0,
            code: state.skipCounts.code | 0,
            editable: state.skipCounts.editable | 0,
            empty: state.skipCounts.empty | 0,
          },
          phase: state.phase,
          translates: false,
        };
      },
      shouldSkipNode: shouldSkipNode,
      isGlassDocument: isGlassDocument,
      isCandidateTextNode: isCandidateTextNode,
    };
  }

  function logSafetyAudit(state) {
    try {
      console.log(
        LOG_PREFIX + ' safety audit',
        '\nGlass: ' + state.isGlass,
        '\ntextNodesSeen: ' + state.textNodesSeen,
        '\ncandidates: ' + state.candidateCount,
        '\nskippedMessage: ' + state.skipCounts.message,
        '\nskippedCode: ' + state.skipCounts.code,
        '\nskippedEditable: ' + state.skipCounts.editable,
        '\nskippedEmpty: ' + state.skipCounts.empty,
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
    var stats = runSafetyScan(doc.body || doc.documentElement, doc);
    state.textNodesSeen = stats.textNodesSeen;
    state.candidateCount = stats.candidateCount;
    state.skipCounts.message = stats.skippedMessage;
    state.skipCounts.code = stats.skippedCode;
    state.skipCounts.editable = stats.skippedEditable;
    state.skipCounts.empty = stats.skippedEmpty;
    state.scanCompleted = true;
    state.scopeSettled = true;
    state.initialized = true;
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
    state.phase = '1c-safety-skeleton';
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
    isGlassDocument: isGlassDocument,
    classifyGlassScope: classifyGlassScope,
    isMessageContainer: isMessageContainer,
    isCodeLikeElement: isCodeLikeElement,
    isEditableElement: isEditableElement,
    skipReasonForNode: skipReasonForNode,
    shouldSkipNode: shouldSkipNode,
    isCandidateTextNode: isCandidateTextNode,
    runSafetyScan: runSafetyScan,
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
