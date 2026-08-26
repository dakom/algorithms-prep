/* Minimal JS/JSON/text syntax highlighter + template helpers used by content files.
   Tokenizes with one combined regex so strings/comments never get double-styled. */
(function () {
  const KW = new Set(('const,let,var,function,return,if,else,for,while,do,switch,case,break,continue,' +
    'new,class,extends,super,this,typeof,instanceof,in,of,try,catch,finally,throw,async,await,yield,' +
    'import,export,from,default,delete,void,static,get,set,null,undefined,true,false').split(','));
  const CLS = new Set(('JSON,Math,Date,Promise,Array,Object,Symbol,Number,String,Boolean,Error,TypeError,RangeError,' +
    'Map,Set,WeakMap,WeakSet,console,Infinity,NaN,PriorityQueue,MinHeap,MaxHeap,Ledger,Node').split(','));

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function highlightJS(src) {
    const re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`)|\b(\d+(?:\.\d+)?)\b|([A-Za-z_$][\w$]*)/g;
    let out = '', last = 0, m;
    while ((m = re.exec(src)) !== null) {
      out += esc(src.slice(last, m.index));
      last = re.lastIndex;
      if (m[1]) out += '<span class="tok-com">' + esc(m[1]) + '</span>';
      else if (m[2]) out += '<span class="tok-str">' + esc(m[2]) + '</span>';
      else if (m[3]) out += '<span class="tok-num">' + esc(m[3]) + '</span>';
      else if (m[4]) {
        const w = m[4];
        const next = src.slice(last).match(/^\s*\(/);
        if (KW.has(w)) out += '<span class="tok-kw">' + w + '</span>';
        else if (CLS.has(w)) out += '<span class="tok-cls">' + w + '</span>';
        else if (next) out += '<span class="tok-fn">' + w + '</span>';
        else out += w;
      }
    }
    out += esc(src.slice(last));
    return out;
  }

  function highlightJSON(src) {
    return esc(src)
      .replace(/(&quot;|")([^"]*?)\1(\s*:)/g, '<span class="tok-prop">"$2"</span>$3')
      .replace(/: (".*?")/g, ': <span class="tok-str">$1</span>')
      .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tok-num">$1</span>')
      .replace(/\b(true|false|null)\b/g, '<span class="tok-kw">$1</span>');
  }

  window.Highlighter = {
    highlight(src, lang) {
      if (!lang || lang === 'js' || lang === 'javascript') return highlightJS(src);
      if (lang === 'json') return highlightJSON(src);
      return esc(src);
    },
    esc
  };

  /* ---- Template helpers used by content files ---- */
  let codeId = 0;
  const trim = s => s.replace(/^\n/, '').replace(/\s+$/, '');
  window.T = {
    _raw: {},
    trim,
    code(lang, name, src) {
      src = trim(src);
      const id = 'code-' + (codeId++);
      window.T._raw[id] = src;
      return (
        '<div class="codeblock">' +
          '<div class="codeblock-header"><span>' + esc(name || lang) + '</span>' +
          '<button class="copy-btn" data-code-id="' + id + '">Copy</button></div>' +
          '<pre><code id="' + id + '">' + window.Highlighter.highlight(src, lang) + '</code></pre>' +
        '</div>'
      );
    },
    callout(kind, title, html) {
      return '<div class="callout ' + kind + '"><div class="callout-title">' + esc(title) + '</div>' + html + '</div>';
    },
    diagram(text) {
      return '<div class="diagram">' + esc(trim(text)) + '</div>';
    },
    /* "pattern card": the prompt → think mapping, rendered as a chip row */
    patternRow(prompt, think) {
      return '<tr><td>' + prompt + '</td><td><span class="pattern-chip">' + think + '</span></td></tr>';
    }
  };

  window.MODULES = [];
})();
