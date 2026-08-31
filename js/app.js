/* App engine: routing, sidebar, dashboard, quiz sections, progress persistence. */
(function () {
  const STORE_KEY = 'algo-prep-v1';
  const THEME_KEY = 'algo-prep-theme';
  const WIDTH_KEY = 'algo-prep-sidebar-w';
  const MODULES = window.MODULES;
  const esc = window.Highlighter.esc;
  const $ = sel => document.querySelector(sel);

  console.log('Algo Prep · build ' + (window.APP_VERSION || 'unknown'));

  let storage;
  try { localStorage.setItem('__ap_t', '1'); localStorage.removeItem('__ap_t'); storage = localStorage; }
  catch (e) {
    const mem = {};
    storage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
  }

  /* ---------- theme ---------- */
  let theme = storage.getItem(THEME_KEY) || 'light';
  function applyTheme() {
    document.documentElement.setAttribute('data-app-theme', theme);
    const btn = $('#theme-btn');
    if (btn) btn.textContent = theme === 'light' ? '☾ Dark' : '☀ Light';
  }
  applyTheme();
  $('#theme-btn').addEventListener('click', () => { theme = theme === 'light' ? 'dark' : 'light'; storage.setItem(THEME_KEY, theme); applyTheme(); });

  /* ---------- sidebar width (drag the border; double-click resets) ---------- */
  const SIDEBAR_MIN = 240, SIDEBAR_MAX = 560;
  function applySidebarWidth(w) {
    if (w == null) document.documentElement.style.removeProperty('--sidebar-w');
    else document.documentElement.style.setProperty('--sidebar-w', Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, w)) + 'px');
  }
  applySidebarWidth(+storage.getItem(WIDTH_KEY) || null);
  (function () {
    const handle = $('#sidebar-resizer');
    let dragging = false;
    handle.addEventListener('pointerdown', e => {
      dragging = true; try { handle.setPointerCapture(e.pointerId); } catch (_) { /* synthetic/odd pointers: fall back to plain move events */ } document.body.classList.add('sidebar-resizing'); e.preventDefault();
    });
    handle.addEventListener('pointermove', e => { if (dragging) applySidebarWidth(e.clientX); });
    const stop = e => {
      if (!dragging) return;
      dragging = false; document.body.classList.remove('sidebar-resizing');
      const w = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, e.clientX));
      applySidebarWidth(w); storage.setItem(WIDTH_KEY, String(w));
    };
    handle.addEventListener('pointerup', stop);
    handle.addEventListener('pointercancel', stop);
    handle.addEventListener('dblclick', () => { applySidebarWidth(null); storage.removeItem(WIDTH_KEY); });
  })();

  /* ---------- persistence ---------- */
  let store;
  try { store = JSON.parse(storage.getItem(STORE_KEY)) || {}; } catch (e) { store = {}; }
  store.completed = store.completed || {};
  store.quiz = store.quiz || {};
  store.checks = store.checks || {};
  store.collapsed = store.collapsed || {};
  store.widgets = store.widgets || {};
  store.ex = store.ex || {};
  let saveTimer = null;
  function save() {
    // debounce: editors call save on every keystroke
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => storage.setItem(STORE_KEY, JSON.stringify(store)), 150);
  }
  window.addEventListener('beforeunload', () => storage.setItem(STORE_KEY, JSON.stringify(store)));

  /* ---------- helpers ---------- */
  function secId(mi, si) { return mi + '-' + si; }
  function totalSections() { return MODULES.reduce((n, m) => n + m.sections.length, 0); }
  function completedCount() {
    let n = 0;
    MODULES.forEach((m, mi) => m.sections.forEach((s, si) => { if (store.completed[secId(mi, si)]) n++; }));
    return n;
  }
  function exercisesIn(sec) {
    const ids = [];
    const re = /data-wid="(w\d+)"/g;
    let m;
    const html = sec.html || '';
    while ((m = re.exec(html)) !== null) {
      const cfg = window.T._widgets[m[1]];
      if (cfg && cfg.type === 'exercise') ids.push(cfg);
    }
    return ids;
  }
  function exStatus(cfg) { return window.Exercise.status(cfg, store); }
  function allExercises() {
    const out = [];
    MODULES.forEach((m, mi) => m.sections.forEach((s, si) => exercisesIn(s).forEach(cfg => out.push({ cfg, mi, si, mod: m, sec: s }))));
    return out;
  }

  function parseHash() {
    if (location.hash === '#/home' || location.hash === '') {
      if (location.hash === '' && store.last && store.last !== 'home') {
        const p = store.last.split('-').map(Number);
        if (MODULES[p[0]] && MODULES[p[0]].sections[p[1]]) return p;
      }
      return 'home';
    }
    const m = location.hash.match(/^#\/(\d+)\/(\d+)/);
    if (m) {   // URLs are 1-based (#/3/1 = module 3, section 1); indices are 0-based
      const mi = Math.max(0, Math.min(+m[1] - 1, MODULES.length - 1));
      const si = Math.max(0, Math.min(+m[2] - 1, MODULES[mi].sections.length - 1));
      return [mi, si];
    }
    return 'home';
  }
  function go(mi, si) { location.hash = '#/' + (mi + 1) + '/' + (si + 1); }
  function flatIndex(mi, si) { let idx = 0; for (let i = 0; i < mi; i++) idx += MODULES[i].sections.length; return idx + si; }
  function fromFlat(idx) {
    for (let mi = 0; mi < MODULES.length; mi++) { if (idx < MODULES[mi].sections.length) return [mi, idx]; idx -= MODULES[mi].sections.length; }
    return null;
  }

  /* ---------- sidebar ---------- */
  function typeTag(sec) {
    if (sec.type === 'quiz') return '<span class="type-tag quiz">quiz</span>';
    if (sec.type === 'project') return '<span class="type-tag project">project</span>';
    if (sec.type === 'drill') return '<span class="type-tag drill">drill</span>';
    return '';
  }
  function renderNav(activeMi, activeSi) {
    const nav = $('#nav');
    const isHome = activeMi === 'home';
    nav.innerHTML = '<div class="nav-home' + (isHome ? ' active' : '') + '" data-home>⌂ Dashboard</div>' + MODULES.map((mod, mi) => {
      const collapsed = store.collapsed[mi] && mi !== activeMi;
      const sections = mod.sections.map((sec, si) => {
        const id = secId(mi, si);
        const done = store.completed[id];
        const active = mi === activeMi && si === activeSi;
        const exs = exercisesIn(sec);
        const exDone = exs.filter(c => exStatus(c) === 'Complete').length;
        const exTag = exs.length ? '<span class="ex-count' + (exDone === exs.length ? ' all' : exDone ? ' some' : '') + '" title="exercises complete">' + exDone + '/' + exs.length + '</span>' : '';
        return '<div class="nav-section' + (done ? ' done' : '') + (active ? ' active' : '') + '" data-mi="' + mi + '" data-si="' + si + '">' +
          '<span class="mark">✓</span><span class="nav-sec-title">' + esc(sec.title) + '</span>' + exTag + typeTag(sec) + '</div>';
      }).join('');
      const doneN = mod.sections.filter((_, si) => store.completed[secId(mi, si)]).length;
      return '<div class="nav-module' + (collapsed ? ' collapsed' : '') + (doneN === mod.sections.length ? ' complete' : '') + '" data-mi="' + mi + '">' +
        '<button class="nav-module-title"><span class="nav-module-num">' + (mi + 1) + '</span><span class="nav-module-text">' + esc(mod.title) + '</span>' +
        '<span class="nav-module-min">' + (mod.minutes ? mod.minutes + 'm' : '') + '</span><span class="chev">▼</span></button>' +
        '<div class="nav-sections">' + sections + '</div></div>';
    }).join('');
    nav.querySelector('[data-home]').addEventListener('click', () => { location.hash = '#/home'; $('#sidebar').classList.remove('open'); });
    nav.querySelectorAll('.nav-module-title').forEach(btn => btn.addEventListener('click', () => {
      const mi = +btn.parentElement.dataset.mi;
      store.collapsed[mi] = !store.collapsed[mi]; save();
      btn.parentElement.classList.toggle('collapsed');
    }));
    nav.querySelectorAll('.nav-section').forEach(el => el.addEventListener('click', () => { go(+el.dataset.mi, +el.dataset.si); $('#sidebar').classList.remove('open'); }));
    const pct = Math.round(100 * completedCount() / totalSections());
    $('#overall-fill').style.width = pct + '%';
    $('#overall-label').textContent = pct + '% · ' + completedCount() + '/' + totalSections() + ' sections';
  }

  /* ---------- dashboard ---------- */
  function fmtMin(sec) { const m = Math.round(sec / 60); return m < 60 ? m + ' min' : Math.floor(m / 60) + 'h ' + (m % 60) + 'm'; }
  function renderHome() {
    const exs = allExercises();
    const done = exs.filter(e => exStatus(e.cfg) === 'Complete');
    const scores = done.map(e => window.Exercise.score(e.cfg, store)).filter(s => s !== null);
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    const spent = exs.reduce((a, e) => a + ((store.ex[e.cfg.id] || {}).elapsed || 0), 0);
    const budget = MODULES.reduce((a, m) => a + (m.minutes || 0), 0);
    const pct = Math.round(100 * completedCount() / totalSections());
    let resume = null;
    if (store.last && store.last !== 'home') { const p = store.last.split('-').map(Number); if (MODULES[p[0]] && MODULES[p[0]].sections[p[1]]) resume = p; }
    const inProgress = exs.find(e => { const s = exStatus(e.cfg); return s !== 'Complete' && s !== 'Not started'; });
    const nextUp = exs.find(e => exStatus(e.cfg) === 'Not started');

    let html = '<div class="home-hero"><div><div class="home-kicker">Coding interview prep: patterns first</div><h1>Pattern recognition, then execution.</h1>' +
      '<p class="home-lede">Eight core modules, ~3 hours. Every exercise forces the interview loop: <em>identify the abstraction → choose the structure → explain → estimate complexity → implement → test → handle the follow-up.</em> Reading is kept short; the learning is in the doing.</p>' +
      '<div class="home-cta">' +
      (resume ? '<button class="primary" data-go="' + resume.join('/') + '">▶ Resume: ' + esc(MODULES[resume[0]].sections[resume[1]].title) + '</button>' : '<button class="primary" data-go="0/0">▶ Start Module 1</button>') +
      (inProgress ? '<button class="ghost" data-go="' + inProgress.mi + '/' + inProgress.si + '">Continue exercise: ' + esc(inProgress.cfg.title) + '</button>' : nextUp && resume ? '<button class="ghost" data-go="' + nextUp.mi + '/' + nextUp.si + '">Next exercise: ' + esc(nextUp.cfg.title) + '</button>' : '') +
      '</div></div>' +
      '<div class="home-stats"><div class="stat"><div class="stat-n">' + pct + '%</div><div class="stat-l">sections done</div></div>' +
      '<div class="stat"><div class="stat-n">' + done.length + '<span class="stat-sub">/' + exs.length + '</span></div><div class="stat-l">exercises complete</div></div>' +
      '<div class="stat"><div class="stat-n">' + (avg === null ? '–' : avg) + '</div><div class="stat-l">avg rubric score</div></div>' +
      '<div class="stat"><div class="stat-n">' + fmtMin(spent) + '</div><div class="stat-l">on exercises · budget ' + budget + ' min</div></div></div></div>';

    html += '<h2>The path</h2><p class="dim">Recommended order top to bottom. Skipping is fine — Module 3 (graphs) and Module 7 (stateful implementation) matter most if you must triage.</p>';
    html += '<div class="home-modules">' + MODULES.map((m, mi) => {
      const secDone = m.sections.filter((_, si) => store.completed[secId(mi, si)]).length;
      const mexs = exs.filter(e => e.mi === mi);
      const mdone = mexs.filter(e => exStatus(e.cfg) === 'Complete').length;
      const first = (() => { for (let si = 0; si < m.sections.length; si++) if (!store.completed[secId(mi, si)]) return si; return 0; })();
      return '<div class="home-mod' + (secDone === m.sections.length ? ' complete' : secDone ? ' started' : '') + '" data-go="' + mi + '/' + first + '">' +
        '<div class="home-mod-num">' + (mi + 1) + '</div><div class="home-mod-body"><div class="home-mod-title">' + esc(m.title) + '</div><div class="home-mod-sub">' + esc(m.blurb || '') + '</div>' +
        '<div class="home-mod-bar"><span style="width:' + (100 * secDone / m.sections.length) + '%"></span></div></div>' +
        '<div class="home-mod-meta"><span>' + (m.minutes ? '~' + m.minutes + ' min' : m.optional ? 'optional' : '') + '</span><span>' + secDone + '/' + m.sections.length + ' sections</span>' + (mexs.length ? '<span>' + mdone + '/' + mexs.length + ' exercises</span>' : '') + '</div></div>';
    }).join('') + '</div>';

    // weak spots: rubric categories aggregated over completed exercises
    const cats = window.Exercise.categoryTotals(store);
    if (Object.keys(cats).length) {
      const order = ['abstraction', 'algorithm', 'complexity', 'edge', 'explanation', 'implementation'];
      html += '<h2>Where you lose points</h2><p class="dim">First-try reasoning answers, hint usage and edge-case coverage, aggregated across ' + done.length + ' completed exercise' + (done.length > 1 ? 's' : '') + '. Lowest bars are what to redo.</p><div class="weak-spots">' +
        order.filter(c => cats[c]).map(c => { const t = cats[c], pct = Math.round(100 * t.got / t.max); return '<div class="weak-row"><span>' + esc(t.label) + '</span><span class="ex-score-bar"><span class="' + (pct >= 80 ? 'good' : pct >= 60 ? 'ok' : 'low') + '" style="width:' + pct + '%"></span></span><span class="weak-pct">' + pct + '%</span></div>'; }).join('') + '</div>';
    }
    // due for a redo: completed a day ago, or scored under 80, or leaned on hints
    const DAY = 24 * 3600 * 1000;
    const due = done.map(e => {
      const st = store.ex[e.cfg.id], sc = window.Exercise.score(e.cfg, store), h = window.Exercise.hintsUsed(e.cfg, store);
      const why = [];
      if (st.completedAt && Date.now() - st.completedAt > DAY) why.push('completed ' + Math.floor((Date.now() - st.completedAt) / DAY) + 'd ago');
      if (sc !== null && sc < 80) why.push('scored ' + sc);
      if (h) why.push(h + ' hint' + (h > 1 ? 's' : ''));
      return { e, why };
    }).filter(d => d.why.length);
    if (due.length) {
      html += '<h2>Due for a cold redo</h2><p class="dim">Retention comes from the second attempt, not the first. Open one and press <strong>↻ Redo cold</strong> at the bottom of its review.</p><div class="ex-board">' +
        due.map(d => '<div class="ex-board-row due" data-go="' + d.e.mi + '/' + d.e.si + '"><span class="ex-status redo">redo</span><span class="ex-board-title">' + esc(d.e.cfg.title) + '</span><span class="ex-board-mod">M' + (d.e.mi + 1) + '</span><span class="ex-board-why">' + esc(d.why.join(' · ')) + '</span></div>').join('') + '</div>';
    }

    html += '<h2>Exercise board</h2><div class="ex-board">' + exs.map(e => {
      const s = exStatus(e.cfg), sc = window.Exercise.score(e.cfg, store);
      const st = store.ex[e.cfg.id] || {}, el = st.elapsed, attempts = (st.attempts || []).length;
      return '<div class="ex-board-row" data-go="' + e.mi + '/' + e.si + '"><span class="ex-status ' + s.toLowerCase().replace(/\s/g, '-') + '">' + s + '</span><span class="ex-board-title">' + esc(e.cfg.title) + (attempts ? ' <span class="ex-attempt-n" title="previous attempts">×' + (attempts + (s === 'Complete' ? 1 : 0)) + '</span>' : '') + '</span><span class="ex-board-mod">M' + (e.mi + 1) + '</span>' +
        '<span class="ex-board-time">' + (el ? fmtMin(el) : '') + (e.cfg.time ? ' <span class="dim">/ ' + e.cfg.time + '</span>' : '') + '</span><span class="ex-board-score">' + (sc === null ? (attempts && st.attempts[attempts - 1].score !== null ? '<span class="dim">' + st.attempts[attempts - 1].score + '</span>' : '') : sc + '<span class="dim">/100</span>') + '</span></div>';
    }).join('') + '</div>';

    $('#content').innerHTML = html;
    $('#content').querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { const [mi, si] = b.dataset.go.split('/').map(Number); go(mi, si); }));
    $('#pager').style.display = 'none';
    renderNav('home', null);
    window.scrollTo(0, 0);
  }

  /* ---------- section rendering ---------- */
  function typeChip(type) {
    if (type === 'quiz') return '<span class="type-tag quiz type-chip">quiz</span>';
    if (type === 'project') return '<span class="type-tag project type-chip">project</span>';
    if (type === 'drill') return '<span class="type-tag drill type-chip">drill</span>';
    return '';
  }
  function render() {
    const where = parseHash();
    if (where === 'home') { store.last = 'home'; save(); renderHome(); return; }
    const [mi, si] = where;
    const mod = MODULES[mi], sec = mod.sections[si], id = secId(mi, si);
    store.last = id; save();
    $('#pager').style.display = '';
    const hasState = store.completed[id] || store.quiz[id] || store.checks[id] || (store.widgets[id] && Object.keys(store.widgets[id]).length);
    let html = '<div class="section-breadcrumb"><span>Module ' + (mi + 1) + ' · ' + esc(mod.title) + '</span>' + typeChip(sec.type) +
      (sec.minutes ? '<span class="sec-min">~' + sec.minutes + ' min</span>' : '') +
      (hasState ? '<button id="clear-section-btn" title="Clear quiz answers, widgets and completion for this section (exercises keep their own state)">↺ Clear section</button>' : '') + '</div>';
    html += '<h1>' + esc(sec.title) + '</h1>';
    if (sec.type === 'quiz') html += renderQuiz(id, sec);
    else {
      html += sec.html;
      if (sec.checklist) html += renderChecklist(id, sec);
      html += completeBanner(id);
    }
    $('#content').innerHTML = html;
    window.Widgets.initAll($('#content'), id, store, save);
    renderNav(mi, si);
    renderPager(mi, si);
    window.scrollTo(0, 0);
  }

  function completeBanner(id) {
    const done = store.completed[id];
    return '<div class="complete-banner">' + (done
      ? '<span class="done-note">✓ Section completed</span><button class="ghost" id="uncomplete-btn">Mark as unread</button>'
      : '<button class="primary" id="complete-btn">Mark complete &amp; continue →</button>') + '</div>';
  }

  /* ---------- quiz ---------- */
  function renderQuiz(id, sec) {
    const state = store.quiz[id] || { answers: {} };
    const answered = Object.keys(state.answers).length, total = sec.questions.length, allDone = answered === total;
    let score = 0;
    sec.questions.forEach((q, qi) => { if (state.answers[qi] === q.answer) score++; });
    let html = '<div class="quiz-intro"><div class="score-ring' + (allDone ? (score / total >= 0.7 ? ' pass' : ' fail') : '') + '">' + (allDone ? score + '/' + total : answered + '/' + total) + '</div>' +
      '<div>' + (sec.intro || '<p>Instant feedback and an explanation for every question. Aim for 70%+; retake freely.</p>') + '</div></div>';
    html += sec.questions.map((q, qi) => {
      const chosen = state.answers[qi], isAnswered = chosen !== undefined;
      const perm = window.T.permute(id + ':' + qi, q.choices.length);
      const choices = perm.map((ci, pos) => {
        let cls = 'choice';
        if (isAnswered) { if (ci === q.answer) cls += ' correct'; else if (ci === chosen) cls += ' wrong'; }
        return '<button class="' + cls + '" data-qi="' + qi + '" data-ci="' + ci + '"' + (isAnswered ? ' disabled' : '') + '><span class="letter">' + String.fromCharCode(65 + pos) + '</span><span>' + q.choices[ci] + '</span></button>';
      }).join('');
      const right = chosen === q.answer;
      const explanation = '<div class="explanation' + (isAnswered ? ' visible' : '') + (right ? ' right' : ' wrong-v') + '">' +
        (isAnswered ? '<div class="verdict">' + (right ? '✓ Correct' : '✗ Not quite — the answer is ' + String.fromCharCode(65 + perm.indexOf(q.answer))) + '</div>' : '') + q.explain + '</div>';
      return '<div class="question-card"><div class="q-num">Question ' + (qi + 1) + ' of ' + total + '</div>' + (q.pre || '') + '<div class="q-text">' + q.q + '</div>' + choices + explanation + '</div>';
    }).join('');
    html += '<div class="quiz-actions">' + (answered > 0 ? '<button class="ghost" id="retake-btn">Retake quiz</button>' : '') + (allDone ? '<button class="primary" id="quiz-next-btn">Continue →</button>' : '') + '</div>';
    return html;
  }

  function renderChecklist(id, sec) {
    const state = store.checks[id] || {};
    return '<h2>Checklist</h2><div class="checklist">' + sec.checklist.map((item, i) =>
      '<div class="check-item' + (state[i] ? ' checked' : '') + '" data-idx="' + i + '"><span class="box">✓</span><span class="check-label">' + item + '</span></div>').join('') + '</div>';
  }

  /* ---------- delegated events ---------- */
  $('#content').addEventListener('click', e => {
    const where = parseHash();
    if (where === 'home') return;
    const [mi, si] = where, sec = MODULES[mi].sections[si], id = secId(mi, si);
    const copyBtn = e.target.closest('.copy-btn');
    if (copyBtn) {
      const raw = window.T._raw[copyBtn.dataset.codeId] || '';
      if (navigator.clipboard) navigator.clipboard.writeText(raw).catch(() => {});
      copyBtn.textContent = 'Copied ✓'; setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
      return;
    }
    const choice = e.target.closest('.question-card .choice');
    if (choice && !choice.disabled && sec.type === 'quiz') {
      const qi = +choice.dataset.qi, ci = +choice.dataset.ci;
      const state = store.quiz[id] || (store.quiz[id] = { answers: {} });
      if (state.answers[qi] !== undefined) return;
      state.answers[qi] = ci;
      if (Object.keys(state.answers).length === sec.questions.length) {
        let score = 0; sec.questions.forEach((q, i) => { if (state.answers[i] === q.answer) score++; });
        state.score = score; state.total = sec.questions.length; store.completed[id] = true;
      }
      save();
      const y = window.scrollY; render(); window.scrollTo(0, y);
      return;
    }
    const check = e.target.closest('.check-item');
    if (check) { const idx = +check.dataset.idx; const state = store.checks[id] || (store.checks[id] = {}); state[idx] = !state[idx]; save(); check.classList.toggle('checked'); return; }
    if (e.target.id === 'clear-section-btn') {
      if (confirm('Clear this section’s quiz answers, inline widgets and completion? (Exercises keep their state — use "Restart exercise" inside one.)')) {
        delete store.completed[id]; delete store.quiz[id]; delete store.checks[id]; delete store.widgets[id]; save(); render();
      }
      return;
    }
    if (e.target.id === 'complete-btn') { store.completed[id] = true; save(); const next = fromFlat(flatIndex(mi, si) + 1); if (next) go(next[0], next[1]); else render(); return; }
    if (e.target.id === 'uncomplete-btn') { delete store.completed[id]; save(); render(); return; }
    if (e.target.id === 'retake-btn') { delete store.quiz[id]; delete store.completed[id]; save(); render(); return; }
    if (e.target.id === 'quiz-next-btn') { const next = fromFlat(flatIndex(mi, si) + 1); if (next) go(next[0], next[1]); return; }
  });

  /* ---------- pager ---------- */
  function renderPager(mi, si) {
    const idx = flatIndex(mi, si);
    const prev = idx > 0 ? fromFlat(idx - 1) : null, next = fromFlat(idx + 1);
    const prevBtn = $('#prev-btn'), nextBtn = $('#next-btn');
    prevBtn.disabled = !prev; nextBtn.disabled = !next;
    prevBtn.onclick = () => prev && go(prev[0], prev[1]);
    nextBtn.onclick = () => next && go(next[0], next[1]);
    prevBtn.textContent = prev ? '← ' + MODULES[prev[0]].sections[prev[1]].title : '← Previous';
    nextBtn.textContent = next ? MODULES[next[0]].sections[next[1]].title + ' →' : 'You’re done! 🎉';
  }

  /* ---------- chrome ---------- */
  $('#sidebar-toggle').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
  $('#home-btn').addEventListener('click', () => { location.hash = '#/home'; });
  $('#reset-btn').addEventListener('click', () => {
    if (confirm('Reset ALL progress — quiz scores, exercise code and answers, completed sections?')) { storage.removeItem(STORE_KEY); location.hash = '#/home'; location.reload(); }
  });
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    if (parseHash() === 'home') return;
    if (e.key === 'ArrowRight' && !$('#next-btn').disabled) $('#next-btn').click();
    if (e.key === 'ArrowLeft' && !$('#prev-btn').disabled) $('#prev-btn').click();
  });
  window.addEventListener('hashchange', render);
  // exercises report phase changes so the sidebar counters stay live without a full re-render
  window.addEventListener('exercise-progress', () => {
    const w = parseHash();
    if (w === 'home') return;
    const [mi, si] = w, id = secId(mi, si), sec = MODULES[mi].sections[si];
    // a section whose exercises are all complete counts as complete
    const exs = exercisesIn(sec);
    if (exs.length && !store.completed[id] && exs.every(c => exStatus(c) === 'Complete')) {
      store.completed[id] = true; save();
      const banner = document.querySelector('.complete-banner');
      if (banner) banner.innerHTML = '<span class="done-note">✓ Section completed</span><button class="ghost" id="uncomplete-btn">Mark as unread</button>';
    }
    renderNav(mi, si);
  });

  /* ---------- stale-tab detection ---------- */
  // Hash routing never refetches scripts, so a long-lived tab silently keeps
  // running pre-deploy code. On navigation/refocus (throttled) compare the
  // running build against the deployed js/version.js and offer a reload.
  (function () {
    if (window.APP_VERSION === 'dev' || location.protocol === 'file:') return;
    const CHECK_EVERY = 5 * 60 * 1000;
    let lastCheck = 0, notified = false;
    function check() {
      const now = Date.now();
      if (notified || now - lastCheck < CHECK_EVERY) return;
      lastCheck = now;
      fetch('js/version.js?rt=' + now, { cache: 'no-store' })
        .then(r => (r.ok ? r.text() : ''))
        .then(src => {
          const m = src.match(/APP_VERSION\s*=\s*'([^']*)'/);
          if (!m || notified || m[1] === window.APP_VERSION) return;
          notified = true;
          const el = document.createElement('div');
          el.className = 'update-toast';
          el.innerHTML = '<span>New version deployed — build ' + esc(m[1]) + '</span>' +
            '<button class="primary">Reload</button><button class="ghost" aria-label="Dismiss">✕</button>';
          el.querySelector('.primary').addEventListener('click', () => location.reload());
          el.querySelector('.ghost').addEventListener('click', () => el.remove());
          document.body.appendChild(el);
        })
        .catch(() => { /* offline or transient — try again next time */ });
    }
    window.addEventListener('hashchange', check);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  })();

  render();
})();
