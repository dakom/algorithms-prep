/* Host side of the test runner. Runs learner code inside a Web Worker so an
   infinite loop (the classic "forgot visited") can be killed with a timeout and
   reported as a lesson instead of freezing the tab. Falls back to main-thread
   execution with loop guards if Workers are unavailable. */
(function () {
  const WORKER_SRC = '(' + RUNNER_CORE.toString() + ')();\n' +
    'onmessage = function (e) {\n' +
    '  const spec = e.data.spec;\n' +
    '  const emit = (index, result) => postMessage({ type: "result", index, result });\n' +
    '  let summary;\n' +
    '  try { summary = e.data.mode === "own" ? RunnerCore.runOwn(spec, emit) : RunnerCore.runSuite(spec, emit); }\n' +
    '  catch (err) { summary = { loadError: "internal runner error: " + (err && err.message) }; }\n' +
    '  postMessage({ type: "done", summary });\n' +
    '};';

  let workerUrl = null, workerOk = null;
  function makeWorker() {
    if (workerOk === false) return null;
    try {
      if (!workerUrl) workerUrl = URL.createObjectURL(new Blob([WORKER_SRC], { type: 'application/javascript' }));
      const w = new Worker(workerUrl);
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

  /* run({ mode:'suite'|'own', spec }, { onResult(i, r), onDone(summary), onTimeout(i) })
     spec (suite): { code, fn, isClass, harness?, tests }
     spec (own):   { code, refCode, fn, harness?, ownSrc, check?, unordered?, coverage? }
     Resolves to summary. Per-test timeout: TIMEOUT_MS. Returns a handle with cancel(). */
  const TIMEOUT_MS = 2500;
  function run(job, cb) {
    const spec = Object.assign({}, job.spec);
    if (spec.harness) { spec.harnessSrc = spec.harness.toString(); delete spec.harness; }
    if (spec.tests) spec.tests = serializeTests(spec.tests);
    if (spec.check) { spec.checkSrc = spec.check.toString(); delete spec.check; }
    if (spec.coverage) spec.coverage = spec.coverage.map(c => ({ label: c.label, hitSrc: c.hit.toString() }));
    delete spec.refFn;

    const w = makeWorker();
    if (!w) {
      // main-thread fallback
      return new Promise(resolve => {
        setTimeout(() => {
          let summary;
          try {
            summary = job.mode === 'own'
              ? RunnerCore.runOwn(spec, cb.onResult, { guard: true })
              : RunnerCore.runSuite(spec, cb.onResult, { guard: true });
          } catch (e) { summary = { loadError: 'runner error: ' + e.message }; }
          summary.fallback = true;
          cb.onDone(summary);
          resolve(summary);
        }, 0);
      });
    }

    return new Promise(resolve => {
      let nextIndex = 0, timer = null, finished = false;
      const arm = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          if (finished) return;
          finished = true;
          w.terminate();
          const summary = { timedOut: true, timedOutIndex: nextIndex };
          cb.onTimeout(nextIndex);
          cb.onDone(summary);
          resolve(summary);
        }, TIMEOUT_MS);
      };
      w.onmessage = e => {
        if (finished) return;
        const m = e.data;
        if (m.type === 'result') { nextIndex = m.index + 1; cb.onResult(m.index, m.result); arm(); }
        else if (m.type === 'done') {
          finished = true; clearTimeout(timer); w.terminate();
          cb.onDone(m.summary); resolve(m.summary);
        }
      };
      w.onerror = e => {
        if (finished) return;
        finished = true; clearTimeout(timer); w.terminate();
        const summary = { loadError: 'Your code failed to load — ' + (e.message || 'syntax error') };
        cb.onDone(summary); resolve(summary);
      };
      arm();
      w.postMessage({ mode: job.mode, spec });
    });
  }

  window.Runner = { run, TIMEOUT_MS };
})();
