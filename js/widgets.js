/* Interactive widgets embedded in sections. Content files create placeholders
   via T.widget(type, cfg); app.js calls Widgets.initAll() after each render.
   State persists per section (store.widgets[secId][wid]). */
(function () {
  const esc = window.Highlighter.esc;
  let widx = 0;
  window.T._widgets = {};

  window.T.widget = function (type, cfg) {
    const id = 'w' + (widx++);
    cfg.type = type;
    window.T._widgets[id] = cfg;
    if (type === 'exercise' && window.Exercise) window.Exercise.register(cfg);
    return '<div class="widget widget-' + type + '" data-wid="' + id + '" data-wtype="' + type + '"></div>';
  };

  /* ---------- shared ---------- */
  function header(label, solved, icon) {
    return '<div class="widget-head"><span class="widget-tag">' + (icon || '🎯') + ' ' + label + '</span>' +
      (solved ? '<span class="widget-solved">✓ solved</span>' : '') + '</div>';
  }
  function explainBox(html, cls) { return '<div class="widget-explain ' + (cls || '') + '">' + html + '</div>'; }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  /* deterministic per-question choice order (stable across re-renders) */
  window.T.permute = function (seed, n) {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
    const rnd = () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
    const p = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    return p;
  };
  window.T._wshared = { header, explainBox, shuffle };

  /* ---------- mcq ---------- */
  function renderMCQ(el, cfg, state, save) {
    const chosen = state.chosen, answered = chosen !== undefined;
    const perm = cfg.fixedOrder ? cfg.choices.map((_, i) => i) : window.T.permute('mcq:' + cfg.q, cfg.choices.length);
    let html = header(cfg.label || 'Check yourself', answered && chosen === cfg.answer);
    if (cfg.pre) html += cfg.pre;
    html += '<div class="q-text">' + cfg.q + '</div>';
    html += perm.map((ci, pos) => {
      let cls = 'choice';
      if (answered) { if (ci === cfg.answer) cls += ' correct'; else if (ci === chosen) cls += ' wrong'; }
      return '<button class="' + cls + '" data-ci="' + ci + '"' + (answered ? ' disabled' : '') + '>' +
        '<span class="letter">' + String.fromCharCode(65 + pos) + '</span><span>' + cfg.choices[ci] + '</span></button>';
    }).join('');
    if (answered) {
      const right = chosen === cfg.answer;
      html += explainBox('<div class="verdict ' + (right ? 'v-right' : 'v-wrong') + '">' +
        (right ? '✓ Correct' : '✗ Not quite — answer: ' + String.fromCharCode(65 + perm.indexOf(cfg.answer))) + '</div>' + cfg.explain);
      html += '<button class="ghost mini" data-act="retry">Try again</button>';
    }
    el.innerHTML = html;
    el.querySelectorAll('.choice').forEach(btn => btn.addEventListener('click', () => {
      state.chosen = +btn.dataset.ci;
      if (state.chosen === cfg.answer) state.solved = true;
      save(); renderMCQ(el, cfg, state, save);
    }));
    const retry = el.querySelector('[data-act=retry]');
    if (retry) retry.addEventListener('click', () => { delete state.chosen; save(); renderMCQ(el, cfg, state, save); });
  }

  /* ---------- multi ---------- */
  function renderMulti(el, cfg, state, save) {
    const picks = state.picks || [], checked = state.checked;
    let html = header(cfg.label || 'Select all that apply', state.solved);
    if (cfg.pre) html += cfg.pre;
    html += '<div class="q-text">' + cfg.q + '</div>';
    html += window.T.permute('multi:' + cfg.q, cfg.choices.length).map(ci => {
      let cls = 'choice multi';
      const picked = picks.indexOf(ci) !== -1;
      if (picked && !checked) cls += ' picked';
      if (checked) {
        const should = cfg.answers.indexOf(ci) !== -1;
        if (should && picked) cls += ' correct'; else if (should && !picked) cls += ' missed'; else if (!should && picked) cls += ' wrong';
      }
      return '<button class="' + cls + '" data-ci="' + ci + '"><span class="letter">' + (picked ? '☑' : '☐') + '</span><span>' + cfg.choices[ci] + '</span></button>';
    }).join('');
    if (checked) {
      html += explainBox('<div class="verdict ' + (state.solved ? 'v-right' : 'v-wrong') + '">' +
        (state.solved ? '✓ Exactly right' : '✗ Not quite — green = correct pick, amber = you missed it, red = shouldn’t be picked') + '</div>' + cfg.explain);
      html += '<button class="ghost mini" data-act="retry">Try again</button>';
    } else html += '<button class="primary mini" data-act="check">Check answer</button>';
    el.innerHTML = html;
    el.querySelectorAll('.choice').forEach(btn => btn.addEventListener('click', () => {
      if (state.checked) return;
      const ci = +btn.dataset.ci, p = state.picks || (state.picks = []);
      const at = p.indexOf(ci); if (at === -1) p.push(ci); else p.splice(at, 1);
      save(); renderMulti(el, cfg, state, save);
    }));
    const check = el.querySelector('[data-act=check]');
    if (check) check.addEventListener('click', () => {
      state.checked = true;
      const p = (state.picks || []).slice().sort((a, b) => a - b), ans = cfg.answers.slice().sort((a, b) => a - b);
      state.solved = p.length === ans.length && p.every((v, i) => v === ans[i]);
      save(); renderMulti(el, cfg, state, save);
    });
    const retry = el.querySelector('[data-act=retry]');
    if (retry) retry.addEventListener('click', () => { delete state.checked; state.picks = []; save(); renderMulti(el, cfg, state, save); });
  }

  /* ---------- order ---------- */
  function renderOrder(el, cfg, state, save) {
    if (!state.pool) { state.pool = shuffle(cfg.items.map((_, i) => i)); state.placed = []; state.mistakes = 0; }
    const done = state.placed.length === cfg.items.length;
    if (done) state.solved = true;
    let html = header(cfg.label || 'Put these in order', state.solved);
    html += '<div class="q-text">' + cfg.q + '</div>';
    html += '<div class="order-placed">' + (state.placed.length
      ? state.placed.map((idx, n) => '<div class="order-slot filled"><span class="order-num">' + (n + 1) + '</span>' + cfg.items[idx] + '</div>').join('')
      : '<div class="order-hint">Click the step that comes <strong>first</strong>…</div>') + '</div>';
    if (!done) html += '<div class="order-pool">' + state.pool.filter(i => state.placed.indexOf(i) === -1)
      .map(i => '<button class="order-item" data-idx="' + i + '">' + cfg.items[i] + '</button>').join('') + '</div>';
    if (done) {
      html += explainBox('<div class="verdict v-right">✓ Sequence complete' +
        (state.mistakes ? ' — with ' + state.mistakes + ' wrong attempt' + (state.mistakes > 1 ? 's' : '') : ' — flawless!') + '</div>' + (cfg.explain || ''));
      html += '<button class="ghost mini" data-act="retry">Reset &amp; reshuffle</button>';
    }
    el.innerHTML = html;
    el.querySelectorAll('.order-item').forEach(btn => btn.addEventListener('click', () => {
      const idx = +btn.dataset.idx;
      if (idx === state.placed.length) { state.placed.push(idx); save(); renderOrder(el, cfg, state, save); }
      else { state.mistakes++; save(); btn.classList.add('shake'); setTimeout(() => btn.classList.remove('shake'), 400); }
    }));
    const retry = el.querySelector('[data-act=retry]');
    if (retry) retry.addEventListener('click', () => { delete state.pool; delete state.placed; delete state.solved; save(); renderOrder(el, cfg, state, save); });
  }

  /* ---------- blanks ---------- */
  function renderBlanks(el, cfg, state, save) {
    cfg.blanks.forEach((b, bi) => {
      if (!(b.answer >= 0 && b.answer < b.choices.length))
        console.error('blanks "' + (cfg.name || cfg.q) + '": blank ' + bi + ' answer out of range');
    });
    const picks = state.picks || {}, checked = state.checked;
    let html = header(cfg.label || 'Complete the code', state.solved);
    html += '<div class="q-text">' + cfg.q + '</div>';
    const parts = window.T.trim(cfg.template).split(/«(\d+)»/);
    let codeHtml = '';
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) codeHtml += window.Highlighter.highlight(parts[i], 'js');
      else {
        const bi = +parts[i], blank = cfg.blanks[bi], pick = picks[bi];
        let cls = 'blank-select';
        if (checked) cls += (pick === blank.answer) ? ' blank-right' : ' blank-wrong';
        codeHtml += '<select class="' + cls + '" data-bi="' + bi + '"' + (checked && state.solved ? ' disabled' : '') + '>' +
          '<option value="">???</option>' +
          blank.choices.map((c, ci) => '<option value="' + ci + '"' + (pick === ci ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '</select>';
      }
    }
    html += '<div class="codeblock"><div class="codeblock-header"><span>' + esc(cfg.name || 'fill in the blanks') + '</span></div><pre><code>' + codeHtml + '</code></pre></div>';
    if (checked) html += explainBox('<div class="verdict ' + (state.solved ? 'v-right' : 'v-wrong') + '">' +
      (state.solved ? '✓ All blanks correct' : '✗ Red blanks are wrong — fix them and re-check') + '</div>' + (state.solved ? (cfg.explain || '') : ''));
    html += '<div class="widget-actions">' + (!state.solved ? '<button class="primary mini" data-act="check">Check</button>' : '') +
      (checked && state.solved ? '<button class="ghost mini" data-act="retry">Reset</button>' : '') + '</div>';
    el.innerHTML = html;
    el.querySelectorAll('.blank-select').forEach(sel => sel.addEventListener('change', () => {
      const p = state.picks || (state.picks = {});
      if (sel.value === '') delete p[+sel.dataset.bi]; else p[+sel.dataset.bi] = +sel.value;
      save();
    }));
    const check = el.querySelector('[data-act=check]');
    if (check) check.addEventListener('click', () => {
      state.checked = true; state.solved = cfg.blanks.every((b, bi) => (state.picks || {})[bi] === b.answer);
      save(); renderBlanks(el, cfg, state, save);
    });
    const retry = el.querySelector('[data-act=retry]');
    if (retry) retry.addEventListener('click', () => { state.picks = {}; delete state.checked; delete state.solved; save(); renderBlanks(el, cfg, state, save); });
  }

  /* ---------- spotbug ---------- */
  function renderSpotBug(el, cfg, state, save) {
    const lines = window.T.trim(cfg.code).split('\n');
    let html = header(cfg.label || 'Spot the bug', state.solved, '🐛');
    html += '<div class="q-text">' + cfg.q + '</div>';
    html += '<div class="codeblock spotbug"><div class="codeblock-header"><span>' + esc(cfg.name || 'click the buggy line') + '</span></div><pre><code>';
    html += lines.map((line, i) => {
      const n = i + 1;
      let cls = 'bug-line';
      if (state.solved && n === cfg.bugLine) cls += ' bug-found';
      if (state.lastWrong === n && !state.solved) cls += ' bug-miss';
      return '<span class="' + cls + '" data-line="' + n + '"><span class="ln">' + String(n).padStart(2, ' ') + '</span>' + window.Highlighter.highlight(line, 'js') + '\n</span>';
    }).join('');
    html += '</code></pre></div>';
    if (state.solved) html += explainBox('<div class="verdict v-right">✓ Found it — line ' + cfg.bugLine + '</div>' + cfg.explain);
    else if (state.lastWrong) html += explainBox('<div class="verdict v-wrong">✗ Line ' + state.lastWrong + ' is fine. ' +
      ((state.attempts || 0) >= 3 && cfg.hint ? 'Hint: ' + cfg.hint : 'Keep looking…') + '</div>');
    el.innerHTML = html;
    el.querySelectorAll('.bug-line').forEach(span => span.addEventListener('click', () => {
      if (state.solved) return;
      const n = +span.dataset.line;
      state.attempts = (state.attempts || 0) + 1;
      if (n === cfg.bugLine) { state.solved = true; delete state.lastWrong; } else state.lastWrong = n;
      save(); renderSpotBug(el, cfg, state, save);
    }));
  }

  /* ---------- repl: editable code that really runs ---------- */
  function fmtVal(v) { return typeof v === 'string' ? v : RunnerCore.fmt(v); }
  function renderRepl(el, cfg, state, save) {
    const code = state.code !== undefined ? state.code : window.T.trim(cfg.code);
    let html = header(cfg.label || 'Run it — live', state.solved, '▶');
    if (cfg.q) html += '<div class="q-text">' + cfg.q + '</div>';
    html += '<div class="repl"><div class="codeblock-header"><span>' + esc(cfg.name || 'editable — runs in this page') + '</span><span class="kbd-hint">⌘/Ctrl+Enter runs</span></div><div class="editor-host"></div></div>';
    html += '<div class="widget-actions"><button class="primary mini" data-act="run">▶ Run</button><button class="ghost mini" data-act="reset">Reset code</button></div>';
    html += '<div class="repl-out" data-out></div>';
    if (state.ran && cfg.explain) html += explainBox(cfg.explain);
    el.innerHTML = html;
    const outEl = el.querySelector('[data-out]');
    let logs = [], runToken = 0;
    function renderOut() {
      outEl.innerHTML = '<div class="repl-out-head">console</div>' +
        (logs.length ? logs.map(l => '<div class="repl-line' + (l.err ? ' repl-err' : '') + '">' + esc(l.text) + '</div>').join('')
          : '<div class="repl-line repl-dim">(no output)</div>');
    }
    const ed = window.Editor.create(el.querySelector('.editor-host'), {
      value: code, minRows: 4,
      onChange: v => { state.code = v; save(); },
      onRun: () => run()
    });
    function run() {
      const token = ++runToken;
      logs = [];
      const push = (err, args) => { if (token !== runToken || logs.length > 300) return; logs.push({ err, text: args.map(fmtVal).join(' ') }); renderOut(); };
      const fake = { log: (...a) => push(false, a), info: (...a) => push(false, a), warn: (...a) => push(false, a), error: (...a) => push(true, a) };
      try { new Function('console', RunnerCore.guardLoops(ed.value))(fake); }
      catch (e) { push(true, ['❌ ' + RunnerCore.errText(e)]); }
      renderOut();
      if (!state.ran) {
        state.ran = true; state.solved = true; save();
        const head = el.querySelector('.widget-head');
        if (head && !head.querySelector('.widget-solved')) head.insertAdjacentHTML('beforeend', '<span class="widget-solved">✓ solved</span>');
        if (cfg.explain && !el.querySelector('.widget-explain')) outEl.insertAdjacentHTML('afterend', explainBox(cfg.explain));
      }
    }
    el.querySelector('[data-act=run]').addEventListener('click', run);
    el.querySelector('[data-act=reset]').addEventListener('click', () => { delete state.code; save(); renderRepl(el, cfg, state, save); });
  }

  /* ---------- drill: timed pattern-recognition flash cards ----------
     cfg: { items: [{prompt, answer, explain}], choices: [...], seconds } */
  function renderDrill(el, cfg, state, save) {
    const secs = cfg.seconds || 20;
    const timers = el._drillTimers || (el._drillTimers = []);
    const clearTimers = () => { timers.forEach(clearInterval); timers.length = 0; };
    clearTimers();
    const results = state.results || [];
    const idx = results.length;
    const running = state.running && idx < cfg.items.length;
    let html = header(cfg.label || 'Rapid-fire pattern drill', state.best !== undefined && state.best === cfg.items.length, '⚡');
    html += '<div class="q-text">' + (cfg.q || '') + '</div>';
    if (!running && !state.running) {
      html += '<div class="drill-intro"><p>' + cfg.items.length + ' prompts · ' + secs + ' seconds each. Read the prompt, click the pattern you would reach for. No coding — this trains the <em>recognition</em> reflex.</p>' +
        (state.best !== undefined ? '<p>Best so far: <strong>' + state.best + '/' + cfg.items.length + '</strong></p>' : '') +
        '<button class="primary" data-act="start">▶ Start drill</button></div>';
      if (state.lastResults) {
        html += '<details class="drill-review"><summary>Review last run (' + state.lastResults.filter(r => r.ok).length + '/' + cfg.items.length + ')</summary>' +
          state.lastResults.map((r, i) => '<div class="drill-row ' + (r.ok ? 'ok' : 'bad') + '"><span>' + (r.ok ? '✓' : '✗') + '</span><div><div>' + cfg.items[i].prompt + '</div>' +
            '<div class="drill-ans">' + (r.ok ? 'You: ' : (r.pick ? 'You: ' + esc(r.pick) + ' · ' : 'No answer · ') + 'Answer: ') + '<strong>' + esc(cfg.items[i].answer) + '</strong>' +
            (cfg.items[i].explain ? ' — ' + cfg.items[i].explain : '') + '</div></div></div>').join('') + '</details>';
      }
      el.innerHTML = html;
      el.querySelector('[data-act=start]').addEventListener('click', () => { state.running = true; state.results = []; save(); renderDrill(el, cfg, state, save); });
      return;
    }
    if (!running) { // finished
      const ok = results.filter(r => r.ok).length;
      state.running = false; state.lastResults = results; state.results = [];
      if (state.best === undefined || ok > state.best) state.best = ok;
      save();
      renderDrill(el, cfg, state, save);
      return;
    }
    const item = cfg.items[idx];
    html += '<div class="drill-card"><div class="drill-meta"><span>' + (idx + 1) + ' / ' + cfg.items.length + '</span><span data-clock>' + secs + 's</span></div>' +
      '<div class="drill-bar"><div class="drill-fill" data-fill></div></div>' +
      '<div class="drill-prompt">' + item.prompt + '</div>' +
      '<div class="drill-choices">' + cfg.choices.map(c => '<button class="drill-choice" data-pick="' + esc(c) + '">' + esc(c) + '</button>').join('') + '</div>' +
      '<div class="drill-feedback" data-fb></div></div>';
    el.innerHTML = html;
    const fill = el.querySelector('[data-fill]'), clock = el.querySelector('[data-clock]'), fb = el.querySelector('[data-fb]');
    const start = Date.now();
    let answered = false;
    function finish(pick) {
      if (answered) return;
      answered = true; clearTimers();
      const ok = pick === item.answer;
      results.push({ ok, pick });
      state.results = results; save();
      el.querySelectorAll('.drill-choice').forEach(b => {
        b.disabled = true;
        if (b.dataset.pick === item.answer) b.classList.add('correct');
        else if (b.dataset.pick === pick) b.classList.add('wrong');
      });
      fb.innerHTML = '<div class="verdict ' + (ok ? 'v-right' : 'v-wrong') + '">' + (ok ? '✓ Yes' : (pick ? '✗ It’s ' : '⏱ Time — it’s ') + '<strong>' + esc(item.answer) + '</strong>') + '</div>' + (item.explain ? '<div class="drill-explain">' + item.explain + '</div>' : '');
      timers.push(setTimeout(() => renderDrill(el, cfg, state, save), ok ? 1100 : 2600));
    }
    timers.push(setInterval(() => {
      if (!document.contains(el)) { clearTimers(); return; }
      const left = Math.max(0, secs - (Date.now() - start) / 1000);
      fill.style.width = (100 * left / secs) + '%';
      clock.textContent = Math.ceil(left) + 's';
      if (left <= 0) finish(null);
    }, 100));
    el.querySelectorAll('.drill-choice').forEach(b => b.addEventListener('click', () => finish(b.dataset.pick)));
  }

  /* ---------- trace: predict the next node in BFS/DFS ----------
     cfg: { graph: {A:['B','C']}, start, algo:'bfs'|'dfs', pos:{A:[x,y]}, directed } */
  function buildTrace(cfg) {
    const adj = cfg.graph, steps = [];
    const nodes = Object.keys(adj);
    Object.values(adj).flat().forEach(n => { if (!nodes.includes(n)) nodes.push(n); });
    const nb = n => adj[n] || [];
    if (cfg.algo === 'bfs') {
      const queue = [cfg.start], visited = new Set([cfg.start]), order = [];
      while (queue.length) {
        const u = queue.shift();
        order.push(u);
        const added = [];
        for (const v of nb(u)) if (!visited.has(v)) { visited.add(v); queue.push(v); added.push(v); }
        steps.push({ current: u, frontier: queue.slice(), visited: order.slice(), discovered: Array.from(visited), added });
      }
    } else {
      const visited = new Set(), order = [], stack = [];
      (function visit(u) {
        visited.add(u); order.push(u); stack.push(u);
        steps.push({ current: u, frontier: stack.slice(), visited: order.slice(), discovered: Array.from(visited), added: nb(u).filter(v => !visited.has(v)) });
        for (const v of nb(u)) if (!visited.has(v)) visit(v);
        stack.pop();
      })(cfg.start);
    }
    return { steps, nodes };
  }
  function svgGraph(cfg, nodes, st, done) {
    const pos = cfg.pos, W = cfg.width || 420, H = cfg.height || 220;
    let s = '<svg class="graph-svg" viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="max-width:' + W + 'px">' +
      '<defs><marker id="arr" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="g-arrow"/></marker></defs>';
    for (const u of Object.keys(cfg.graph)) for (const v of cfg.graph[u]) {
      if (!pos[u] || !pos[v]) continue;
      const [x1, y1] = pos[u], [x2, y2] = pos[v];
      const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 1, r = 18;
      const ax = x1 + dx / d * r, ay = y1 + dy / d * r, bx = x2 - dx / d * (r + 2), by = y2 - dy / d * (r + 2);
      s += '<line class="g-edge" x1="' + ax + '" y1="' + ay + '" x2="' + bx + '" y2="' + by + '"' + (cfg.directed === false ? '' : ' marker-end="url(#arr)"') + '/>';
    }
    for (const n of nodes) {
      if (!pos[n]) continue;
      const [x, y] = pos[n];
      let cls = 'g-node';
      if (st) {
        if (st.current === n && !done) cls += ' current';
        else if (st.visited.includes(n)) cls += ' visited';
        else if (st.discovered.includes(n)) cls += ' frontier';
      }
      s += '<g class="' + cls + '" data-node="' + esc(n) + '"><circle cx="' + x + '" cy="' + y + '" r="18"/><text x="' + x + '" y="' + (y + 5) + '" text-anchor="middle">' + esc(n) + '</text></g>';
    }
    return s + '</svg>';
  }
  function renderTrace(el, cfg, state, save) {
    const { steps, nodes } = buildTrace(cfg);
    const i = state.step || 0;             // number of steps revealed
    const done = i >= steps.length;
    const st = i > 0 ? steps[i - 1] : { current: null, frontier: [cfg.start], visited: [], discovered: [cfg.start], added: [] };
    const isBfs = cfg.algo === 'bfs';
    let html = header(cfg.label || ('Predict the ' + cfg.algo.toUpperCase() + ' order'), done, '🔍');
    html += '<div class="q-text">' + (cfg.q || ('Starting at <code>' + esc(cfg.start) + '</code>, which node does ' + cfg.algo.toUpperCase() + ' visit next? Neighbors are explored in the order listed.')) + '</div>';
    html += '<div class="trace-wrap"><div class="trace-graph">' + svgGraph(cfg, nodes, st, done) + '</div>';
    html += '<div class="trace-state">' +
      '<div class="trace-row"><span class="trace-lbl">adjacency</span><code>' + Object.keys(cfg.graph).map(u => esc(u) + ' → [' + cfg.graph[u].map(esc).join(', ') + ']').join('<br>') + '</code></div>' +
      '<div class="trace-row"><span class="trace-lbl">' + (isBfs ? 'queue (front → back)' : 'call stack (bottom → top)') + '</span><code>' + (st.frontier.length ? st.frontier.map(esc).join(isBfs ? ' , ' : ' › ') : '(empty)') + '</code></div>' +
      '<div class="trace-row"><span class="trace-lbl">visited order</span><code>' + (st.visited.length ? st.visited.map(esc).join(' → ') : '—') + '</code></div>' +
      '</div></div>';
    if (!done) {
      const answer = steps[i].current;
      const options = nodes.filter(n => !st.visited.includes(n));
      html += '<div class="trace-q">Next visited node?</div><div class="trace-choices">' + options.map(n => '<button class="trace-choice" data-n="' + esc(n) + '">' + esc(n) + '</button>').join('') + '</div>';
      if (state.wrong) html += explainBox('<div class="verdict v-wrong">✗ Not <strong>' + esc(state.wrong) + '</strong>. ' + (isBfs ? 'BFS always takes the <em>front</em> of the queue.' : 'DFS goes to the first unvisited neighbor of the current node — or backtracks if there is none.') + '</div>');
      html += '<div class="widget-actions"><button class="ghost mini" data-act="show">Show me this step</button><span class="trace-mistakes">' + (state.mistakes ? state.mistakes + ' miss' + (state.mistakes > 1 ? 'es' : '') : '') + '</span></div>';
    } else {
      html += explainBox('<div class="verdict v-right">✓ Traversal complete: ' + st.visited.map(esc).join(' → ') + (state.mistakes ? ' — ' + state.mistakes + ' miss' + (state.mistakes > 1 ? 'es' : '') : ' — flawless') + '</div>' + (cfg.explain || ''));
      html += '<div class="widget-actions"><button class="ghost mini" data-act="reset">Replay</button></div>';
    }
    el.innerHTML = html;
    el.querySelectorAll('.trace-choice').forEach(b => b.addEventListener('click', () => {
      const n = b.dataset.n;
      if (n === steps[i].current) { state.step = i + 1; delete state.wrong; if (state.step >= steps.length) state.solved = true; }
      else { state.wrong = n; state.mistakes = (state.mistakes || 0) + 1; }
      save(); renderTrace(el, cfg, state, save);
    }));
    const show = el.querySelector('[data-act=show]');
    if (show) show.addEventListener('click', () => { state.step = i + 1; state.mistakes = (state.mistakes || 0) + 1; delete state.wrong; if (state.step >= steps.length) state.solved = true; save(); renderTrace(el, cfg, state, save); });
    const reset = el.querySelector('[data-act=reset]');
    if (reset) reset.addEventListener('click', () => { state.step = 0; state.mistakes = 0; delete state.solved; save(); renderTrace(el, cfg, state, save); });
  }

  const RENDERERS = { mcq: renderMCQ, multi: renderMulti, order: renderOrder, blanks: renderBlanks, spotbug: renderSpotBug, repl: renderRepl, drill: renderDrill, trace: renderTrace };

  function initAll(root, secId, store, save) {
    store.widgets = store.widgets || {};
    const wstate = store.widgets[secId] = store.widgets[secId] || {};
    // keyed by position within the section so global widget numbering can shift safely
    let n = 0;
    root.querySelectorAll('.widget').forEach(el => {
      const cfg = window.T._widgets[el.dataset.wid];
      if (!cfg) return;
      const key = 'w' + (n++);
      if (cfg.type === 'exercise') { window.Exercise.render(el, cfg, store, save); return; }
      if (!RENDERERS[cfg.type]) return;
      const state = wstate[key] = wstate[key] || {};
      RENDERERS[cfg.type](el, cfg, state, save);
    });
  }
  function countSolved(secId, store) {
    const w = (store.widgets || {})[secId] || {};
    return Object.values(w).filter(s => s.solved).length;
  }

  window.Widgets = { initAll, RENDERERS, countSolved, svgGraph };
})();
