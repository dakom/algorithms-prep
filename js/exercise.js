/* The staged exercise widget: Reason → Code → Test → Done (per stage; multi-stage
   exercises share one editor across evolving requirements).
   State lives in store.ex[cfg.id]. Registered globally so the dashboard can
   report status/score for every exercise in the course. */
(function () {
  const esc = window.Highlighter.esc;
  const REGISTRY = [];
  const RUBRIC = [
    ['abstraction', 'Correct abstraction', 20],
    ['algorithm', 'Correct algorithm', 20],
    ['implementation', 'Correct implementation', 25],
    ['complexity', 'Complexity', 10],
    ['edge', 'Edge cases / tests', 15],
    ['explanation', 'Clear explanation', 10]
  ];

  function register(cfg) {
    if (!cfg.id) throw new Error('exercise needs an id: ' + cfg.title);
    if (!cfg.stages) {
      cfg.stages = [{ reasoning: cfg.reasoning || [], tests: cfg.tests || [], hints: cfg.hints || [], solution: cfg.solution,
        solutionExplain: cfg.solutionExplain, complexity: cfg.complexity, followUp: cfg.followUp, ownTests: cfg.ownTests, coverage: cfg.coverage,
        ownTemplate: cfg.ownTemplate, check: cfg.check, unordered: cfg.unordered, prompt: null }];
    }
    cfg.stages.forEach(s => {
      s.reasoning = s.reasoning || []; s.tests = s.tests || []; s.hints = s.hints || [];
      // a test with neither expect nor its own check uses the stage-level checker
      s.tests.forEach(t => { if (!t.check && !('expect' in t) && !t.expectThrow && s.check) t.check = s.check; });
    });
    if (!REGISTRY.some(c => c.id === cfg.id)) REGISTRY.push(cfg);
  }

  function getState(store, cfg) {
    store.ex = store.ex || {};
    const st = store.ex[cfg.id] = store.ex[cfg.id] || { stage: 0, phase: 'reason', stages: {}, elapsed: 0 };
    st.stages = st.stages || {};
    return st;
  }
  function answered(q, a) { return !!(a && (q.type === 'text' ? a.grade !== undefined : q.type === 'multi' ? a.checked : a.chosen !== undefined)); }
  /* has this step been done (worked through, whatever the outcome)? → { done, detail } */
  function phaseDone(stage, ss, p) {
    if (p === 'reason') {
      const n = stage.reasoning.filter((q, qi) => answered(q, ss.answers[qi])).length;
      return { done: n === stage.reasoning.length, detail: n + '/' + stage.reasoning.length + ' answered' };
    }
    if (p === 'code') return { done: !!ss.runs, detail: ss.runs ? (ss.passed ? 'all hidden tests pass' : 'tests run · not all passing yet') : 'tests not run yet' };
    if (p === 'test') return { done: !!ss.ownRuns, detail: ss.ownRuns ? ss.ownValid + ' valid test' + (ss.ownValid === 1 ? '' : 's') : 'own tests not run yet' };
    return { done: !!ss.done, detail: ss.done ? 'reviewed' : 'not reviewed yet' };
  }
  function stageState(st, si) {
    return st.stages[si] = st.stages[si] || { answers: {}, hints: 0, passed: false, ownValid: 0, covered: [], done: false };
  }

  /* ---------- status & scoring (used by dashboard too) ---------- */
  function status(cfg, store) {
    const st = (store.ex || {})[cfg.id];
    if (!st) return 'Not started';
    if (st.completedAll) return 'Complete';
    if (st.redo && st.phase === 'reason') return 'Redo';
    const names = { reason: 'Reasoning', code: 'Coding', test: 'Testing', done: 'Reasoning' };
    if (st.phase === 'done' && cfg.stages.length > 1) return 'Coding';
    return names[st.phase] || 'Reasoning';
  }
  function stageScore(cfg, st, si) {
    const stage = cfg.stages[si], ss = stageState(st, si);
    const cats = {};  // cat -> {got, max}
    const add = (cat, got, max) => { const c = cats[cat] || (cats[cat] = { got: 0, max: 0 }); c.got += got; c.max += max; };
    stage.reasoning.forEach((q, qi) => {
      const a = ss.answers[qi];
      const cat = q.cat || (q.type === 'text' ? 'explanation' : 'algorithm');
      if (q.type === 'text') add(cat, a && a.grade !== undefined ? a.grade : 0, 1);
      else add(cat, a && a.first ? 1 : 0, 1);
    });
    // implementation: pass = 25, each hint after the first costs 3
    if (stage.tests.length) {
      const impl = ss.passed ? Math.max(10, 25 - Math.max(0, ss.hints - 1) * 3) : 0;
      add('implementation', impl, 25);
    }
    if (stage.ownTests) {
      const cov = stage.coverage ? stage.coverage.length : 0;
      if (cov) add('edge', Math.min(cov, (ss.covered || []).length), cov);
      else add('edge', ss.ownValid >= 3 ? 1 : 0, 1);
    }
    // scale each present category to its rubric weight
    let got = 0, max = 0;
    const rows = [];
    RUBRIC.forEach(([cat, label, weight]) => {
      const c = cats[cat];
      if (!c || !c.max) return;
      const pts = Math.round(weight * c.got / c.max);
      rows.push({ cat, label, pts, weight });
      got += pts; max += weight;
    });
    return { rows, got, max, pct: max ? Math.round(100 * got / max) : 0 };
  }
  function score(cfg, store) {
    const st = (store.ex || {})[cfg.id];
    if (!st || !st.completedAll) return null;
    const per = cfg.stages.map((_, si) => stageScore(cfg, st, si));
    return Math.round(per.reduce((a, s) => a + s.pct, 0) / per.length);
  }
  function hintsUsed(cfg, store) {
    const st = (store.ex || {})[cfg.id];
    if (!st) return 0;
    return Object.values(st.stages || {}).reduce((a, s) => a + (s.hints || 0), 0);
  }
  /* rubric categories aggregated across every completed exercise → { cat: { got, max } } */
  function categoryTotals(store) {
    const totals = {};
    REGISTRY.forEach(cfg => {
      const st = (store.ex || {})[cfg.id];
      if (!st || !st.completedAll) return;
      cfg.stages.forEach((_, si) => stageScore(cfg, st, si).rows.forEach(r => {
        const t = totals[r.cat] || (totals[r.cat] = { got: 0, max: 0, label: r.label });
        t.got += r.pts; t.max += r.weight;
      }));
    });
    return totals;
  }
  /* "Redo cold": archive this attempt and start over from a blank editor */
  function redo(cfg, store) {
    const st = (store.ex || {})[cfg.id];
    if (!st) return;
    const attempts = st.attempts || [];
    attempts.push({ score: score(cfg, store), at: st.completedAt || Date.now(), hints: hintsUsed(cfg, store), elapsed: Math.round(st.elapsed || 0) });
    store.ex[cfg.id] = { stage: 0, phase: 'reason', stages: {}, elapsed: 0, attempts, redo: true };
  }

  /* ---------- rendering ---------- */
  function fmtTime(s) { s = Math.floor(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function argsText(args) { return (args || []).map(a => RunnerCore.fmt(a)).join(', '); }

  /* ---------- console panel & scratch runs (shared with the kata widget) ---------- */
  function lineCount(text) { return text ? text.split('\n').length : 0; }
  /* number of editor lines the provided prelude pushes the learner's code down by */
  function preludeOffset(prelude) { return prelude ? lineCount(window.T.trim(prelude)) + 1 : 0; }
  function locHtml(loc) {
    if (!loc) return '';
    if (loc.provided) return ' <span class="ex-loc">in the provided code</span>';
    if (!loc.line) return '';
    return ' <a class="ex-loc" href="#" data-line="' + loc.line + '" title="jump to this line">line ' + loc.line + (loc.col ? ':' + loc.col : '') + '</a>';
  }
  /* make "line N" links in `root` move the editor caret */
  function wireLineLinks(root, editor) {
    if (!editor) return;
    root.querySelectorAll('[data-line]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); editor.gotoLine(+a.dataset.line); }));
  }
  function logsHtml(logs) { return logs.map(l => '<div class="repl-line' + (/^[⚠✖]/.test(l) ? ' repl-err' : '') + '">' + esc(l) + '</div>').join(''); }
  /* out: { running?, logs, error?, errorLoc?, timedOut?, hint? } */
  function paintConsole(el, out, editor) {
    const logs = (out && out.logs) || [];
    let body = '';
    if (out && out.running) body = '<div class="repl-line repl-dim">Running…</div>';
    else {
      body = logsHtml(logs);
      if (out && out.error) body += '<div class="repl-line repl-err">✖ ' + esc(out.error) + locHtml(out.errorLoc) + '</div>';
      if (out && out.timedOut) body += '<div class="repl-line repl-warn">⏱ Timed out after ' + (window.Runner.TIMEOUT_MS / 1000) + 's — probably an infinite loop' + (logs.length ? '; the lines above are what printed before it hung.' : '.') + '</div>';
      if (!body) body = '<div class="repl-line repl-dim">' + (out && out.hint ? esc(out.hint) : '(no output) — nothing called console.log. Run code executes the file top-to-bottom, so a function that is only defined never runs: call it at the bottom, e.g. console.log(myFn(…)).') + '</div>';
    }
    el.innerHTML = '<div class="repl-out-head"><span>console</span>' + (logs.length ? '<span>' + logs.length + ' line' + (logs.length > 1 ? 's' : '') + '</span>' : '') + '</div>' + body;
    el.classList.toggle('has-error', !!(out && (out.error || out.timedOut)));
    wireLineLinks(el, editor);
  }
  /* Run the learner's file top-to-bottom (no tests) and show its console output. If the
     file never calls the exercise's function, it is called with the first test's input.
     o: { code (editor text), prelude?, panel, editor?, btn?, fn?, tests?, isClass? } → Promise */
  function sampleArgs(tests) {
    const t = (tests || []).find(t => Array.isArray(t.args) && !t.run);
    return t ? t.args : null;
  }
  function scratch(o) {
    const lineOffset = preludeOffset(o.prelude);
    const full = (o.prelude ? window.T.trim(o.prelude) + '\n\n' : '') + o.code;
    if (o.btn) { o.btn.disabled = true; }
    paintConsole(o.panel, { running: true });
    return window.Runner.run({ mode: 'scratch', spec: { code: full, lineOffset, fn: o.fn, sampleArgs: sampleArgs(o.tests), isClass: !!o.isClass } }, {
      onResult: () => {},
      onTimeout: () => {},
      onDone: summary => {
        if (o.btn) o.btn.disabled = false;
        if (summary.timedOut) { paintConsole(o.panel, { logs: summary.logs || [], timedOut: true }, o.editor); return; }
        if (summary.loadError) { paintConsole(o.panel, { logs: [], error: summary.loadError }, o.editor); return; }
        const out = { logs: summary.logs || [], error: summary.error, errorLoc: summary.errorLoc };
        paintConsole(o.panel, out, o.editor);
        if (summary.syntax && !summary.errorLoc) window.Runner.locateSyntaxError(full, lineOffset).then(loc => {
          if (!loc || !loc.line) return;
          out.errorLoc = { line: loc.line, col: loc.col };
          paintConsole(o.panel, out, o.editor);
        });
      }
    });
  }
  const CONSOLE_HINT = '▶ Run code executes your whole file (no tests) and prints console.log output here — errors show the line. If the file never calls the function, it’s called for you with the first test’s input.';

  /* repaint just the ✓ marks on the step tabs after a run, without re-rendering the editor */
  function refreshStepper(body, cfg, st, si) {
    const root = body.parentElement;   // the exercise root: head + stepper + prompt + body
    const stage = cfg.stages[si], ss = stageState(st, si);
    root.querySelectorAll('[data-phase]').forEach(b => {
      const d = phaseDone(stage, ss, b.dataset.phase);
      b.classList.toggle('done', d.done);
      b.title = d.detail + ' — click to jump here';
      const has = b.querySelector('.ex-phase-check');
      if (d.done && !has) b.insertAdjacentHTML('afterbegin', '<span class="ex-phase-check">✓</span>');
      if (!d.done && has) has.remove();
    });
  }

  function render(el, cfg, store, save) {
    const st = getState(store, cfg);
    const si = Math.min(st.stage, cfg.stages.length - 1);
    const stage = cfg.stages[si];
    const ss = stageState(st, si);
    const multi = cfg.stages.length > 1;
    if (st.phase === 'done' && si === cfg.stages.length - 1 && !st.completedAll) { st.completedAll = true; st.completedAt = Date.now(); }   // before the header reads status()
    const phases = ['reason'].concat(stage.tests.length ? ['code'] : []).concat(stage.ownTests ? ['test'] : []).concat(['done']);
    const phaseIdx = Math.max(0, phases.indexOf(st.phase));
    const icon = cfg.interview ? '🎤' : (multi ? '🏗' : '🧪');

    let html = '<div class="ex-head"><div class="ex-title"><span class="ex-icon">' + icon + '</span><div><div class="ex-kicker">' +
      (cfg.interview ? 'Mock interview' : multi ? 'Project · evolving requirements' : 'Exercise') + '</div><h3>' + cfg.title + '</h3></div></div>' +
      '<div class="ex-meta"><span class="ex-status ' + status(cfg, store).toLowerCase().replace(/\s/g, '-') + '">' + status(cfg, store) + '</span>' +
      '<span class="ex-clock" title="Your time on this exercise / suggested budget">⏱ <span data-clock>' + fmtTime(st.elapsed || 0) + '</span>' + (cfg.time ? ' / ~' + cfg.time + ' min' : '') + '</span>' +
      '<button class="ghost mini danger" data-act="restart-top" title="Clear this exercise’s code, answers, timer and score">↺ Restart</button></div></div>';

    // stepper
    html += '<div class="ex-stepper">';
    if (multi) html += '<div class="ex-stages">' + cfg.stages.map((s, i) => '<button class="ex-stage' + (i === si ? ' active' : i < si || st.completedAll ? ' done' : '') + '" data-stage="' + i + '" title="Jump to this requirement">' + (i + 1) + '. ' + esc(s.title || ('Stage ' + (i + 1))) + '</button>').join('') + '</div>';
    html += '<div class="ex-phases">' + phases.map((p, i) => {
      const d = phaseDone(stage, ss, p);
      return '<button class="ex-phase' + (i === phaseIdx ? ' active' : '') + (d.done ? ' done' : '') + '" data-phase="' + p + '" title="' + esc(d.detail) + ' — click to jump here">' +
        (d.done ? '<span class="ex-phase-check">✓</span>' : '') + { reason: '1 · Reason', code: '2 · Code', test: '3 · Test', done: phases.length + ' · Review' }[p] + '</button>';
    }).join('<span class="ex-arrow">›</span>') + '</div></div>';

    // prompt (always visible; stage prompt for multi)
    html += '<div class="ex-prompt">' + (cfg.prompt || '') + (multi && stage.prompt ? '<div class="ex-stage-prompt"><div class="ex-stage-kicker">Requirement ' + (si + 1) + ' of ' + cfg.stages.length + ' — ' + esc(stage.title || '') + '</div>' + stage.prompt + '</div>' : '') + '</div>';

    html += '<div class="ex-body" data-body></div>';
    el.innerHTML = html;
    const body = el.querySelector('[data-body]');
    if (st.phase === 'reason') renderReason(body, cfg, st, si, save, () => render(el, cfg, store, save));
    else if (st.phase === 'code') renderCode(body, cfg, st, si, save, () => render(el, cfg, store, save));
    else if (st.phase === 'test') renderOwnTests(body, cfg, st, si, save, () => render(el, cfg, store, save));
    else renderDone(body, cfg, st, si, save, () => render(el, cfg, store, save), store);
    // every step is directly reachable — the gates are advice, not locks
    el.querySelectorAll('[data-phase]').forEach(b => b.addEventListener('click', () => {
      if (b.dataset.phase === st.phase) return;
      st.phase = b.dataset.phase; delete st.redo; save(); render(el, cfg, store, save);
    }));
    el.querySelectorAll('[data-stage]').forEach(b => b.addEventListener('click', () => {
      const i = +b.dataset.stage;
      if (i === si) return;
      st.stage = i; st.phase = 'reason'; save(); render(el, cfg, store, save);
    }));
    el.querySelector('[data-act=restart-top]').addEventListener('click', () => {
      if (!confirm('Restart this exercise from scratch? Your code, answers, timer and score here will be cleared.')) return;
      delete store.ex[cfg.id]; save(); render(el, cfg, store, save);
    });
    startClock(el, st, save);
    window.dispatchEvent(new CustomEvent('exercise-progress', { detail: { id: cfg.id } }));
  }

  function startClock(el, st, save) {
    if (el._clock) clearInterval(el._clock);
    if (st.completedAll) return;
    let last = Date.now(), unsaved = 0;
    el._clock = setInterval(() => {
      if (!document.contains(el)) { clearInterval(el._clock); return; }
      if (document.hidden) { last = Date.now(); return; }
      const now = Date.now();
      st.elapsed = (st.elapsed || 0) + (now - last) / 1000; last = now;
      const c = el.querySelector('[data-clock]');
      if (c) c.textContent = fmtTime(st.elapsed);
      if (++unsaved >= 5) { unsaved = 0; save(); }
    }, 1000);
  }

  /* ---------- phase 1: reasoning gate ---------- */
  function renderReason(body, cfg, st, si, save, rerender) {
    const stage = cfg.stages[si], ss = stageState(st, si);
    const allDone = stage.reasoning.every((q, qi) => answered(q, ss.answers[qi]));
    let html = '<div class="ex-phase-intro"><strong>Think before you type.</strong> ' +
      (cfg.interview ? 'The interviewer is waiting for you to talk through it — answer these as you would out loud.' : 'In the real interview this is the part you say out loud before writing a line of code.') + ' You can move on at any time (the step tabs above work too); unanswered questions just score 0.</div>';
    html += stage.reasoning.map((q, qi) => renderQuestion(q, qi, ss.answers[qi])).join('');
    if (!stage.reasoning.length) html += '<p class="dim">No reasoning questions for this stage — go straight to the editor.</p>';
    const left = stage.reasoning.filter((q, qi) => !answered(q, ss.answers[qi])).length;
    html += '<div class="ex-actions"><button class="' + (allDone || !stage.reasoning.length ? 'primary' : 'ghost') + '" data-act="unlock">' + (stage.tests.length ? 'Continue → code' : 'Continue → review') + '</button>' +
      (left ? '<span class="dim">' + left + ' question' + (left > 1 ? 's' : '') + ' unanswered</span>' : '') + '</div>';
    body.innerHTML = html;
    bindQuestions(body, stage, ss, save, () => renderReason(body, cfg, st, si, save, rerender));
    body.querySelector('[data-act=unlock]').addEventListener('click', () => { st.phase = stage.tests.length ? 'code' : 'done'; delete st.redo; save(); rerender(); });
  }

  function renderQuestion(q, qi, a) {
    a = a || {};
    const perm = window.T.permute('exq:' + q.q, (q.choices || []).length);
    let html = '<div class="ex-q" data-qi="' + qi + '"><div class="ex-q-cat">' + esc(catLabel(q)) + '</div><div class="q-text">' + q.q + '</div>';
    if (q.type === 'text') {
      const submitted = a.text !== undefined && a.submitted;
      html += '<textarea class="ex-text" rows="3" placeholder="' + esc(q.placeholder || 'Two or three sentences, as you would say them to the interviewer…') + '"' + (submitted ? ' disabled' : '') + '>' + esc(a.text || '') + '</textarea>';
      if (!submitted) html += '<div class="ex-q-actions"><button class="primary mini" data-act="submit-text"' + ((a.text || '').trim().length >= (q.min || 30) ? '' : ' disabled') + '>Submit</button><span class="dim" data-count>' + (a.text || '').trim().length + ' / ' + (q.min || 30) + ' chars</span></div>';
      else {
        html += '<div class="ex-model"><div class="ex-model-title">Model answer — compare with yours</div>' + q.model + '</div>';
        if (a.grade === undefined) html += '<div class="ex-q-actions"><span>Honest self-grade:</span><button class="ghost mini" data-grade="1">✓ Covered the key points</button><button class="ghost mini" data-grade="0.5">~ Partially</button><button class="ghost mini" data-grade="0">✗ Missed it</button></div>';
        else html += '<div class="ex-q-actions"><span class="dim">Self-graded: ' + (a.grade === 1 ? '✓ covered' : a.grade === 0.5 ? '~ partial' : '✗ missed') + '</span></div>';
      }
    } else if (q.type === 'multi') {
      const picks = a.picks || [];
      html += perm.map(ci => {
        let cls = 'choice multi';
        const picked = picks.includes(ci);
        if (picked && !a.checked) cls += ' picked';
        if (a.checked) { const should = q.answers.includes(ci); if (should && picked) cls += ' correct'; else if (should && !picked) cls += ' missed'; else if (!should && picked) cls += ' wrong'; }
        return '<button class="' + cls + '" data-ci="' + ci + '"' + (a.checked ? ' disabled' : '') + '><span class="letter">' + (picked ? '☑' : '☐') + '</span><span>' + q.choices[ci] + '</span></button>';
      }).join('');
      if (a.checked) html += '<div class="widget-explain"><div class="verdict ' + (a.first ? 'v-right' : 'v-wrong') + '">' + (a.first ? '✓ Exactly right' : '✗ Not quite — green = right, amber = missed, red = shouldn’t be picked') + '</div>' + (q.explain || '') + '</div>';
      else html += '<div class="ex-q-actions"><button class="primary mini" data-act="check-multi">Check</button></div>';
    } else {
      const answered = a.chosen !== undefined;
      html += perm.map((ci, pos) => {
        let cls = 'choice';
        if (answered) { if (ci === q.answer) cls += ' correct'; else if (ci === a.chosen) cls += ' wrong'; }
        return '<button class="' + cls + '" data-ci="' + ci + '"' + (answered ? ' disabled' : '') + '><span class="letter">' + String.fromCharCode(65 + pos) + '</span><span>' + q.choices[ci] + '</span></button>';
      }).join('');
      if (answered) html += '<div class="widget-explain"><div class="verdict ' + (a.chosen === q.answer ? 'v-right' : 'v-wrong') + '">' + (a.chosen === q.answer ? '✓ Correct' : '✗ Not quite — the answer is ' + String.fromCharCode(65 + perm.indexOf(q.answer))) + '</div>' + (q.explain || '') + '</div>';
    }
    return html + '</div>';
  }
  function catLabel(q) {
    const cat = q.cat || (q.type === 'text' ? 'explanation' : 'algorithm');
    return { abstraction: 'Abstraction', algorithm: 'Algorithm & data structures', complexity: 'Complexity', edge: 'Edge cases', explanation: 'Explain it' }[cat] || cat;
  }
  function bindQuestions(body, stage, ss, save, rerender) {
    body.querySelectorAll('.ex-q').forEach(qEl => {
      const qi = +qEl.dataset.qi, q = stage.reasoning[qi];
      const a = ss.answers[qi] = ss.answers[qi] || {};
      if (q.type === 'text') {
        const ta = qEl.querySelector('.ex-text'), btn = qEl.querySelector('[data-act=submit-text]'), cnt = qEl.querySelector('[data-count]');
        if (ta && !ta.disabled) ta.addEventListener('input', () => {
          a.text = ta.value; save();
          const n = ta.value.trim().length;
          if (cnt) cnt.textContent = n + ' / ' + (q.min || 30) + ' chars';
          if (btn) btn.disabled = n < (q.min || 30);
        });
        if (btn) btn.addEventListener('click', () => { a.submitted = true; save(); rerender(); });
        qEl.querySelectorAll('[data-grade]').forEach(g => g.addEventListener('click', () => { a.grade = +g.dataset.grade; save(); rerender(); }));
      } else if (q.type === 'multi') {
        qEl.querySelectorAll('.choice').forEach(c => c.addEventListener('click', () => {
          if (a.checked) return;
          const ci = +c.dataset.ci, p = a.picks || (a.picks = []);
          const at = p.indexOf(ci); if (at === -1) p.push(ci); else p.splice(at, 1);
          save(); rerender();
        }));
        const chk = qEl.querySelector('[data-act=check-multi]');
        if (chk) chk.addEventListener('click', () => {
          a.checked = true;
          const p = (a.picks || []).slice().sort(), ans = q.answers.slice().sort();
          a.first = p.length === ans.length && p.every((v, i) => v === ans[i]);
          save(); rerender();
        });
      } else {
        qEl.querySelectorAll('.choice').forEach(c => c.addEventListener('click', () => {
          if (a.chosen !== undefined) return;
          a.chosen = +c.dataset.ci; a.first = a.chosen === q.answer;
          save(); rerender();
        }));
      }
    });
  }

  /* ---------- phase 2: code against hidden tests ---------- */
  function renderCode(body, cfg, st, si, save, rerender) {
    const stage = cfg.stages[si], ss = stageState(st, si);
    const code = st.code !== undefined ? st.code : window.T.trim(cfg.starter || '');
    let html = '';
    if (cfg.prelude) html += '<details class="ex-prelude"><summary>Provided code (available to your solution)</summary>' + window.T.code('js', 'provided', cfg.prelude) + '</details>';
    const fnName = stage.fn || cfg.fn;
    html += '<div class="ex-editor-wrap"><div class="codeblock-header"><span>' + esc(fnName + ((stage.isClass || cfg.isClass) ? ' (class)' : '()')) + ' — your solution</span><span class="kbd-hint">⌘/Ctrl+Enter runs the tests · ⇧⌘/Ctrl+Enter runs the code</span></div><div class="editor-host"></div></div>';
    html += '<div class="ex-actions"><button class="primary" data-act="run">▶ Run hidden tests</button>' +
      '<button class="ghost" data-act="scratch" title="Execute the file top-to-bottom with no tests; console.log output and errors (with line numbers) appear in the console panel">▶ Run code</button>' +
      '<button class="ghost" data-act="hint">' + (cfg.interview ? '🙋 Ask interviewer' : '💡 Hint') + ' (' + ss.hints + '/' + stage.hints.length + ')</button>' +
      '<button class="ghost" data-act="reset">Reset code</button>' +
      '<button class="ghost" data-act="back">← Back to reasoning</button></div>';
    html += '<div class="ex-hints" data-hints>' + stage.hints.slice(0, ss.hints).map((h, i) => '<div class="ex-hint"><span class="ex-hint-n">Hint ' + (i + 1) + '</span>' + h + '</div>').join('') + '</div>';
    html += '<div class="repl-out ex-console" data-console></div>';
    html += '<div class="ex-results" data-results>' + (ss.lastResults ? '' : '<div class="ex-results-empty">Tests haven’t run yet. A failing test shows its inputs, what you returned, any error (with its line) and everything you console.log’d — that’s the loop: run, read, fix.</div>') + '</div>';
    html += '<div class="ex-actions" data-continue></div>';
    body.innerHTML = html;

    const ed = window.Editor.create(body.querySelector('.editor-host'), {
      value: code, minRows: 10,
      onChange: v => { st.code = v; save(); },
      onRun: () => runTests(),
      onRunAlt: () => runScratch()
    });
    const resultsEl = body.querySelector('[data-results]');
    const contEl = body.querySelector('[data-continue]');
    const consoleEl = body.querySelector('[data-console]');
    paintConsole(consoleEl, { logs: [], hint: CONSOLE_HINT });
    const lineOffset = preludeOffset(cfg.prelude);
    if (ss.lastResults) paintResults(resultsEl, ss.lastResults, stage.tests, ss.lastSummary, { editor: ed, code: () => (cfg.prelude ? window.T.trim(cfg.prelude) + '\n\n' : '') + ed.value, lineOffset });
    let scratching = false;
    function runScratch() {
      if (scratching) return;
      scratching = true;
      scratch({ code: ed.value, prelude: cfg.prelude, panel: consoleEl, editor: ed, btn: body.querySelector('[data-act=scratch]'), fn: fnName, tests: stage.tests, isClass: !!(stage.isClass || cfg.isClass) }).then(() => { scratching = false; });
    }
    body.querySelector('[data-act=scratch]').addEventListener('click', runScratch);
    paintContinue();

    function paintContinue() {
      const label = stage.ownTests ? 'write your own tests' : 'review';
      contEl.innerHTML = ss.passed
        ? '<div class="ex-pass-banner">✓ All tests pass.' + (ss.hints ? ' (' + ss.hints + ' hint' + (ss.hints > 1 ? 's' : '') + ' used)' : ' No hints — nice.') + '</div><button class="primary" data-act="continue">Continue → ' + label + '</button>'
        : '<button class="ghost" data-act="continue" title="Move on without passing the hidden tests — implementation scores 0 until they pass">Skip → ' + label + '</button>';
      const c = contEl.querySelector('[data-act=continue]');
      if (c) c.addEventListener('click', () => { st.phase = stage.ownTests ? 'test' : 'done'; save(); rerender(); });
    }

    let running = false;
    function runTests() {
      if (running) return;
      running = true;
      const btn = body.querySelector('[data-act=run]');
      btn.disabled = true; btn.textContent = '… running';
      const results = [];
      resultsEl.innerHTML = '<div class="ex-results-empty">Running…</div>';
      const userCode = (cfg.prelude ? window.T.trim(cfg.prelude) + '\n\n' : '') + ed.value;
      window.Runner.run({ mode: 'suite', spec: { code: userCode, fn: fnName, isClass: !!cfg.isClass, harness: cfg.harness, tests: stage.tests, lineOffset } }, {
        onResult: (i, r) => { results[i] = r; },
        onTimeout: (i, logs) => { results[i] = { name: stage.tests[i].name, timeout: true, logs }; },
        onDone: summary => {
          running = false;
          btn.disabled = false; btn.textContent = '▶ Run hidden tests';
          for (let i = 0; i < stage.tests.length; i++) if (!results[i]) results[i] = { name: stage.tests[i].name, skipped: true };
          ss.lastResults = results; ss.lastSummary = summary;
          ss.runs = (ss.runs || 0) + 1;
          const allPass = !summary.loadError && !summary.timedOut && results.every(r => r.pass);
          if (allPass && !ss.passed) ss.passed = true;
          save();
          paintResults(resultsEl, results, stage.tests, summary, { editor: ed, code: () => userCode, lineOffset });
          paintContinue();
          refreshStepper(body, cfg, st, si);
          if (allPass) contEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      });
    }
    body.querySelector('[data-act=run]').addEventListener('click', runTests);
    body.querySelector('[data-act=hint]').addEventListener('click', () => {
      if (ss.hints >= stage.hints.length) return;
      ss.hints++; save();
      body.querySelector('[data-hints]').insertAdjacentHTML('beforeend', '<div class="ex-hint"><span class="ex-hint-n">Hint ' + ss.hints + '</span>' + stage.hints[ss.hints - 1] + '</div>');
      body.querySelector('[data-act=hint]').textContent = (cfg.interview ? '🙋 Ask interviewer' : '💡 Hint') + ' (' + ss.hints + '/' + stage.hints.length + ')';
    });
    body.querySelector('[data-act=reset]').addEventListener('click', () => {
      if (!confirm('Replace your code with the starter template?')) return;
      delete st.code; save(); rerender();
    });
    body.querySelector('[data-act=back]').addEventListener('click', () => { st.phase = 'reason'; save(); rerender(); });
    if (!ss.lastResults) ed.focus();
  }

  /* opts: { editor?, code?: () => fullCode, lineOffset? } — editor makes "line N" clickable;
     code/lineOffset let a syntax error be located after the fact (new Function() gives no line). */
  function paintResults(el, results, tests, summary, opts) {
    opts = opts || {};
    const editor = opts.editor;
    const loadLogs = summary && summary.loadLogs && summary.loadLogs.length
      ? '<div class="ex-toplevel"><div class="repl-out-head"><span>top-level output</span><span>printed while loading your file, before any test ran</span></div>' + logsHtml(summary.loadLogs) + '</div>' : '';
    if (summary && summary.loadError) {
      el.innerHTML = loadLogs + '<div class="ex-load-error"><strong>Couldn’t run:</strong> ' + esc(summary.loadError) + locHtml(summary.loadErrorLoc) + '</div>';
      wireLineLinks(el, editor);
      if (summary.syntax && !summary.loadErrorLoc && opts.code && window.Runner && window.Runner.locateSyntaxError) {
        window.Runner.locateSyntaxError(opts.code(), opts.lineOffset || 0).then(loc => {
          if (!loc || !loc.line) return;
          summary.loadErrorLoc = { line: loc.line, col: loc.col };
          const box = el.querySelector('.ex-load-error');
          if (box) { box.insertAdjacentHTML('beforeend', locHtml(summary.loadErrorLoc)); wireLineLinks(box, editor); }
        });
      }
      return;
    }
    const passed = results.filter(r => r.pass).length;
    let html = '<div class="ex-results-head"><span>' + passed + ' / ' + tests.length + ' tests passing</span>' +
      (summary && summary.fallback ? '<span class="dim">(main-thread mode: loops are guarded at 3M iterations)</span>' : '') + '</div>' + loadLogs;
    const consoleKv = r => (r.logs && r.logs.length ? '<div class="ex-kv"><span>console</span><pre class="ex-logs">' + esc(r.logs.join('\n')) + '</pre></div>' : '');
    html += results.map((r, i) => {
      const t = tests[i];
      if (r.timeout) return '<div class="ex-test timeout"><div class="ex-test-row"><span class="ex-test-mark">⏱</span><span class="ex-test-name">' + esc(t.name) + '</span><span class="ex-test-tag">timed out after ' + (window.Runner.TIMEOUT_MS / 1000) + 's</span></div>' +
        '<div class="ex-test-detail"><div><strong>Probably an infinite loop.</strong> In a graph traversal that almost always means a cycle and no <code>visited</code> set (or marking visited too late); in a loop, an index that never advances.</div>' +
        (t.args ? '<div class="ex-kv"><span>args</span><code>' + esc(argsText(t.args)) + '</code></div>' : '') +
        (r.logs && r.logs.length ? '<div class="ex-kv"><span>console</span><pre class="ex-logs">' + esc(r.logs.join('\n')) + '</pre></div><div class="dim">That’s what printed before it hung — a console.log inside the loop shows what stops changing.</div>' : '') + '</div></div>';
      if (r.skipped) return '<div class="ex-test skipped"><div class="ex-test-row"><span class="ex-test-mark">–</span><span class="ex-test-name">' + esc(t.name) + '</span><span class="ex-test-tag">not run</span></div></div>';
      let detail = '';
      const hasLogs = r.logs && r.logs.length;
      if (!r.pass || r.note) {
        detail = '<div class="ex-test-detail">' +
          (t.args && !t.run ? '<div class="ex-kv"><span>args</span><code>' + esc(argsText(t.args)) + '</code></div>' : '') +
          (t.desc ? '<div class="ex-kv"><span>scenario</span><span>' + t.desc + '</span></div>' : '') +
          (r.error ? '<div class="ex-kv err"><span>error</span><code>' + esc(r.error) + locHtml(r.errorLoc) + '</code></div>' : '') +
          (!r.error ? '<div class="ex-kv"><span>expected</span><code>' + esc(r.expected) + '</code></div><div class="ex-kv"><span>got</span><code>' + esc(r.actual) + '</code></div>' : '') +
          (r.note ? '<div class="ex-kv warn"><span>note</span><span>' + esc(r.note) + '</span></div>' : '') +
          consoleKv(r) + '</div>';
      } else if (hasLogs) {
        detail = '<div class="ex-test-detail">' + (t.args && !t.run ? '<div class="ex-kv"><span>args</span><code>' + esc(argsText(t.args)) + '</code></div>' : '') + consoleKv(r) + '</div>';
      }
      return '<div class="ex-test ' + (r.pass ? 'pass' : 'fail') + '"><div class="ex-test-row"><span class="ex-test-mark">' + (r.pass ? '✓' : '✗') + '</span><span class="ex-test-name">' + esc(t.name) + '</span>' + (r.pass && r.note ? '<span class="ex-test-tag warn">note</span>' : '') + (r.pass && hasLogs ? '<span class="ex-test-tag dim">console</span>' : '') + '</div>' + detail + '</div>';
    }).join('');
    el.innerHTML = html;
    wireLineLinks(el, editor);
  }

  /* ---------- phase 3: write your own tests ---------- */
  function renderOwnTests(body, cfg, st, si, save, rerender) {
    const stage = cfg.stages[si], ss = stageState(st, si);
    const tmpl = st.own !== undefined ? st.own : window.T.trim(stage.ownTemplate || cfg.ownTemplate || ('[\n  // { name: "describe the case", args: [ /* arguments to ' + cfg.fn + ' */ ], expect: /* value */ },\n]'));
    let html = '<div class="ex-phase-intro"><strong>Now test it like an interviewer would.</strong> Write at least <strong>3</strong> test cases as data. For each one we check two things: does <em>your</em> function pass it, and is your <code>expect</code> value actually right (the reference solution is the judge). ' +
      (stage.coverage ? 'Light up the edge-case categories below — they’re what an interviewer listens for.' : '') + '</div>';
    if (stage.coverage) html += '<div class="ex-coverage" data-cov>' + stage.coverage.map(c => '<span class="cov-chip' + ((ss.covered || []).includes(c.label) ? ' hit' : '') + '">' + esc(c.label) + '</span>').join('') + '</div>';
    html += '<div class="ex-editor-wrap"><div class="codeblock-header"><span>my-tests.js — an array of { name, args, expect }</span><span class="kbd-hint">⌘/Ctrl+Enter runs</span></div><div class="editor-host"></div></div>';
    html += '<div class="ex-actions"><button class="primary" data-act="run">▶ Run my tests</button><button class="ghost" data-act="back">← Back to code</button></div>';
    html += '<div class="ex-results" data-results></div><div class="ex-actions" data-continue></div>';
    body.innerHTML = html;
    const ed = window.Editor.create(body.querySelector('.editor-host'), { value: tmpl, minRows: 8, onChange: v => { st.own = v; save(); }, onRun: () => run() });
    const resultsEl = body.querySelector('[data-results]'), contEl = body.querySelector('[data-continue]');
    function paintContinue() {
      const ok = ss.ownValid >= 3;
      contEl.innerHTML = ok
        ? '<div class="ex-pass-banner">✓ ' + ss.ownValid + ' valid tests' + (stage.coverage ? ' · ' + (ss.covered || []).length + '/' + stage.coverage.length + ' edge categories covered' : '') + '</div><button class="primary" data-act="continue">Finish → review &amp; score</button>'
        : '<button class="ghost" data-act="continue" title="Move on with fewer than 3 valid tests — the edge-case rubric line scores what you covered">Skip → review &amp; score</button>' + (ss.ownValid ? '<span class="dim">' + ss.ownValid + ' valid so far — 3 gets full marks.</span>' : '');
      const c = contEl.querySelector('[data-act=continue]');
      if (c) c.addEventListener('click', () => { st.phase = 'done'; save(); rerender(); });
    }
    paintContinue();
    let running = false;
    function run() {
      if (running) return;
      running = true;
      const btn = body.querySelector('[data-act=run]'); btn.disabled = true; btn.textContent = '… running';
      resultsEl.innerHTML = '<div class="ex-results-empty">Running…</div>';
      const results = [];
      const userCode = (cfg.prelude ? window.T.trim(cfg.prelude) + '\n\n' : '') + (st.code !== undefined ? st.code : cfg.starter);
      const refCode = (cfg.prelude ? window.T.trim(cfg.prelude) + '\n\n' : '') + window.T.trim(stage.solution);
      window.Runner.run({ mode: 'own', spec: { code: userCode, refCode, fn: stage.fn || cfg.fn, harness: cfg.harness, ownSrc: ed.value, check: stage.check, unordered: stage.unordered, coverage: stage.coverage, lineOffset: preludeOffset(cfg.prelude) } }, {
        onResult: (i, r) => { results[i] = r; },
        onTimeout: (i, logs) => { results[i] = { name: 'test ' + (i + 1), timeout: true, logs }; },
        onDone: summary => {
          running = false; btn.disabled = false; btn.textContent = '▶ Run my tests';
          if (summary.loadError) { resultsEl.innerHTML = '<div class="ex-load-error"><strong>Couldn’t run:</strong> ' + esc(summary.loadError) + locHtml(summary.loadErrorLoc) + (summary.syntax ? '<div class="dim">(the error is in your solution — go back to the code step to fix it)</div>' : '') + '</div>'; return; }
          ss.ownRuns = (ss.ownRuns || 0) + 1;
          ss.ownValid = Math.max(ss.ownValid || 0, summary.valid || 0);
          if (summary.coverage) ss.covered = Array.from(new Set((ss.covered || []).concat(summary.coverage.filter(c => c.hit).map(c => c.label))));
          save();
          refreshStepper(body, cfg, st, si);
          const cov = body.querySelector('[data-cov]');
          if (cov && stage.coverage) cov.innerHTML = stage.coverage.map(c => '<span class="cov-chip' + ((ss.covered || []).includes(c.label) ? ' hit' : '') + '">' + esc(c.label) + '</span>').join('');
          resultsEl.innerHTML = '<div class="ex-results-head"><span>' + (summary.valid || 0) + ' / ' + results.length + ' valid tests' + (summary.timedOut ? ' (timed out)' : '') + '</span></div>' +
            results.map(r => {
              if (r.timeout) return '<div class="ex-test timeout"><div class="ex-test-row"><span class="ex-test-mark">⏱</span><span class="ex-test-name">' + esc(r.name) + '</span><span class="ex-test-tag">timed out</span></div>' + (r.logs && r.logs.length ? '<div class="ex-test-detail"><div class="ex-kv"><span>console</span><pre class="ex-logs">' + esc(r.logs.join('\n')) + '</pre></div></div>' : '') + '</div>';
              const ok = r.pass && r.expectOk;
              const consoleKv = r.logs && r.logs.length ? '<div class="ex-kv"><span>console</span><pre class="ex-logs">' + esc(r.logs.join('\n')) + '</pre></div>' : '';
              let detail = '';
              if (ok && consoleKv) detail = '<div class="ex-test-detail">' + consoleKv + '</div>';
              if (!ok) detail = '<div class="ex-test-detail">' +
                (r.error ? '<div class="ex-kv err"><span>error</span><code>' + esc(r.error) + locHtml(r.errorLoc) + '</code></div>' :
                  (!r.expectOk ? '<div class="ex-kv warn"><span>your expect</span><code>' + esc(r.expected) + '</code></div><div class="ex-kv"><span>reference says</span><code>' + esc(r.refActual) + '</code></div><div class="dim">Your expected value doesn’t match the reference — re-check the test, not the code.</div>' : '') +
                  (!r.pass && r.expectOk ? '<div class="ex-kv"><span>expected</span><code>' + esc(r.expected) + '</code></div><div class="ex-kv"><span>your fn returned</span><code>' + esc(r.actual) + '</code></div><div class="dim">Your expectation is right but your function fails it — a real bug your hidden tests missed. Go back and fix it.</div>' : '')) + consoleKv + '</div>';
              return '<div class="ex-test ' + (ok ? 'pass' : 'fail') + '"><div class="ex-test-row"><span class="ex-test-mark">' + (ok ? '✓' : '✗') + '</span><span class="ex-test-name">' + esc(r.name) + '</span>' +
                (ok ? '' : '<span class="ex-test-tag">' + (r.error ? 'error' : !r.expectOk ? 'wrong expectation' : 'your fn fails') + '</span>') + '</div>' + detail + '</div>';
            }).join('');
          paintContinue();
        }
      });
    }
    body.querySelector('[data-act=run]').addEventListener('click', run);
    body.querySelector('[data-act=back]').addEventListener('click', () => { st.phase = 'code'; save(); rerender(); });
  }

  /* ---------- phase 4: review, score, solution, follow-up ---------- */
  function renderDone(body, cfg, st, si, save, rerender, store) {
    const stage = cfg.stages[si], ss = stageState(st, si);
    ss.done = true;
    const last = si === cfg.stages.length - 1;
    if (last) st.completedAll = true;
    save();
    const sc = stageScore(cfg, st, si);
    let html = '<div class="ex-score"><div class="ex-score-ring ' + (sc.pct >= 80 ? 'good' : sc.pct >= 60 ? 'ok' : 'low') + '">' + sc.pct + '</div><div class="ex-score-rows">' +
      sc.rows.map(r => '<div class="ex-score-row"><span>' + esc(r.label) + '</span><span class="ex-score-bar"><span style="width:' + (100 * r.pts / r.weight) + '%"></span></span><span class="ex-score-pts">' + r.pts + '/' + r.weight + '</span></div>').join('') +
      '<div class="dim ex-score-note">Rubric weights reasoning over syntax. Hints after the first cost implementation points; first-try reasoning answers count.</div></div></div>';
    html += '<div class="ex-review-grid">';
    if (stage.tests.length) html += '<details class="ex-solution" open><summary>Reference solution</summary>' + window.T.code('js', 'reference — ' + (stage.fn || cfg.fn), stage.solution) + (stage.solutionExplain || '') + '</details>';
    else if (stage.solutionExplain) html += '<div class="ex-complexity">' + stage.solutionExplain + '</div>';
    if (stage.complexity) html += '<div class="ex-complexity"><div class="ex-model-title">Complexity, said the interview way</div>' + stage.complexity + '</div>';
    html += '</div>';
    if (stage.followUp) {
      const fu = stage.followUp, a = ss.followUp || (ss.followUp = {});
      html += '<div class="ex-followup"><div class="ex-model-title">Follow-up — the interviewer changes the requirement</div>';
      if (fu.type === 'text') {
        html += '<div class="q-text">' + fu.q + '</div>';
        if (!a.submitted) html += '<textarea class="ex-text" rows="3" placeholder="How would you adapt what you have?">' + esc(a.text || '') + '</textarea><div class="ex-q-actions"><button class="primary mini" data-act="fu-submit"' + ((a.text || '').trim().length >= 20 ? '' : ' disabled') + '>Submit</button></div>';
        else html += '<div class="ex-text-static">' + esc(a.text) + '</div><div class="ex-model"><div class="ex-model-title">Model answer</div>' + fu.model + '</div>';
      } else {
        const perm = window.T.permute('fu:' + fu.q, fu.choices.length);
        html += '<div class="q-text">' + fu.q + '</div>' + perm.map((ci, pos) => {
          let cls = 'choice';
          if (a.chosen !== undefined) { if (ci === fu.answer) cls += ' correct'; else if (ci === a.chosen) cls += ' wrong'; }
          return '<button class="' + cls + '" data-fu="' + ci + '"' + (a.chosen !== undefined ? ' disabled' : '') + '><span class="letter">' + String.fromCharCode(65 + pos) + '</span><span>' + fu.choices[ci] + '</span></button>';
        }).join('');
        if (a.chosen !== undefined) html += '<div class="widget-explain"><div class="verdict ' + (a.chosen === fu.answer ? 'v-right' : 'v-wrong') + '">' + (a.chosen === fu.answer ? '✓ Correct' : '✗ Not quite') + '</div>' + (fu.explain || '') + '</div>';
      }
      html += '</div>';
    }
    html += '<div class="ex-actions">' +
      (!last ? '<button class="primary" data-act="next-stage">Next requirement → ' + esc(cfg.stages[si + 1].title || '') + '</button>' : '<div class="ex-pass-banner">🎉 Exercise complete' + (cfg.stages.length > 1 ? ' — all ' + cfg.stages.length + ' requirements' : '') + '</div>') +
      (stage.tests.length ? '<button class="ghost" data-act="back-code">← Back to my code</button>' : '') +
      (last ? '<button class="ghost" data-act="redo" title="Archive this attempt and start again from a blank editor — do this tomorrow">↻ Redo cold</button>' : '') +
      '<button class="ghost danger" data-act="restart">Restart exercise</button></div>';
    if (st.attempts && st.attempts.length) html += '<div class="ex-attempts">Previous attempts: ' + st.attempts.map(a => '<span class="ex-attempt">' + (a.score === null ? '–' : a.score) + '<span class="dim">/100</span>' + (a.hints ? ' · ' + a.hints + ' hint' + (a.hints > 1 ? 's' : '') : '') + '</span>').join(' ') + '</div>';
    body.innerHTML = html;
    const fuTa = body.querySelector('.ex-text');
    if (fuTa) {
      const btn = body.querySelector('[data-act=fu-submit]');
      fuTa.addEventListener('input', () => { ss.followUp.text = fuTa.value; save(); btn.disabled = fuTa.value.trim().length < 20; });
      btn.addEventListener('click', () => { ss.followUp.submitted = true; save(); rerender(); });
    }
    body.querySelectorAll('[data-fu]').forEach(b => b.addEventListener('click', () => { ss.followUp.chosen = +b.dataset.fu; save(); rerender(); }));
    const next = body.querySelector('[data-act=next-stage]');
    if (next) next.addEventListener('click', () => { st.stage = si + 1; st.phase = 'reason'; save(); rerender(); window.scrollBy(0, -200); });
    const bc = body.querySelector('[data-act=back-code]');
    if (bc) bc.addEventListener('click', () => { st.phase = 'code'; save(); rerender(); });
    const redoBtn = body.querySelector('[data-act=redo]');
    if (redoBtn) redoBtn.addEventListener('click', () => {
      if (!confirm('Archive this attempt (score kept in history) and restart from a blank editor?')) return;
      redo(cfg, store); save(); rerender(); window.scrollBy(0, -200);
    });
    body.querySelector('[data-act=restart]').addEventListener('click', () => {
      if (!confirm('Restart this exercise from scratch? Your code and answers here will be cleared.')) return;
      delete store.ex[cfg.id]; save(); rerender();
    });
  }

  window.Exercise = { register, render, status, score, hintsUsed, categoryTotals, redo, paintResults, paintConsole, scratch, preludeOffset, CONSOLE_HINT, all: () => REGISTRY, RUBRIC, stageScore };
})();
