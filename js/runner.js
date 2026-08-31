/* Host side of the test runner. Runs learner code inside a Web Worker so an
   infinite loop (the classic "forgot visited") can be killed with a timeout and
   reported as a lesson instead of freezing the tab. Falls back to main-thread
   execution with loop guards if Workers are unavailable. */
(function () {
  /* The job is EMBEDDED in the worker's blob source as a JSON string literal —
     never sent via postMessage. Host→worker messages proved fragile in the
     wild: Chrome's structured-clone deserializer gives up on deeply nested
     values, and browser extensions that hook page messaging (wallet lockdown /
     inpage scripts) can mangle large payloads into e.data === null. Nothing
     can tamper with the worker's own source, and extensions can't inject into
     the worker realm. Only small result objects flow back the other way. */
  const RUNNER_CORE_SRC = '(' + RUNNER_CORE.toString() + ')();\n';
  const RUNNER_MAIN =
    'const job = JSON.parse(JOB_JSON);\n' +
    'const spec = job.spec;\n' +
    'const emit = (index, result) => postMessage({ type: "result", index, result });\n' +
    'RunnerCore.hooks.onLog = text => postMessage({ type: "log", text });\n' +
    'const M = { own: RunnerCore.runOwn, break: RunnerCore.runBreak, scratch: RunnerCore.runScratch };\n' +
    'let summary;\n' +
    'try { summary = (M[job.mode] || RunnerCore.runSuite)(spec, emit); }\n' +
    'catch (err) { summary = { loadError: "internal runner error: " + (err && err.message) }; }\n' +
    'postMessage({ type: "done", summary });\n';

  let workerOk = null;
  function makeWorker(payloadJson) {
    if (workerOk === false) return null;
    try {
      const src = RUNNER_CORE_SRC + 'const JOB_JSON = ' + JSON.stringify(payloadJson) + ';\n' + RUNNER_MAIN;
      const url = URL.createObjectURL(new Blob([src], { type: 'application/javascript' }));
      const w = new Worker(url);
      w._blobUrl = url;   // revoked by the caller once the run finishes
      return w;
    } catch (e) {
      workerOk = false;
      console.warn('Web Worker unavailable, running tests on the main thread with loop guards.', e);
      return null;
    }
  }

  /* Serializes a test spec: functions become source strings. */
  function serializeTests(tests) {
    return tests.map(t => {
      const o = { name: t.name };
      if ('args' in t) o.args = t.args;
      if ('expect' in t) o.expect = t.expect;
      if (t.expectThrow) o.expectThrow = t.expectThrow;
      if (t.unordered) o.unordered = true;
      if (t.noMutate) o.noMutate = t.noMutate;
      if (t.expectedText) o.expectedText = t.expectedText;
      if (t.check) o.checkSrc = t.check.toString();
      if (t.run) o.runSrc = t.run.toString();
      return o;
    });
  }

  /* run({ mode:'suite'|'own'|'break'|'scratch', spec }, { onResult(i, r), onDone(summary), onTimeout(i, logsSoFar) })
     spec (suite):   { code, fn, isClass, harness?, tests, lineOffset? }
     spec (own):     { code, refCode, fn, harness?, ownSrc, check?, unordered?, coverage?, lineOffset? }
     spec (scratch): { code, lineOffset? }  — just runs the code and collects console output
     lineOffset = number of provided-code lines prepended before the learner's editor text,
     so error locations come back as editor line numbers.
     Resolves to summary. Per-test timeout: TIMEOUT_MS. On timeout, the console lines the
     killed test had printed so far are passed to onTimeout and put on summary.logs. */
  const TIMEOUT_MS = 2500;
  function run(job, cb) {
    const spec = Object.assign({}, job.spec);
    if (spec.harness) { spec.harnessSrc = spec.harness.toString(); delete spec.harness; }
    if (spec.tests) spec.tests = serializeTests(spec.tests);
    if (spec.check) { spec.checkSrc = spec.check.toString(); delete spec.check; }
    if (spec.coverage) spec.coverage = spec.coverage.map(c => ({ label: c.label, hitSrc: c.hit.toString() }));
    delete spec.refFn;

    const w = makeWorker(JSON.stringify({ mode: job.mode, spec }));
    if (!w) {
      // main-thread fallback
      return new Promise(resolve => {
        setTimeout(() => {
          let summary;
          const M = { own: RunnerCore.runOwn, break: RunnerCore.runBreak, scratch: RunnerCore.runScratch };
          try { summary = (M[job.mode] || RunnerCore.runSuite)(spec, cb.onResult, { guard: true }); }
          catch (e) { summary = { loadError: 'runner error: ' + e.message }; }
          summary.fallback = true;
          cb.onDone(summary);
          resolve(summary);
        }, 0);
      });
    }

    return new Promise(resolve => {
      let nextIndex = 0, timer = null, finished = false, pendingLogs = [];
      const finish = () => { w.terminate(); URL.revokeObjectURL(w._blobUrl); };
      const arm = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          if (finished) return;
          finished = true;
          finish();
          const summary = { timedOut: true, timedOutIndex: nextIndex, logs: pendingLogs };
          cb.onTimeout(nextIndex, pendingLogs);
          cb.onDone(summary);
          resolve(summary);
        }, TIMEOUT_MS);
      };
      w.onmessage = e => {
        if (finished) return;
        const m = e.data;
        if (!m || !m.type) return;
        if (m.type === 'log') { pendingLogs.push(m.text); return; }
        if (m.type === 'result') { nextIndex = m.index + 1; pendingLogs = []; cb.onResult(m.index, m.result); arm(); }
        else if (m.type === 'done') {
          finished = true; clearTimeout(timer); finish();
          cb.onDone(m.summary); resolve(m.summary);
        }
      };
      w.onerror = e => {
        if (finished) return;
        finished = true; clearTimeout(timer); finish();
        const summary = { loadError: 'Your code failed to load — ' + (e.message || 'syntax error') };
        cb.onDone(summary); resolve(summary);
      };
      arm();  // the worker starts on its own — the job ships inside its source
    });
  }

  /* new Function() reports syntax errors without a position. Loading the same code as a
     <script> (wrapped in a never-called function so nothing executes) makes the browser
     report the error through window.onerror WITH a line number. Resolves to
     { message, line, col } or null (not a syntax error / browser gave no position). */
  function locateSyntaxError(code, lineOffset) {
    return new Promise(resolve => {
      let found = null, url = null, done = false;
      const finish = () => {
        if (done) return; done = true;
        window.removeEventListener('error', onErr, true);
        if (url) URL.revokeObjectURL(url);
        if (found && found.line !== null) {
          const last = code.split('\n').length - (lineOffset || 0);   // EOF errors land on the wrapper's closing line
          found.line = Math.min(found.line - 1 - (lineOffset || 0), last);
          if (found.line < 1) found.line = null;
        }
        resolve(found);
      };
      const onErr = ev => {
        if (!url || ev.filename !== url) return;
        ev.preventDefault();
        found = { message: String(ev.message || '').replace(/^Uncaught\s+/, ''), line: ev.lineno || null, col: ev.colno || null };
      };
      try {
        window.addEventListener('error', onErr, true);
        url = URL.createObjectURL(new Blob(['(function () {\n' + code + '\n});'], { type: 'application/javascript' }));
        const sc = document.createElement('script');
        sc.src = url;
        sc.onload = sc.onerror = () => { sc.remove(); setTimeout(finish, 0); };
        document.head.appendChild(sc);
        setTimeout(finish, 1500);
      } catch (e) { finish(); }
    });
  }

  window.Runner = { run, locateSyntaxError, TIMEOUT_MS };
})();
