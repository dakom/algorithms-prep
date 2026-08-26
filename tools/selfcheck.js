#!/usr/bin/env node
/* Offline self-check for the course content. Loads every content module under a
   tiny browser shim and verifies:
     - every exercise's reference solution passes its own hidden tests
       (and, for multi-stage exercises, all EARLIER stages' tests too)
     - the starter code does NOT pass (tests aren't vacuous)
     - every antiSolution fails at least one test
     - own-tests mode accepts the reference's own expectations
     - widget/quiz configs are answerable (answer indices in range, blanks match…)
   Run: node tools/selfcheck.js */
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '..');

global.window = globalThis;
require(path.join(root, 'js/highlight.js'));
const RunnerCore = require(path.join(root, 'js/runner-core.js'));
require(path.join(root, 'js/exercise.js'));
require(path.join(root, 'js/widgets.js'));
const contentDir = path.join(root, 'js/content');
fs.readdirSync(contentDir).filter(f => /^m\d+\.js$/.test(f)).sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)))
  .forEach(f => require(path.join(contentDir, f)));

let failures = 0, checks = 0;
const fail = msg => { failures++; console.log('  ✗ ' + msg); };
const ok = () => { checks++; };
const trim = s => String(s).replace(/^\n/, '').replace(/\s+$/, '');

function serialize(tests) {
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
function runSuite(code, fn, isClass, harness, tests) {
  const results = [];
  const spec = { code, fn, isClass, tests: serialize(tests) };
  if (harness) spec.harnessSrc = harness.toString();
  const summary = RunnerCore.runSuite(spec, (i, r) => { results[i] = r; }, { guard: true });
  return { summary, results };
}
function describeFails(results) {
  return results.filter(r => !r.pass).map(r => '      · ' + r.name + ' → ' + (r.error || ('got ' + r.actual + ', expected ' + r.expected)) + (r.note ? ' [' + r.note + ']' : '')).join('\n');
}

console.log('Exercises: ' + window.Exercise.all().length);
for (const cfg of window.Exercise.all()) {
  console.log('\n' + cfg.id + ' — ' + cfg.title);
  const prelude = cfg.prelude ? trim(cfg.prelude) + '\n\n' : '';
  cfg.stages.forEach((stage, si) => {
    const fn = stage.fn || cfg.fn;
    const label = cfg.stages.length > 1 ? ' [stage ' + (si + 1) + ' ' + (stage.title || '') + ']' : '';
    if (!stage.tests.length) { console.log('  · ' + 'discussion stage' + label); return; }
    if (!stage.solution) { fail('no solution' + label); return; }
    // 1. reference passes this stage's tests
    const sol = prelude + trim(stage.solution);
    let r = runSuite(sol, fn, !!cfg.isClass, cfg.harness, stage.tests);
    if (r.summary.loadError) fail('reference failed to load' + label + ': ' + r.summary.loadError);
    else if (r.summary.passed !== r.summary.total) fail('reference fails ' + (r.summary.total - r.summary.passed) + ' test(s)' + label + '\n' + describeFails(r.results));
    else ok();
    // 1b. multi-stage: this stage's solution still passes earlier stages (no regressions)
    for (let e = 0; e < si; e++) {
      const earlier = cfg.stages[e];
      if (!earlier.tests.length) continue;
      const rr = runSuite(sol, earlier.fn || cfg.fn, !!cfg.isClass, cfg.harness, earlier.tests);
      if (rr.summary.loadError || rr.summary.passed !== rr.summary.total) fail('stage ' + (si + 1) + ' solution regresses stage ' + (e + 1) + ' tests\n' + describeFails(rr.results || []));
      else ok();
    }
    // 2. starter does not pass
    if (cfg.starter && si === 0) {
      const rs = runSuite(prelude + trim(cfg.starter), fn, !!cfg.isClass, cfg.harness, stage.tests);
      if (!rs.summary.loadError && rs.summary.passed === rs.summary.total) fail('starter code already passes all tests' + label);
      else ok();
    }
    // 3. anti-solutions fail
    (stage.antiSolutions || []).forEach(a => {
      const ra = runSuite(prelude + trim(a.code), fn, !!cfg.isClass, cfg.harness, stage.tests);
      if (!ra.summary.loadError && ra.summary.passed === ra.summary.total) fail('antiSolution "' + a.name + '" passes every test' + label);
      else { ok(); console.log('  · anti "' + a.name + '": ' + (ra.summary.loadError ? 'load error' : (ra.summary.total - ra.summary.passed) + ' failing') + (ra.results && ra.results.find(x => x && x.error && /infinite loop|call stack/.test(x.error)) ? ' (incl. loop/recursion guard)' : '')); }
    });
    // 4. own-tests: reference expectations validated by the checker/reference
    if (stage.ownTests) {
      const own = stage.tests.filter(t => 'args' in t && !t.run && !t.expectThrow).map(t => ({ name: t.name, args: t.args, expect: 'expect' in t ? t.expect : undefined }));
      if (!stage.check && own.some(t => t.expect === undefined)) fail('ownTests stage has tests without expect and no check' + label);
      // compute expect via reference for check-based exercises
      const refFn = RunnerCore.loadSymbol(sol, fn);
      own.forEach(t => { if (t.expect === undefined) t.expect = refFn(...RunnerCore.clone(t.args)); });
      const spec = { code: sol, refCode: sol, fn, ownSrc: JSON.stringify(own), unordered: stage.unordered };
      if (cfg.harness) spec.harnessSrc = cfg.harness.toString();
      if (stage.check) spec.checkSrc = stage.check.toString();
      if (stage.coverage) spec.coverage = stage.coverage.map(c => ({ label: c.label, hitSrc: c.hit.toString() }));
      const res = [];
      const s = RunnerCore.runOwn(spec, (i, r) => { res[i] = r; }, { guard: true });
      if (s.loadError) fail('own-tests run failed' + label + ': ' + s.loadError);
      else if (s.valid !== s.total) fail('own-tests: reference expectations rejected' + label + '\n' + res.filter(r => !(r.pass && r.expectOk)).map(r => '      · ' + r.name + ' expectOk=' + r.expectOk + ' pass=' + r.pass + ' ' + (r.error || '')).join('\n'));
      else {
        ok();
        if (stage.coverage) {
          const notHit = s.coverage.filter(c => !c.hit).map(c => c.label);
          if (notHit.length) fail('coverage labels never hit by the hidden tests (detector may be wrong): ' + notHit.join(', ') + label); else ok();
        }
      }
    }
    // 5. reasoning question sanity
    stage.reasoning.forEach((q, qi) => {
      if (q.type === 'text') { if (!q.model) fail('text question ' + qi + ' has no model answer' + label); else ok(); return; }
      if (q.type === 'multi') { if (!q.answers || q.answers.some(a => a < 0 || a >= q.choices.length)) fail('multi question ' + qi + ' answers out of range' + label); else ok(); return; }
      if (!(q.answer >= 0 && q.answer < q.choices.length)) fail('question ' + qi + ' answer out of range' + label); else ok();
    });
    if (stage.followUp && stage.followUp.type !== 'text' && !(stage.followUp.answer >= 0 && stage.followUp.answer < stage.followUp.choices.length)) fail('followUp answer out of range' + label);
  });
}

/* ---- widget & quiz sanity ---- */
console.log('\nWidgets & quizzes');
const PATTERNS = null;
Object.values(window.T._widgets).forEach(cfg => {
  if (cfg.type === 'mcq' && !(cfg.answer >= 0 && cfg.answer < cfg.choices.length)) fail('mcq answer out of range: ' + cfg.q.slice(0, 60));
  else if (cfg.type === 'multi' && cfg.answers.some(a => a < 0 || a >= cfg.choices.length)) fail('multi answers out of range: ' + cfg.q.slice(0, 60));
  else if (cfg.type === 'blanks') {
    const markers = (trim(cfg.template).match(/«(\d+)»/g) || []).map(m => +m.slice(1, -1));
    const uniq = new Set(markers);
    if (uniq.size !== markers.length || uniq.size !== cfg.blanks.length || markers.some(m => m < 0 || m >= cfg.blanks.length)) fail('blanks markers mismatch: ' + (cfg.name || cfg.q));
    else if (cfg.blanks.some(b => !(b.answer >= 0 && b.answer < b.choices.length))) fail('blanks answer out of range: ' + (cfg.name || cfg.q));
    else ok();
  }
  else if (cfg.type === 'spotbug') { const n = trim(cfg.code).split('\n').length; if (!(cfg.bugLine >= 1 && cfg.bugLine <= n)) fail('spotbug bugLine out of range: ' + cfg.name); else ok(); }
  else if (cfg.type === 'drill') { cfg.items.forEach(it => { if (!cfg.choices.includes(it.answer)) fail('drill answer not in choices: ' + it.answer + ' — ' + it.prompt.slice(0, 50)); else ok(); }); }
  else if (cfg.type === 'trace') {
    const nodes = new Set(Object.keys(cfg.graph)); Object.values(cfg.graph).flat().forEach(n => nodes.add(n));
    nodes.forEach(n => { if (!cfg.pos[n]) fail('trace node without pos: ' + n); else ok(); });
    if (!nodes.has(cfg.start)) fail('trace start not in graph');
  }
  else if (cfg.type === 'order') { if (!cfg.items || cfg.items.length < 2) fail('order widget with < 2 items'); else ok(); }
  else if (cfg.type === 'exercise') { /* covered above */ }
  else ok();
});
window.MODULES.forEach((m, mi) => m.sections.forEach((s, si) => {
  if (s.type === 'quiz') s.questions.forEach((q, qi) => { if (!(q.answer >= 0 && q.answer < q.choices.length)) fail('quiz ' + mi + '-' + si + ' q' + qi + ' answer out of range'); else ok(); });
  if (s.html && /\$\{/.test(s.html)) fail('unrendered template in ' + mi + '-' + si + ' (' + s.title + ')');
  if (s.html && /undefined/.test(s.html.replace(/undefined\b[^<]*<\/code>/g, '').replace(/<code>[^<]*undefined[^<]*<\/code>/g, '').replace(/tok-kw">undefined/g, '')) && /(?:^|[^\w"'>])undefined(?:[^\w<]|$)/.test(s.html)) console.log('  ? "undefined" appears in ' + mi + '-' + si + ' (' + s.title + ') — check it is intentional');
}));

const nSec = window.MODULES.reduce((n, m) => n + m.sections.length, 0);
const nQ = window.MODULES.reduce((n, m) => n + m.sections.filter(s => s.type === 'quiz').reduce((a, s) => a + s.questions.length, 0), 0);
console.log('\n' + window.MODULES.length + ' modules · ' + nSec + ' sections · ' + Object.keys(window.T._widgets).length + ' widgets · ' + nQ + ' quiz questions');
console.log(checks + ' checks, ' + failures + ' failure(s)');
process.exit(failures ? 1 : 0);
