/* Module 5 — Heaps / Top-K */
(function () {
  const { code, callout, diagram, widget } = window.T;

  const HEAP = `
// Provided: a binary min-heap. The smallest element (per compare) is at the top.
class MinHeap {
  constructor(compare = (a, b) => a - b) { this.a = []; this.cmp = compare; }
  get size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a; a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.cmp(a[i], a[p]) >= 0) break;
      [a[i], a[p]] = [a[p], a[i]]; i = p;
    }
  }
  pop() {
    const a = this.a;
    if (a.length === 0) return undefined;
    const top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.cmp(a[l], a[m]) < 0) m = l;
        if (r < a.length && this.cmp(a[r], a[m]) < 0) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]]; i = m;
      }
    }
    return top;
  }
}`;

  window.MODULES.push({
    title: 'Heaps & Top-K',
    blurb: 'Just enough priority-queue recognition: top K, repeated min/max, streaming ranking',
    minutes: 15,
    sections: [

      /* ------------------------------------------------ 5.0 ------ */
      {
        type: 'read',
        title: 'Recognize the heap (you won’t implement one)',
        minutes: 10,
        html: `
<div class="big-quote">Think heap when you see: top K · smallest/largest K · repeatedly extract the min/max · ranking from a stream.</div>

<p>A heap (priority queue) gives you <strong>peek min/max in O(1)</strong> and <strong>insert / remove-top in O(log n)</strong>. That's the whole contract. You are not expected to implement one live — say “I'll assume a standard priority queue” and use it (JavaScript has none built in; an interviewer will accept a stub or a sorted-array fallback).</p>

<table>
<tr><th>Approach</th><th>Time</th><th>When to say it</th></tr>
<tr><td>Sort everything, take K</td><td>O(m log m)</td><td>First answer. Simple, correct, fine for one-shot inputs.</td></tr>
<tr><td>Min-heap of size K</td><td>O(m log k)</td><td>K ≪ m, or the input is a stream you can’t hold/sort.</td></tr>
<tr><td>Quickselect</td><td>O(m) average</td><td>Only mention it; rarely worth coding live.</td></tr>
</table>

${callout('key', 'The size-K min-heap trick (why MIN for the LARGEST K)', `<p>Keep a min-heap of the K best so far. The top is the <em>weakest</em> of your current top K. For each new item: push it; if size exceeds K, pop the top (drop the weakest). At the end the heap holds exactly the K largest. Each step is O(log k), so O(m log k) total. Students reach for a max-heap here; the min-heap is the trick, and explaining <em>why</em> is the credit.</p>`)}

${diagram(`
top 2 by total:  C=200  A=120  B=120?  (say totals: A=120, B=120, C=200)
stream A(120): heap {120}
stream B(120): heap {120,120}
stream C(200): heap {120,120,200} → size 3 > 2 → pop min → {120,200}
result: C, then A/B (a tie — any order, or break ties by name if asked)`)}

${widget('mcq', {
  label: 'Recognition',
  q: '“Show the 10 most recent alerts, and keep updating as new alerts arrive.” Which fits?',
  choices: ['Sort all alerts every time a new one arrives', 'A heap keyed by timestamp — or, since only the newest 10 matter and alerts arrive in time order, a simple queue/ring buffer', 'A Set of alerts', 'DFS over alerts'],
  answer: 1,
  explain: '<p>“Most recent” with in-order arrival is just the last 10 — a heap is overkill. The interviewer wants to see you notice that before reaching for the fancy structure. If alerts arrived <em>out</em> of order, the heap of size 10 keyed by timestamp is the answer.</p>'
})}

${widget('exercise', {
  id: 'ex-5-1',
  title: 'topKAccounts(transactions, k)',
  time: 8,
  fn: 'topKAccounts',
  prelude: HEAP,
  prompt: `<p>Transactions are <code>[account, amount]</code> pairs. Return the <code>k</code> account IDs with the highest <em>total</em> volume, highest first. If fewer than <code>k</code> accounts exist, return them all. Accounts with equal totals may appear in any order relative to each other.</p>
${code('js', 'example', `topKAccounts([["A", 50], ["B", 20], ["A", 70], ["C", 200], ["B", 100]], 2)
// ["C", "A"]  or  ["C", "B"]     totals: A = 120, B = 120, C = 200`)}
<p>Notice the tie: A = 50 + 70 = 120 and B = 20 + 100 = 120, so both answers are accepted. Spotting that tie in the prompt and asking “how should I break ties?” is exactly the kind of thing that earns credit.</p>
<p>A <code>MinHeap</code> class is provided (see “Provided code” above the editor) — use it, or start with sorting.</p>`,
  reasoning: [
    { cat: 'abstraction', q: 'This problem is two patterns glued together. Which two?', choices: ['Graph + BFS', 'Aggregate by key (Map), then select top K (heap or sort)', 'Sort + scan intervals', 'Set + binary search'], answer: 1,
      explain: '<p>Step 1 is Module 1’s totals map. Step 2 is the ranking. Naming the two layers separately is the “senior” answer.</p>' },
    { cat: 'algorithm', q: 'Which heap keeps the K largest totals while streaming through m accounts?', choices: ['A max-heap of all m accounts, pop K times', 'A min-heap capped at size K — pop the smallest whenever size exceeds K', 'A Set', 'A sorted array rebuilt on every insert'], answer: 1,
      explain: '<p>The max-heap version works but costs O(m) space and O(m + k log m). The capped min-heap is O(k) space and O(m log k). Both are acceptable; know the difference.</p>' },
    { cat: 'complexity', q: 'With n transactions and m distinct accounts, complexity of map + capped min-heap?', choices: ['O(n + m log k)', 'O(n log n)', 'O(m²)', 'O(n · k)'], answer: 0,
      explain: '<p>O(n) to aggregate, O(log k) per account to maintain the heap. The sort alternative is O(n + m log m) — say both and “sort is simpler; the heap wins when k ≪ m or for a stream”.</p>' },
    { type: 'text', cat: 'explanation', q: 'Explain the approach, starting with the simplest correct one.', min: 50,
      model: '<p>“First aggregate totals per account in a Map — O(n). The simplest correct answer then sorts the entries by total descending and takes the first k: O(m log m). If k is small relative to m, or the totals arrive as a stream, I’d keep a min-heap of size k instead — O(m log k) — popping the smallest whenever the heap exceeds k. Ties: I’d ask how to break them.”</p>' }
  ],
  starter: `
function topKAccounts(transactions, k) {
  // 1. totals per account (Map)
  // 2. top k: sort, or MinHeap of size k
}`,
  harness: () => ({
    totals(transactions) {
      const t = new Map();
      for (const [a, amt] of transactions) t.set(a, (t.get(a) ?? 0) + amt);
      return t;
    }
  }),
  check: (out, args, H) => {
    const [transactions, k] = args;
    const totals = H.totals(transactions);
    const want = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, Math.max(0, k));
    const expected = want.map(([a, t]) => a + '(' + t + ')').join(', ');
    if (!Array.isArray(out)) return { ok: false, expected: '[' + expected + ']' };
    if (out.length !== want.length) return { ok: false, expected: want.length + ' account(s): [' + expected + ']' };
    if (new Set(out).size !== out.length) return { ok: false, expected: 'distinct accounts: [' + expected + ']' };
    for (let i = 0; i < out.length; i++) {
      if (!totals.has(out[i])) return { ok: false, expected: '[' + expected + '] — ' + out[i] + ' is not an account' };
      if (totals.get(out[i]) !== want[i][1]) return { ok: false, expected: '[' + expected + '] (totals in descending order)' };
    }
    return { ok: true, expected: '[' + expected + ']' };
  },
  tests: [
    { name: 'example (tie between A and B is fine)', args: [[['A', 50], ['B', 20], ['A', 70], ['C', 200], ['B', 100]], 2] },
    { name: 'clear ranking', args: [[['A', 10], ['B', 30], ['C', 20], ['A', 5]], 3] },
    { name: 'k larger than number of accounts', args: [[['A', 1], ['B', 2]], 5] },
    { name: 'k = 0', args: [[['A', 1]], 0] },
    { name: 'k = 1 picks the max total, not the max single transaction', args: [[['A', 60], ['B', 40], ['B', 40]], 1] },
    { name: 'empty transactions', args: [[], 3] },
    { name: 'negative amounts reduce totals', args: [[['A', 100], ['A', -90], ['B', 20]], 1] },
    { name: 'many accounts, small k', args: [Array.from({ length: 500 }, (_, i) => ['acct' + i, (i * 7919) % 1000]), 5] },
    { name: 'single account', args: [[['Z', 9]], 2] }
  ],
  antiSolutions: [
    { name: 'ascending order', code: 'function topKAccounts(t, k) { const m = new Map(); for (const [a, x] of t) m.set(a, (m.get(a) ?? 0) + x); return [...m].sort((a, b) => a[1] - b[1]).slice(0, k).map(e => e[0]); }' },
    { name: 'ranks single transactions, no aggregation', code: 'function topKAccounts(t, k) { const s = [...t].sort((a, b) => b[1] - a[1]); const out = []; for (const [a] of s) { if (!out.includes(a)) out.push(a); if (out.length === k) break; } return out; }' }
  ],
  hints: [
    '<p>Start with the Map of totals — exactly Exercise 1.2.</p>',
    '<p>Simplest: <code>[...totals].sort((a, b) => b[1] - a[1]).slice(0, k).map(([acct]) => acct)</code>.</p>',
    '<p>Heap version: <code>const h = new MinHeap((a, b) => a[1] - b[1])</code>; push each <code>[acct, total]</code>; if <code>h.size &gt; k</code> pop. Then pop everything and reverse.</p>'
  ],
  solution: `
function topKAccounts(transactions, k) {
  const totals = new Map();
  for (const [account, amount] of transactions) {
    totals.set(account, (totals.get(account) ?? 0) + amount);
  }
  // min-heap of size k: the top is the weakest of the current best k
  const heap = new MinHeap((a, b) => a[1] - b[1]);
  for (const entry of totals) {
    heap.push(entry);
    if (heap.size > k) heap.pop();
  }
  const result = [];
  while (heap.size) result.push(heap.pop()[0]);   // ascending → reverse
  return result.reverse();
}`,
  solutionExplain: '<p>The sort version is equally correct: <code>return [...totals].sort((a, b) => b[1] - a[1]).slice(0, k).map(([a]) => a)</code>. Interview lesson: <strong>start with the simplest correct solution, then optimize if asked</strong>. Note <code>k = 0</code>: the heap pops everything, the sort slices nothing — both return <code>[]</code> without a special case.</p>',
  complexity: '<p>“O(n) to aggregate n transactions, then O(m log k) to rank m distinct accounts with a size-k heap — O(k) extra space for the heap. Sorting instead is O(m log m).”</p>',
  followUp: {
    q: 'Follow-up: “Transactions now arrive continuously; report the top K on demand.” Which part of your design changes?',
    choices: ['Everything — rebuild from scratch', 'Keep the totals Map updated per transaction; answering a query is the ranking step over m accounts (sort or heap). If queries are frequent and m is large, maintain a sorted structure incrementally', 'Use DFS', 'Only the sort comparator'], answer: 1,
    explain: '<p>The aggregation layer becomes long-lived state (Module 6 territory); the ranking layer runs per query. Separating the layers is what makes the change cheap.</p>'
  }
})}
`
      },

      /* ------------------------------------------------ 5.1 ------ */
      {
        type: 'quiz',
        title: 'Quiz: heaps',
        questions: [
          { q: 'To keep the K largest values from a stream, which heap and why?', choices: ['Max-heap, pop K times at the end', 'Min-heap capped at K — its top is the weakest survivor, so pop it whenever size exceeds K', 'Two heaps', 'A Set'], answer: 1,
            explain: '<p>O(log k) per element, O(k) space.</p>' },
          { q: 'Cost of heap insert and remove-top for n elements?', choices: ['O(1)', 'O(log n) each; peek is O(1)', 'O(n)', 'O(n log n)'], answer: 1,
            explain: '<p>The contract to state before using one.</p>' },
          { q: 'When is plain sorting the right first answer for top K?', choices: ['Never', 'Almost always — it’s simple and O(m log m); switch to a heap when K ≪ m or the input is a stream', 'Only when K = 1', 'Only for strings'], answer: 1,
            explain: '<p>Simplest correct solution first.</p>' },
          { q: '“Minimum number of meeting rooms” — why a heap?', choices: ['To sort meetings', 'To repeatedly find which ongoing meeting ends soonest — repeated extract-min', 'To count meetings', 'Because intervals are numbers'], answer: 1,
            explain: '<p>“Repeatedly extract the min” is a heap trigger.</p>' }
        ]
      }
    ]
  });
})();
