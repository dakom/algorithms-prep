/* Lightweight code editor: a transparent textarea over a syntax-highlighted
   <pre>, with line numbers, Tab/Shift-Tab indent, auto-indent on Enter, and
   Cmd/Ctrl+Enter to run. No dependencies, works from file://. */
(function () {
  const esc = window.Highlighter.esc;

  function create(host, opts) {
    opts = opts || {};
    host.classList.add('editor');
    host.innerHTML =
      '<div class="editor-gutter"></div>' +
      '<div class="editor-body">' +
        '<pre class="editor-hl" aria-hidden="true"><code></code></pre>' +
        '<textarea class="editor-ta" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off"' +
          (opts.readOnly ? ' readonly' : '') + '></textarea>' +
      '</div>';
    const gutter = host.querySelector('.editor-gutter');
    const hl = host.querySelector('.editor-hl code');
    const ta = host.querySelector('.editor-ta');
    const pre = host.querySelector('.editor-hl');

    function paint() {
      const v = ta.value;
      hl.innerHTML = window.Highlighter.highlight(v, 'js') + '\n';
      const n = v.split('\n').length;
      let g = '';
      for (let i = 1; i <= n; i++) g += i + '\n';
      gutter.textContent = g;
      const rows = Math.max(opts.minRows || 6, n + 1);
      ta.rows = rows;
      // let the highlighted layer and gutter follow the textarea height
      pre.style.height = ta.scrollHeight + 'px';
      gutter.style.height = ta.scrollHeight + 'px';
    }
    function sync() { pre.scrollLeft = ta.scrollLeft; }

    ta.addEventListener('input', () => { paint(); if (opts.onChange) opts.onChange(ta.value); });
    ta.addEventListener('scroll', sync);
    ta.addEventListener('keydown', e => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (e.shiftKey && opts.onRunAlt) opts.onRunAlt(); else if (opts.onRun) opts.onRun();
        return;
      }
      if (ta.readOnly) return;
      const s = ta.selectionStart, en = ta.selectionEnd, v = ta.value;
      if (e.key === 'Tab') {
        e.preventDefault();
        const lineStart = v.lastIndexOf('\n', s - 1) + 1;
        if (s !== en || e.shiftKey) {
          // indent/dedent every selected line
          const selEndLine = v.indexOf('\n', en - 1);
          const blockEnd = selEndLine === -1 ? v.length : (en > lineStart && v[en - 1] === '\n' ? en - 1 : selEndLine);
          const block = v.slice(lineStart, blockEnd);
          const lines = block.split('\n');
          const out = lines.map(l => e.shiftKey ? l.replace(/^ {1,2}/, '') : '  ' + l).join('\n');
          ta.value = v.slice(0, lineStart) + out + v.slice(blockEnd);
          ta.selectionStart = lineStart;
          ta.selectionEnd = lineStart + out.length;
        } else {
          ta.value = v.slice(0, s) + '  ' + v.slice(en);
          ta.selectionStart = ta.selectionEnd = s + 2;
        }
        paint(); if (opts.onChange) opts.onChange(ta.value);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const lineStart = v.lastIndexOf('\n', s - 1) + 1;
        const line = v.slice(lineStart, s);
        const indent = (line.match(/^\s*/) || [''])[0];
        const opens = /[{[(]\s*$/.test(line);
        const closesNext = /^\s*[}\])]/.test(v.slice(en));
        let insert = '\n' + indent + (opens ? '  ' : '');
        let caret = s + insert.length;
        if (opens && closesNext) insert += '\n' + indent;   // cursor between { and }
        ta.value = v.slice(0, s) + insert + v.slice(en);
        ta.selectionStart = ta.selectionEnd = caret;
        paint(); if (opts.onChange) opts.onChange(ta.value);
        return;
      }
      if (e.key === '}' && s === en) {
        // dedent a lone closing brace typed on an indented blank line
        const lineStart = v.lastIndexOf('\n', s - 1) + 1;
        const line = v.slice(lineStart, s);
        if (/^\s{2,}$/.test(line)) {
          e.preventDefault();
          const nl = line.slice(0, -2);
          ta.value = v.slice(0, lineStart) + nl + '}' + v.slice(en);
          ta.selectionStart = ta.selectionEnd = lineStart + nl.length + 1;
          paint(); if (opts.onChange) opts.onChange(ta.value);
        }
      }
    });

    const api = {
      get value() { return ta.value; },
      set value(v) { ta.value = v; paint(); },
      focus() { ta.focus(); },
      /* put the caret at the start of 1-based line n and scroll it into view */
      gotoLine(n) {
        const lines = ta.value.split('\n');
        let idx = 0;
        for (let i = 0; i < Math.min(n - 1, lines.length - 1); i++) idx += lines[i].length + 1;
        const firstNonSpace = (lines[Math.min(n, lines.length) - 1] || '').search(/\S/);
        idx += firstNonSpace > 0 ? firstNonSpace : 0;
        ta.focus();
        ta.selectionStart = ta.selectionEnd = idx;
        const lh = parseFloat(getComputedStyle(ta).lineHeight) || 20;
        const y = (n - 1) * lh;
        host.scrollIntoView({ block: 'nearest' });
        if (y < ta.scrollTop || y > ta.scrollTop + ta.clientHeight - lh) ta.scrollTop = Math.max(0, y - ta.clientHeight / 2);
      },
      textarea: ta,
      setReadOnly(ro) { ta.readOnly = !!ro; host.classList.toggle('readonly', !!ro); }
    };
    api.value = opts.value || '';
    if (opts.readOnly) host.classList.add('readonly');
    return api;
  }

  window.Editor = { create };
})();
