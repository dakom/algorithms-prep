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
      catch (e) {
        const loc = RunnerCore.errLoc(e, null, { guard: true });
        push(true, ['❌ ' + RunnerCore.errText(e) + (loc && loc.line ? ' (line ' + loc.line + (loc.col ? ':' + loc.col : '') + ')' : '')]);
      }
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
    if (cfg.algo === 'cycle') {
      // three-color DFS; every step is an EVENT: enter / finish / skip(done) / cycle(back edge)
      const state = new Map(), stack = [];
      const snap = (ev) => steps.push({ ev, exploring: stack.slice(), done: Array.from(state).filter(([, v]) => v === 2).map(([k]) => k), current: stack[stack.length - 1] || null });
      let found = false;
      const dfs = u => {
        state.set(u, 1); stack.push(u); snap({ type: 'enter', node: u });
        for (const v of nb(u)) {
          if (found) return;
          if (state.get(v) === 1) { snap({ type: 'cycle', from: u, to: v }); found = true; return; }
          if (state.get(v) === 2) { snap({ type: 'skip', node: v }); continue; }
          dfs(v);
        }
        if (found) return;
        state.set(u, 2); stack.pop(); snap({ type: 'finish', node: u });
      };
      dfs(cfg.start);
      return { steps, nodes, cycleMode: true };
    }
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
      if (st && st.exploring) {
        if (st.current === n && !done) cls += ' current';
        else if (st.done.includes(n)) cls += ' visited';
        else if (st.exploring.includes(n)) cls += ' exploring';
      } else if (st) {
        if (st.current === n && !done) cls += ' current';
        else if (st.visited.includes(n)) cls += ' visited';
        else if (st.discovered.includes(n)) cls += ' frontier';
      }
      s += '<g class="' + cls + '" data-node="' + esc(n) + '"><circle cx="' + x + '" cy="' + y + '" r="18"/><text x="' + x + '" y="' + (y + 5) + '" text-anchor="middle">' + esc(n) + '</text></g>';
    }
    return s + '</svg>';
  }
  function evLabel(ev) {
    return ev.type === 'enter' ? 'enter ' + ev.node : ev.type === 'finish' ? 'finish ' + ev.node : ev.type === 'skip' ? 'skip ' + ev.node + ' (done)' : 'back edge → ' + ev.to + ' = CYCLE';
  }
  function renderCycleTrace(el, cfg, state, save, steps, nodes) {
    const i = state.step || 0, done = i >= steps.length;
    const st = i > 0 ? steps[i - 1] : { exploring: [], done: [], current: null };
    let html = header(cfg.label || 'Predict the three-color DFS', done, '🔍');
    html += '<div class="q-text">' + (cfg.q || 'Starting at <code>' + esc(cfg.start) + '</code>: what is the next <em>event</em>? Grey = exploring (on the stack), green = done. A back edge to a grey node is a cycle; reaching a green node is not.') + '</div>';
    html += '<div class="trace-wrap"><div class="trace-graph">' + svgGraph(cfg, nodes, Object.assign({ visited: [], discovered: [] }, st), done) + '</div>';
    html += '<div class="trace-state">' +
      '<div class="trace-row"><span class="trace-lbl">adjacency</span><code>' + Object.keys(cfg.graph).map(u => esc(u) + ' → [' + cfg.graph[u].map(esc).join(', ') + ']').join('<br>') + '</code></div>' +
      '<div class="trace-row"><span class="trace-lbl">exploring (stack, bottom → top)</span><code>' + (st.exploring.length ? st.exploring.map(esc).join(' › ') : '(empty)') + '</code></div>' +
      '<div class="trace-row"><span class="trace-lbl">done</span><code>' + (st.done.length ? st.done.map(esc).join(', ') : '—') + '</code></div>' +
      '<div class="trace-row"><span class="trace-lbl">events so far</span><code>' + (i ? steps.slice(0, i).map(s => esc(evLabel(s.ev))).join('<br>') : '—') + '</code></div></div></div>';
    if (!done) {
      const cur = st.current;
      const opts = [];
      nodes.filter(n => !st.exploring.includes(n) && !st.done.includes(n)).forEach(n => opts.push({ type: 'enter', node: n }));
      if (cur) opts.push({ type: 'finish', node: cur });
      st.done.forEach(n => opts.push({ type: 'skip', node: n }));
      st.exploring.forEach(n => opts.push({ type: 'cycle', to: n }));
      html += '<div class="trace-q">Next event?</div><div class="trace-choices">' + opts.map(o => '<button class="trace-choice wide" data-ev="' + esc(evLabel(o)) + '">' + esc(evLabel(o)) + '</button>').join('') + '</div>';
      if (state.wrong) html += explainBox('<div class="verdict v-wrong">✗ Not “' + esc(state.wrong) + '”. DFS takes the current node’s neighbors in order: an unseen neighbor is entered; a grey (exploring) neighbor is a back edge = cycle; a green (done) neighbor is skipped; when the neighbors are exhausted the node is finished.</div>');
      html += '<div class="widget-actions"><button class="ghost mini" data-act="show">Show me this step</button><span class="trace-mistakes">' + (state.mistakes ? state.mistakes + ' miss' + (state.mistakes > 1 ? 'es' : '') : '') + '</span></div>';
    } else {
      const last = steps[steps.length - 1].ev;
      html += explainBox('<div class="verdict v-right">✓ ' + (last.type === 'cycle' ? 'Cycle found: ' + esc(last.from) + ' → ' + esc(last.to) + ' while ' + esc(last.to) + ' was still on the stack' : 'Traversal finished with no cycle') + (state.mistakes ? ' — ' + state.mistakes + ' miss' + (state.mistakes > 1 ? 'es' : '') : ' — flawless') + '</div>' + (cfg.explain || ''));
      html += '<div class="widget-actions"><button class="ghost mini" data-act="reset">Replay</button></div>';
    }
    el.innerHTML = html;
    el.querySelectorAll('.trace-choice').forEach(b => b.addEventListener('click', () => {
      if (b.dataset.ev === evLabel(steps[i].ev)) { state.step = i + 1; delete state.wrong; if (state.step >= steps.length) state.solved = true; }
      else { state.wrong = b.dataset.ev; state.mistakes = (state.mistakes || 0) + 1; }
      save(); renderCycleTrace(el, cfg, state, save, steps, nodes);
    }));
    const show = el.querySelector('[data-act=show]');
    if (show) show.addEventListener('click', () => { state.step = i + 1; state.mistakes = (state.mistakes || 0) + 1; delete state.wrong; if (state.step >= steps.length) state.solved = true; save(); renderCycleTrace(el, cfg, state, save, steps, nodes); });
    const reset = el.querySelector('[data-act=reset]');
    if (reset) reset.addEventListener('click', () => { state.step = 0; state.mistakes = 0; delete state.solved; save(); renderCycleTrace(el, cfg, state, save, steps, nodes); });
  }
  function renderTrace(el, cfg, state, save) {
    const built = buildTrace(cfg);
    if (built.cycleMode) return renderCycleTrace(el, cfg, state, save, built.steps, built.nodes);
    const { steps, nodes } = built;
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

  /* ---------- kata: editor + tests, no reasoning gate. Also used as "fix-it"
     (starter = buggy code) — the replacement for guessable blanks/spot-the-bug. ----------
     cfg: { label, q, fn, starter, tests, hints, solution, solutionExplain, harness?, prelude?, fix?, isClass? } */
  function renderKata(el, cfg, state, save) {
    const code = state.code !== undefined ? state.code : window.T.trim(cfg.starter || '');
    const hints = cfg.hints || [];
    let html = header(cfg.label || (cfg.fix ? 'Fix it' : 'Write it'), state.solved, cfg.fix ? '🔧' : '⌨️');
    if (cfg.q) html += '<div class="q-text">' + cfg.q + '</div>';
    if (cfg.prelude) html += '<details class="ex-prelude"><summary>Provided code</summary>' + window.T.code('js', 'provided', cfg.prelude) + '</details>';
    html += '<div class="ex-editor-wrap"><div class="codeblock-header"><span>' + esc(cfg.fn + (cfg.isClass ? ' (class)' : '()')) + (cfg.fix ? ' — buggy: find and fix it' : ' — your code') + '</span><span class="kbd-hint">⌘/Ctrl+Enter runs tests · ⇧⌘/Ctrl+Enter runs code</span></div><div class="editor-host"></div></div>';
    html += '<div class="widget-actions"><button class="primary mini" data-act="run">▶ Run tests</button>' +
      '<button class="ghost mini" data-act="scratch" title="Execute the file top-to-bottom with no tests; console.log output and errors (with line numbers) appear in the console panel">▶ Run code</button>' +
      (hints.length ? '<button class="ghost mini" data-act="hint">💡 Hint (' + (state.hints || 0) + '/' + hints.length + ')</button>' : '') +
      '<button class="ghost mini" data-act="reset">Reset code</button></div>';
    html += '<div class="ex-hints" data-hints>' + hints.slice(0, state.hints || 0).map((h, i) => '<div class="ex-hint"><span class="ex-hint-n">Hint ' + (i + 1) + '</span>' + h + '</div>').join('') + '</div>';
    html += '<div class="repl-out ex-console" data-console></div>';
    html += '<div class="ex-results" data-results></div><div data-after></div>';
    el.innerHTML = html;
    const ed = window.Editor.create(el.querySelector('.editor-host'), { value: code, minRows: 6, onChange: v => { state.code = v; save(); }, onRun: () => run(), onRunAlt: () => runScratch() });
    const resultsEl = el.querySelector('[data-results]'), afterEl = el.querySelector('[data-after]'), consoleEl = el.querySelector('[data-console]');
    const lineOffset = window.Exercise.preludeOffset(cfg.prelude);
    const fullCode = () => (cfg.prelude ? window.T.trim(cfg.prelude) + '\n\n' : '') + ed.value;
    const paintOpts = { editor: ed, code: fullCode, lineOffset };
    window.Exercise.paintConsole(consoleEl, { logs: [], hint: window.Exercise.CONSOLE_HINT });
    let scratching = false;
    function runScratch() {
      if (scratching) return;
      scratching = true;
      window.Exercise.scratch({ code: ed.value, prelude: cfg.prelude, panel: consoleEl, editor: ed, btn: el.querySelector('[data-act=scratch]'), fn: cfg.fn, tests: cfg.tests, isClass: !!cfg.isClass }).then(() => { scratching = false; });
    }
    el.querySelector('[data-act=scratch]').addEventListener('click', runScratch);
    function paintAfter() {
      if (!state.solved) { afterEl.innerHTML = ''; return; }
      afterEl.innerHTML = explainBox('<div class="verdict v-right">✓ All tests pass</div>' + (cfg.explain || '')) +
        (cfg.solution ? '<details class="ex-solution"><summary>Reference</summary>' + window.T.code('js', 'reference — ' + cfg.fn, cfg.solution) + (cfg.solutionExplain || '') + '</details>' : '');
    }
    if (state.lastResults) window.Exercise.paintResults(resultsEl, state.lastResults, cfg.tests, state.lastSummary, paintOpts);
    paintAfter();
    let running = false;
    function run() {
      if (running) return;
      running = true;
      const btn = el.querySelector('[data-act=run]'); btn.disabled = true; btn.textContent = '… running';
      const results = [];
      resultsEl.innerHTML = '<div class="ex-results-empty">Running…</div>';
      const userCode = fullCode();
      window.Runner.run({ mode: 'suite', spec: { code: userCode, fn: cfg.fn, isClass: !!cfg.isClass, harness: cfg.harness, tests: cfg.tests, lineOffset } }, {
        onResult: (i, r) => { results[i] = r; },
        onTimeout: (i, logs) => { results[i] = { name: cfg.tests[i].name, timeout: true, logs }; },
        onDone: summary => {
          running = false; btn.disabled = false; btn.textContent = '▶ Run tests';
          for (let i = 0; i < cfg.tests.length; i++) if (!results[i]) results[i] = { name: cfg.tests[i].name, skipped: true };
          state.lastResults = results; state.lastSummary = summary;
          const allPass = !summary.loadError && !summary.timedOut && results.every(r => r.pass);
          if (allPass && !state.solved) { state.solved = true; const head = el.querySelector('.widget-head'); if (head && !head.querySelector('.widget-solved')) head.insertAdjacentHTML('beforeend', '<span class="widget-solved">✓ solved</span>'); }
          save();
          window.Exercise.paintResults(resultsEl, results, cfg.tests, summary, paintOpts);
          paintAfter();
        }
      });
    }
    el.querySelector('[data-act=run]').addEventListener('click', run);
    const hintBtn = el.querySelector('[data-act=hint]');
    if (hintBtn) hintBtn.addEventListener('click', () => {
      if ((state.hints || 0) >= hints.length) return;
      state.hints = (state.hints || 0) + 1; save();
      el.querySelector('[data-hints]').insertAdjacentHTML('beforeend', '<div class="ex-hint"><span class="ex-hint-n">Hint ' + state.hints + '</span>' + hints[state.hints - 1] + '</div>');
      hintBtn.textContent = '💡 Hint (' + state.hints + '/' + hints.length + ')';
    });
    el.querySelector('[data-act=reset]').addEventListener('click', () => { if (!confirm('Reset to the starter code?')) return; delete state.code; delete state.lastResults; save(); renderKata(el, cfg, state, save); });
  }

  /* ---------- breakit: supply an input that exposes a bug ----------
     cfg: { label, q, fn, buggy, solution, argsTemplate, harness?, hint, explain } */
  function renderBreakIt(el, cfg, state, save) {
    let html = header(cfg.label || 'Break it', state.solved, '🧨');
    html += '<div class="q-text">' + (cfg.q || '') + '</div>';
    html += window.T.code('js', cfg.name || (cfg.fn + ' — plausible, but wrong'), cfg.buggy);
    html += '<p class="dim" style="margin:-6px 0 8px">Write arguments (an array literal, one element per parameter) on which this version gives a <em>different answer</em> from a correct implementation — or never returns.</p>';
    html += '<div class="ex-editor-wrap"><div class="codeblock-header"><span>arguments for ' + esc(cfg.fn) + '(…)</span><span class="kbd-hint">⌘/Ctrl+Enter runs</span></div><div class="editor-host"></div></div>';
    html += '<div class="widget-actions"><button class="primary mini" data-act="run">▶ Try to break it</button><span class="trace-mistakes" data-tries>' + (state.tries ? state.tries + ' attempt' + (state.tries > 1 ? 's' : '') : '') + '</span></div>';
    html += '<div class="ex-results" data-results></div>';
    el.innerHTML = html;
    const ed = window.Editor.create(el.querySelector('.editor-host'), { value: state.args !== undefined ? state.args : window.T.trim(cfg.argsTemplate || '[ ]'), minRows: 3, onChange: v => { state.args = v; save(); }, onRun: () => run() });
    const resultsEl = el.querySelector('[data-results]');
    if (state.lastHtml) resultsEl.innerHTML = state.lastHtml;
    let running = false;
    function run() {
      if (running) return;
      running = true;
      const btn = el.querySelector('[data-act=run]'); btn.disabled = true; btn.textContent = '… running';
      resultsEl.innerHTML = '<div class="ex-results-empty">Running…</div>';
      const res = [];
      window.Runner.run({ mode: 'break', spec: { refCode: window.T.trim(cfg.solution), buggyCode: window.T.trim(cfg.buggy), fn: cfg.fn, argsSrc: ed.value, harness: cfg.harness } }, {
        onResult: (i, r) => { res[i] = r; },
        onTimeout: () => {},
        onDone: summary => {
          running = false; btn.disabled = false; btn.textContent = '▶ Try to break it';
          state.tries = (state.tries || 0) + 1;
          const show = r => r ? (r.error ? 'threw — ' + r.error : 'returned ' + r.actual) : '—';
          let out = '';
          if (summary.loadError) out = '<div class="ex-load-error">' + esc(summary.loadError) + '</div>';
          else if (summary.timedOut) {
            if (summary.timedOutIndex === 1 && res[0]) { state.solved = true; out = explainBox('<div class="verdict v-right">✓ Broken — the buggy version never returned (infinite loop), while the correct one ' + esc(show(res[0])) + '.</div>' + (cfg.explain || '')); }
            else out = explainBox('<div class="verdict v-wrong">The correct implementation itself timed out on that input — use something smaller.</div>');
          } else if (summary.differ) {
            state.solved = true;
            out = explainBox('<div class="verdict v-right">✓ Broken. Correct: ' + esc(show(res[0])) + ' · Buggy: ' + esc(show(res[1])) + '</div>' + (cfg.explain || ''));
          } else {
            out = explainBox('<div class="verdict v-wrong">Both agree on that input (' + esc(show(res[0])) + ') — the bug is still hiding.</div>' + (state.tries >= 2 && cfg.hint ? '<p><strong>Hint:</strong> ' + cfg.hint + '</p>' : '<p class="dim">Think about which assumption the code makes, then construct the input that violates it.</p>'));
          }
          state.lastHtml = out; save();
          resultsEl.innerHTML = out;
          el.querySelector('[data-tries]').textContent = state.tries + ' attempt' + (state.tries > 1 ? 's' : '');
          const head = el.querySelector('.widget-head');
          if (state.solved && head && !head.querySelector('.widget-solved')) head.insertAdjacentHTML('beforeend', '<span class="widget-solved">✓ solved</span>');
        }
      });
    }
    el.querySelector('[data-act=run]').addEventListener('click', run);
  }

  const RENDERERS = { kata: renderKata, breakit: renderBreakIt, mcq: renderMCQ, multi: renderMulti, order: renderOrder, blanks: renderBlanks, spotbug: renderSpotBug, repl: renderRepl, drill: renderDrill, trace: renderTrace };

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
