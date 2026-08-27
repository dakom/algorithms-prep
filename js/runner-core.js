/* Test-runner core. Written as ONE function so its source can be shipped into a
   Web Worker (RUNNER_CORE.toString()) and also required from Node for the
   offline self-check (tools/selfcheck.js). It must not reference anything
   outside itself. Installs globalThis.RunnerCore. */
function RUNNER_CORE() {
  const G = typeof globalThis !== 'undefined' ? globalThis : self;

  /* ---------- value formatting ---------- */
  function fmt(v, depth) {
    depth = depth || 0;
    if (depth > 6) return '…';
    if (v === undefined) return 'undefined';
    if (v === null) return 'null';
    if (typeof v === 'number') return Object.is(v, -0) ? '-0' : String(v);
    if (typeof v === 'bigint') return v + 'n';
    if (typeof v === 'string') return JSON.stringify(v);
    if (typeof v === 'boolean' || typeof v === 'symbol') return String(v);
    if (typeof v === 'function') return '[Function ' + (v.name || 'anonymous') + ']';
    if (v instanceof Error) return v.name + ': ' + v.message;
    if (v instanceof Map) {
      const parts = [];
      for (const [k, x] of v) parts.push(fmt(k, depth + 1) + ' => ' + fmt(x, depth + 1));
      return 'Map(' + v.size + ') {' + parts.join(', ') + '}';
    }
    if (v instanceof Set) {
      const parts = [];
      for (const x of v) parts.push(fmt(x, depth + 1));
      return 'Set(' + v.size + ') {' + parts.join(', ') + '}';
    }
    if (Array.isArray(v)) {
      if (v.length > 40) return '[' + v.slice(0, 40).map(x => fmt(x, depth + 1)).join(', ') + ', … +' + (v.length - 40) + ' more]';
      return '[' + v.map(x => fmt(x, depth + 1)).join(', ') + ']';
    }
    if (typeof v === 'object') {
      const keys = Object.keys(v);
      const name = v.constructor && v.constructor !== Object && v.constructor.name ? v.constructor.name + ' ' : '';
      if (!keys.length) return name + '{}';
      return name + '{ ' + keys.slice(0, 40).map(k => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)) + ': ' + fmt(v[k], depth + 1)).join(', ') +
        (keys.length > 40 ? ', …' : '') + ' }';
    }
    return String(v);
  }

  /* ---------- deep equality (lenient across Map/object and Set/array) ---------- */
  function isPlain(o) {
    if (o === null || typeof o !== 'object') return false;
    const p = Object.getPrototypeOf(o);
    return p === Object.prototype || p === null;
  }
  function normalize(v) {
    // Map with string/number keys → plain object; Set → array (sorted by fmt) — so a learner
    // who returns a Map where we expected {A: 22} still passes. Only used when one side needs it.
    if (v instanceof Map) {
      const o = {};
      for (const [k, x] of v) o[String(k)] = x;
      return o;
    }
    if (v instanceof Set) return Array.from(v);
    return v;
  }
  function sortKey(x) { return fmt(x); }
  function deepEqual(a, b, unordered) {
    if (Object.is(a, b)) return true;
    if (typeof a === 'number' && typeof b === 'number') return a === b; // 0 === -0 is fine
    if (a instanceof Map && !(b instanceof Map)) a = normalize(a);
    if (b instanceof Map && !(a instanceof Map)) b = normalize(b);
    if (a instanceof Set && !(b instanceof Set)) { a = normalize(a); unordered = true; }
    if (b instanceof Set && !(a instanceof Set)) { b = normalize(b); unordered = true; }
    if (a instanceof Map && b instanceof Map) {
      if (a.size !== b.size) return false;
      for (const [k, x] of a) { if (!b.has(k) || !deepEqual(x, b.get(k), unordered)) return false; }
      return true;
    }
    if (a instanceof Set && b instanceof Set) {
      if (a.size !== b.size) return false;
      const bs = Array.from(b).map(sortKey).sort();
      const as = Array.from(a).map(sortKey).sort();
      return as.every((x, i) => x === bs[i]);
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      if (unordered) {
        const as = a.map(sortKey).sort(), bs = b.map(sortKey).sort();
        return as.every((x, i) => x === bs[i]);
      }
      return a.every((x, i) => deepEqual(x, b[i], unordered));
    }
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (a && b && typeof a === 'object' && typeof b === 'object') {
      if (!isPlain(a) && !isPlain(b) && a.constructor !== b.constructor) return false;
      const ka = Object.keys(a), kb = Object.keys(b);
      if (ka.length !== kb.length) return false;
      for (const k of ka) { if (!Object.prototype.hasOwnProperty.call(b, k) || !deepEqual(a[k], b[k], unordered)) return false; }
      return true;
    }
    return false;
  }

  function clone(v) {
    if (v === null || typeof v !== 'object') return v;
    if (v instanceof Map) return new Map(Array.from(v, ([k, x]) => [clone(k), clone(x)]));
    if (v instanceof Set) return new Set(Array.from(v, clone));
    if (Array.isArray(v)) return v.map(clone);
    const o = {};
    for (const k of Object.keys(v)) o[k] = clone(v[k]);
    return o;
  }

  /* ---------- building user code ---------- */
  function rebuild(src) {
    // functions travel to the worker as source text; rebuild without closures
    return new Function('return (' + src + ');')();
  }
  function guardLoops(code) {
    // main-thread fallback only: inject an iteration counter into every loop so a
    // forgotten `visited` set throws instead of freezing the tab
    let n = 0;
    const g = () => { n++; return '{ if (++__lg > 3000000) throw new Error("Possible infinite loop: more than 3,000,000 loop iterations"); '; };
    return 'let __lg = 0;\n' + code
      .replace(/\b(for|while)\s*\(((?:[^()]|\([^()]*\))*)\)\s*\{/g, (m, kw, cond) => kw + ' (' + cond + ') ' + g())
      .replace(/\bdo\s*\{/g, () => 'do ' + g());
  }
  function loadSymbol(code, name, opts) {
    const body = (opts && opts.guard ? guardLoops(code) : code) +
      '\n;return (typeof ' + name + ' === "undefined") ? undefined : ' + name + ';';
    return new Function(body)();
  }
  /* every top-level function/class/const the learner declared, so tests can call
     sibling functions (e.g. "part 1 still works" while testing part 2) via H.fns */
  function loadSymbols(code, opts) {
    const names = new Set();
    const re = /^[ \t]*(?:async\s+)?(?:function\*?|class)\s+([A-Za-z_$][\w$]*)|^[ \t]*(?:const|let|var)\s+([A-Za-z_$][\w$]*)/gm;
    let m;
    while ((m = re.exec(code)) !== null) names.add(m[1] || m[2]);
    const body = (opts && opts.guard ? guardLoops(code) : code) + '\n;return {' +
      Array.from(names).map(n => JSON.stringify(n) + ': (typeof ' + n + ' === "undefined" ? undefined : ' + n + ')').join(',') + '};';
    captureConsole([]);   // top-level code runs again here; don't report its output twice
    try { return new Function(body)(); } catch (e) { return {}; } finally { releaseConsole(); }
  }

  /* ---------- console capture ----------
     Learner output is collected per test (and during load, for top-level code) and
     also streamed through hooks.onLog so the host can show it even if the run is
     killed by the timeout a moment later. */
  const MAX_LOGS = 200;
  const hooks = { onLog: null };
  let sink = null;
  const realConsole = G.console;
  function logLine(level, a) {
    if (!sink) return;
    if (sink.length >= MAX_LOGS) {
      if (sink.length === MAX_LOGS) { sink.push('… output truncated after ' + MAX_LOGS + ' lines'); if (hooks.onLog) hooks.onLog(sink[sink.length - 1]); }
      return;
    }
    const text = (level === 'warn' ? '⚠ ' : level === 'error' ? '✖ ' : '') + a.map(x => typeof x === 'string' ? x : fmt(x)).join(' ');
    sink.push(text);
    if (hooks.onLog) hooks.onLog(text);
  }
  function captureConsole(logs) {
    sink = logs;
    G.console = Object.assign(Object.create(realConsole), {
      log: (...a) => logLine('log', a),
      info: (...a) => logLine('log', a),
      debug: (...a) => logLine('log', a),
      dir: (...a) => logLine('log', a),
      table: (...a) => logLine('log', a),
      warn: (...a) => logLine('warn', a),
      error: (...a) => logLine('error', a)
    });
  }
  function releaseConsole() { sink = null; G.console = realConsole; }

  /* ---------- error locations ----------
     Code is built with new Function(), whose stack frames show up as
     "<anonymous>:LINE:COL" (Chrome) or "Function:LINE:COL" (Firefox) with a
     browser-specific header offset — measure it once, then report editor lines. */
  let fnLineOffset = null;
  function stackLoc(stack) {
    if (!stack) return null;
    const m = /<anonymous>:(\d+):(\d+)/.exec(stack) || /\bFunction:(\d+):(\d+)/.exec(stack);
    return m ? { line: +m[1], col: +m[2] } : null;
  }
  function calibrate() {
    if (fnLineOffset !== null) return;
    fnLineOffset = 0;
    try { new Function('\n\nthrow new Error("calibrate");')(); }
    catch (e) { const l = stackLoc(e.stack); if (l) fnLineOffset = l.line - 3; }
  }
  /* line/col of `e` inside the learner's editor, or null if unknown.
     spec.lineOffset = lines of provided code prepended before the editor text. */
  function errLoc(e, spec, opts) {
    if (!(e instanceof Error)) return null;
    calibrate();
    const l = stackLoc(e.stack);
    if (!l) return null;
    const line = l.line - fnLineOffset - (opts && opts.guard ? 1 : 0) - ((spec && spec.lineOffset) || 0);
    if (line < 1) return { line: null, col: null, provided: true };
    return { line, col: l.col, provided: false };
  }

  function errText(e) {
    if (!(e instanceof Error)) return 'threw ' + fmt(e);
    let s = e.name + ': ' + e.message;
    if (e instanceof RangeError && /call stack/i.test(e.message)) s += ' — unbounded recursion? (missing base case, or a cycle without a visited set)';
    return s;
  }

  /* ---------- one test ---------- */
  function runOne(fn, test, H, opts, spec) {
    const logs = [];
    const res = { name: test.name, pass: false, actual: '', expected: '', error: null, errorLoc: null, logs, note: null };
    captureConsole(logs);
    let actual, threw = false, args = test.args ? clone(test.args) : [];
    const before = test.noMutate ? fmt(args) : null;
    try {
      if (test.runSrc) actual = rebuild(test.runSrc)(fn, H, ...args);
      else actual = fn(...args);
    } catch (e) {
      threw = true;
      if (test.expectThrow) {
        const re = test.expectThrow === true ? null : new RegExp(test.expectThrow, 'i');
        res.pass = !re || re.test(e && e.message || '');
        res.actual = 'threw ' + errText(e);
        res.expected = 'throws' + (re ? ' /' + test.expectThrow + '/i' : '');
        releaseConsole();
        return res;
      }
      res.error = errText(e);
      res.errorLoc = errLoc(e, spec, opts);
    }
    releaseConsole();
    if (threw) { res.expected = test.expectThrow ? 'throws' : ('expect' in test ? fmt(test.expect) : (test.expectedText || 'a value')); return res; }
    if (test.expectThrow) {
      res.pass = false; res.actual = 'returned ' + fmt(actual); res.expected = 'throws';
      return res;
    }
    if (test.noMutate && fmt(args) !== before) {
      res.note = 'input was mutated: ' + before + ' → ' + fmt(args);
    }
    res.actual = fmt(actual);
    if (test.checkSrc) {
      let verdict;
      try { verdict = rebuild(test.checkSrc)(actual, clone(test.args || []), H); }
      catch (e) { res.error = 'checker error: ' + errText(e); res.expected = test.expectedText || ''; return res; }
      if (verdict && typeof verdict === 'object') {
        res.pass = !!verdict.ok;
        res.expected = verdict.expected || test.expectedText || '';
        if (verdict.note) res.note = verdict.note;
      } else {
        res.pass = !!verdict;
        res.expected = test.expectedText || '';
      }
    } else {
      res.expected = fmt(test.expect);
      res.pass = deepEqual(actual, test.expect, !!test.unordered);
    }
    if (res.note && /mutated/.test(res.note) && test.noMutate === 'fail') res.pass = false;
    return res;
  }

  /* ---------- suites ---------- */
  function buildHelpers(spec) {
    return spec.harnessSrc ? rebuild(spec.harnessSrc)() : {};
  }
  function loadUser(spec, opts) {
    let fn;
    const logs = [];
    captureConsole(logs);
    try { fn = loadSymbol(spec.code, spec.fn, opts); }
    catch (e) {
      releaseConsole();
      const loc = errLoc(e, spec, opts);
      const syntax = e instanceof SyntaxError;
      return { error: (syntax ? 'Your code has a syntax error — ' : 'Your code threw while loading (top-level code, outside any function) — ') + errText(e), errorLoc: loc, syntax, logs };
    }
    releaseConsole();
    if (fn === undefined) return { error: 'Could not find `' + spec.fn + '` — keep the ' + (spec.isClass ? 'class' : 'function') + ' name exactly `' + spec.fn + '`.', logs };
    if (spec.isClass ? typeof fn !== 'function' : typeof fn !== 'function') return { error: '`' + spec.fn + '` is not a ' + (spec.isClass ? 'class' : 'function') + '.', logs };
    return { fn, logs };
  }

  /* runSuite: runs hidden tests; calls emit(index, result) after each; returns summary */
  function runSuite(spec, emit, opts) {
    const H = buildHelpers(spec);
    const load = loadUser(spec, opts);
    if (load.error) { return { loadError: load.error, loadErrorLoc: load.errorLoc, syntax: !!load.syntax, loadLogs: load.logs }; }
    H.fns = loadSymbols(spec.code, opts);
    let passed = 0;
    for (let i = 0; i < spec.tests.length; i++) {
      const r = runOne(load.fn, spec.tests[i], H, opts, spec);
      if (r.pass) passed++;
      emit(i, r);
    }
    return { passed, total: spec.tests.length, loadLogs: load.logs };
  }

  /* runOwn: the learner's own tests, validated against the reference solution */
  function runOwn(spec, emit, opts) {
    const H = buildHelpers(spec);
    const load = loadUser(spec, opts);
    if (load.error) return { loadError: load.error, loadErrorLoc: load.errorLoc, syntax: !!load.syntax, loadLogs: load.logs };
    H.fns = loadSymbols(spec.code, opts);
    let ref;
    try { ref = loadSymbol(spec.refCode, spec.fn); } catch (e) { return { loadError: 'internal: reference failed to load: ' + errText(e) }; }
    let tests;
    try { tests = new Function('return (' + spec.ownSrc + ');')(); }
    catch (e) { return { loadError: 'Your test list is not valid JavaScript — ' + errText(e) }; }
    if (!Array.isArray(tests)) return { loadError: 'Your tests must be an array literal: [ { name, args, expect }, … ]' };
    const coverage = (spec.coverage || []).map(c => ({ label: c.label, hit: false }));
    let valid = 0;
    tests.forEach((t, i) => {
      const r = { name: (t && t.name) || ('test ' + (i + 1)), pass: false, expectOk: false, actual: '', expected: '', refActual: '', error: null };
      if (!t || typeof t !== 'object' || !Array.isArray(t.args)) { r.error = 'each test needs `args: [ … ]` (an array of the arguments to pass)'; emit(i, r); return; }
      if (!('expect' in t)) { r.error = 'each test needs an `expect` value'; emit(i, r); return; }
      // 1. is the learner's expectation actually right? (reference / checker decides)
      let refOut;
      captureConsole([]);   // the reference's own logging isn't the learner's output
      try { refOut = ref(...clone(t.args)); r.refActual = fmt(refOut); }
      catch (e) { releaseConsole(); r.error = 'reference threw on these args: ' + errText(e); emit(i, r); return; }
      releaseConsole();
      if (spec.checkSrc) {
        let v; try { v = rebuild(spec.checkSrc)(t.expect, clone(t.args), H); } catch (e) { v = false; }
        r.expectOk = !!(v && (typeof v !== 'object' || v.ok));
      } else r.expectOk = deepEqual(t.expect, refOut, !!spec.unordered);
      // 2. does the learner's function pass it?
      const one = runOne(load.fn, { name: r.name, args: t.args, expect: t.expect, checkSrc: spec.checkSrc, unordered: spec.unordered, expectedText: fmt(t.expect) }, H, opts, spec);
      r.pass = one.pass; r.actual = one.actual; r.expected = fmt(t.expect); r.error = one.error; r.errorLoc = one.errorLoc; r.logs = one.logs;
      if (r.expectOk && r.pass) valid++;
      if (r.expectOk && r.pass) (spec.coverage || []).forEach((c, ci) => {
        try { if (rebuild(c.hitSrc)(clone(t.args))) coverage[ci].hit = true; } catch (e) { /* ignore */ }
      });
      emit(i, r);
    });
    return { valid, total: tests.length, coverage, loadLogs: load.logs };
  }

  /* runBreak: the learner supplies arguments that should make a buggy implementation
     disagree with the reference. emit(0, referenceResult), emit(1, buggyResult). */
  function runBreak(spec, emit, opts) {
    const H = buildHelpers(spec);
    let args;
    try { args = new Function('return (' + spec.argsSrc + ');')(); }
    catch (e) { return { loadError: 'Your arguments are not valid JavaScript — ' + errText(e) }; }
    if (!Array.isArray(args)) return { loadError: 'Write the arguments as an array literal — one element per parameter, e.g. [[["A","B"]], "A", "B"]' };
    const ref = loadUser({ code: spec.refCode, fn: spec.fn }, opts);
    if (ref.error) return { loadError: 'internal: reference failed to load: ' + ref.error };
    const bug = loadUser({ code: spec.buggyCode, fn: spec.fn }, opts);
    if (bug.error) return { loadError: 'internal: buggy version failed to load: ' + bug.error };
    const refRes = runOne(ref.fn, { name: 'reference', args }, H, opts);
    emit(0, refRes);
    const bugRes = runOne(bug.fn, { name: 'buggy', args }, H, opts);
    emit(1, bugRes);
    const differ = (!!refRes.error !== !!bugRes.error) || refRes.actual !== bugRes.actual;
    return { differ, args: fmt(args) };
  }

  /* runScratch: execute the learner's file top to bottom with console capture — no
     tests. If the file only *defines* spec.fn and never calls it, call it with
     spec.sampleArgs (the first test's input) so "Run code" always shows something.
     spec: { code, lineOffset?, fn?, sampleArgs?, isClass? } */
  function runScratch(spec, emit, opts) {
    const logs = [];
    captureConsole(logs);
    let error = null, errorLoc = null, syntax = false, called = null;
    let fn;
    try { fn = spec.fn ? loadSymbol(spec.code, spec.fn, opts) : undefined; }
    catch (e) { error = errText(e); errorLoc = errLoc(e, spec, opts); syntax = e instanceof SyntaxError; }
    if (!error && spec.fn && spec.sampleArgs && !spec.isClass && typeof fn === 'function' && !callsItself(spec.code, spec.fn)) {
      called = spec.fn + '(' + spec.sampleArgs.map(a => fmt(a)).join(', ') + ')';
      logLine('log', ['▶ ' + called + '   ← called for you with the first test’s input (your file never calls ' + spec.fn + ')']);
      try { logLine('log', ['→ returned ' + fmt(fn(...clone(spec.sampleArgs)))]); }
      catch (e) { error = errText(e); errorLoc = errLoc(e, spec, opts); }
    } else if (!error && spec.fn && typeof fn !== 'function') {
      logLine('warn', ['`' + spec.fn + '` is not defined — keep the name exactly `' + spec.fn + '`']);
    }
    releaseConsole();
    return { logs, error, errorLoc, syntax, called };
  }
  /* does the code call `name` anywhere other than its own definition? */
  function callsItself(code, name) {
    const stripped = code.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '');
    const re = new RegExp('(?<!\\bfunction\\s+)(?<![\\w$.])' + name.replace(/\$/g, '\\$') + '\\s*\\(', 'g');
    return re.test(stripped);
  }

  G.RunnerCore = { fmt, deepEqual, clone, runSuite, runOwn, runBreak, runScratch, guardLoops, loadSymbol, loadSymbols, errText, errLoc, hooks };
}
if (typeof module !== 'undefined' && module.exports) { RUNNER_CORE(); module.exports = globalThis.RunnerCore; }
