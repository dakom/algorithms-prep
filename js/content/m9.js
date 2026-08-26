/* Module 9 — Optional bonus topics */
(function () {
  const { code, callout, diagram, widget } = window.T;

  window.MODULES.push({
    title: 'Bonus: Dijkstra, Windows, Binary Search',
    blurb: 'Only if you finished early — recognition first, one exercise each',
    minutes: 25,
    optional: true,
    sections: [

      /* ------------------------------------------------ 9.1 ------ */
      {
        type: 'read',
        title: 'Dijkstra — recognition only',
        minutes: 5,
        html: `
<div class="big-quote">Shortest path + non-negative edge weights → Dijkstra. Shortest path + unweighted → BFS.</div>
<p>That single sentence is 90% of the interview value. BFS counts hops; the moment each edge has a <em>cost</em> (fee, latency, distance) and you want the cheapest route, hop-count is the wrong metric and Dijkstra is the tool.</p>

${diagram(`
dist = Map, all Infinity except dist[source] = 0
heap = min-heap of [distance, node], starting with [0, source]
while heap not empty:
    [d, u] = heap.pop()
    if d > dist[u]: continue                 ← stale entry, skip
    for (v, w) of neighbors(u):
        if dist[u] + w < dist[v]:
            dist[v] = dist[u] + w
            parent[v] = u
            heap.push([dist[v], v])
O((V + E) log V) with a binary heap`)}

<p>It's BFS with the queue replaced by a min-heap keyed on distance so far, and “visited” replaced by “is this a better distance than what I have?”. Negative weights break the greedy argument (use Bellman-Ford); you will not be asked to implement that.</p>

${widget('mcq', {
  label: 'Recognition',
  q: '“Each transfer has a fee. Find the route from A to B with the lowest total fee.” Which?',
  choices: ['BFS — fewest transfers', 'Dijkstra — weighted shortest path with non-negative weights (fees)', 'DFS — any route', 'Sort transfers by fee and take the cheapest'],
  answer: 1,
  explain: '<p>Fewest hops ≠ lowest cost: one expensive direct transfer can lose to three cheap ones. “Lowest total …” with non-negative costs → Dijkstra.</p>'
})}

${widget('order', {
  label: 'Dijkstra’s loop in order',
  q: 'Arrange one iteration:',
  items: [
    'Pop the [distance, node] pair with the smallest distance from the min-heap',
    'If that distance is larger than the best known distance for the node, skip it (stale entry)',
    'For each neighbor, compute candidate = dist[node] + edge weight',
    'If candidate is better than dist[neighbor], update it, record the parent, and push [candidate, neighbor]'
  ],
  explain: '<p>The “stale entry” check is what lets you use a plain heap without a decrease-key operation. Mentioning it is the tell that you have actually implemented Dijkstra.</p>'
})}
`
      },

      /* ------------------------------------------------ 9.2 ------ */
      {
        type: 'read',
        title: 'Sliding window',
        minutes: 8,
        html: `
<div class="big-quote">“Contiguous subarray / substring / window of size k” → keep a window and slide it; add the entering element, remove the leaving one.</div>

<p>Recognition over memorization: the brute force recomputes each window from scratch (O(n·k)); the sliding window maintains a running state so each step is O(1) → O(n). Two flavours: <strong>fixed size</strong> (window of exactly k) and <strong>variable size</strong> (grow the right edge, shrink the left while a condition is violated — e.g. “longest substring with no repeated characters”, which uses a Set/Map of what is in the window).</p>

${widget('exercise', {
  id: 'ex-9-1',
  title: 'maxTransactionsInWindow(values, k)',
  time: 6,
  fn: 'maxTransactionsInWindow',
  prompt: `<p><code>values[i]</code> is the number of transactions in minute <code>i</code>. Return the maximum total over any <code>k</code> consecutive minutes. If <code>k</code> is 0 or larger than the array, return <code>0</code>.</p>
${code('js', 'example', `maxTransactionsInWindow([2, 1, 5, 1, 3, 2], 3)   // 9   (5 + 1 + 3)`)}`,
  reasoning: [
    { cat: 'abstraction', q: 'Which pattern?', choices: ['Sort + scan', 'Fixed-size sliding window: running sum, add the new element, subtract the one leaving', 'Heap of size k', 'Prefix sums with binary search'], answer: 1,
      explain: '<p>“k consecutive” is the trigger. Prefix sums also give O(n) — a fine alternative to mention.</p>' },
    { cat: 'complexity', q: 'Complexity of the window versus the naive approach?', choices: ['O(n) vs O(n · k)', 'O(n log n) vs O(n²)', 'Both O(n)', 'O(k) vs O(n)'], answer: 0,
      explain: '<p>Each element enters the window once and leaves once.</p>' },
    { type: 'text', cat: 'explanation', q: 'Explain the slide in one or two sentences.', min: 25,
      model: '<p>“I sum the first k values, then for each next index add the entering value and subtract the one that left k positions back, tracking the maximum. O(n) time, O(1) space.”</p>' }
  ],
  ownTests: true,
  ownTemplate: `
[
  { name: 'k = 2', args: [[1, 3, 2], 2], expect: 5 },
  // add at least two more — k equal to the length, k too large, best window at the end…
]`,
  coverage: [
    { label: 'k > length or k = 0', hit: args => Array.isArray(args[0]) && (args[1] === 0 || args[1] > args[0].length) },
    { label: 'best window at the very end', hit: args => { const [v, k] = args; if (!Array.isArray(v) || !(k > 0) || k > v.length) return false; let best = -Infinity, bi = 0, s = 0; for (let i = 0; i < v.length; i++) { s += v[i]; if (i >= k) s -= v[i - k]; if (i >= k - 1 && s > best) { best = s; bi = i; } } return bi === v.length - 1 && v.length > k; } },
    { label: 'k equals the length', hit: args => Array.isArray(args[0]) && args[0].length > 0 && args[1] === args[0].length },
    { label: 'negative values', hit: args => Array.isArray(args[0]) && args[0].some(x => x < 0) }
  ],
  starter: `
function maxTransactionsInWindow(values, k) {
  // sum the first k, then slide
}`,
  tests: [
    { name: 'example', args: [[2, 1, 5, 1, 3, 2], 3], expect: 9 },
    { name: 'k equals length', args: [[1, 2, 3], 3], expect: 6 },
    { name: 'k = 1 → max element', args: [[4, 9, 2], 1], expect: 9 },
    { name: 'k larger than array → 0', args: [[1, 2], 5], expect: 0 },
    { name: 'k = 0 → 0', args: [[1, 2], 0], expect: 0 },
    { name: 'empty array', args: [[], 2], expect: 0 },
    { name: 'best window at the very end', args: [[1, 1, 1, 1, 9, 9], 2], expect: 18 },
    { name: 'best window at the very start', args: [[9, 9, 1, 1, 1], 2], expect: 18 },
    { name: 'all zeros', args: [[0, 0, 0], 2], expect: 0 },
    { name: 'negative values (refunds)', args: [[5, -2, 3, -1], 2], expect: 3 },
    { name: 'long input (10,000)', args: [Array.from({ length: 10000 }, (_, i) => i % 7), 7], expect: 21 }
  ],
  antiSolutions: [
    { name: 'off by one on the slide (misses the last window)', code: 'function maxTransactionsInWindow(v, k) { if (k <= 0 || k > v.length) return 0; let s = 0; for (let i = 0; i < k; i++) s += v[i]; let best = s; for (let i = k; i < v.length - 1; i++) { s += v[i] - v[i - k]; best = Math.max(best, s); } return best; }' }
  ],
  hints: [
    '<p>Guard the degenerate cases first. Sum the first k elements → <code>best</code>.</p>',
    '<p>For <code>i</code> from <code>k</code> to the end: <code>sum += values[i] - values[i - k]</code>, then update <code>best</code>.</p>'
  ],
  solution: `
function maxTransactionsInWindow(values, k) {
  if (k <= 0 || k > values.length) return 0;
  let sum = 0;
  for (let i = 0; i < k; i++) sum += values[i];
  let best = sum;
  for (let i = k; i < values.length; i++) {
    sum += values[i] - values[i - k];       // slide: add entering, drop leaving
    best = Math.max(best, sum);
  }
  return best;
}`,
  complexity: '<p>“O(n) time, O(1) extra space.”</p>',
  followUp: {
    q: 'Follow-up: “Longest substring with no repeated characters.” Same family?',
    choices: ['No — that needs a graph', 'Yes — a variable-size window: extend the right edge, and while the new character is already in the window (a Set/Map of positions), shrink from the left; track the max width', 'No — sort the characters', 'Yes — fixed window of size 26'],
    answer: 1,
    explain: '<p>Variable window + a Map of last-seen index is the O(n) answer. The invariant “the window contains no duplicates” is what you maintain.</p>'
  }
})}
`
      },

      /* ------------------------------------------------ 9.3 ------ */
      {
        type: 'read',
        title: 'Binary search — first index where…',
        minutes: 8,
        html: `
<div class="big-quote">Sorted input + “find / first / last / smallest x such that…” → binary search. O(log n).</div>

<p>The classic lookup is easy; the version that shows up in practice is the <strong>boundary</strong> form — “first index whose value is ≥ target” (lower bound). It handles duplicates, insertion points, “first timestamp after T”, and “smallest capacity that works”. One template, memorized:</p>

${diagram(`
lo = 0, hi = n            // answer is in [lo, hi]; hi = n means "none"
while lo < hi:
    mid = (lo + hi) >> 1
    if a[mid] >= target: hi = mid       // mid could be the answer; keep it
    else:                lo = mid + 1   // mid is too small; exclude it
return lo`)}

${widget('exercise', {
  id: 'ex-9-2',
  title: 'lowerBound(sorted, target)',
  time: 6,
  fn: 'lowerBound',
  prompt: `<p>Given an ascending-sorted array of numbers (duplicates allowed), return the index of the <em>first</em> element ≥ <code>target</code>, or <code>sorted.length</code> if every element is smaller. Must be O(log n).</p>
${code('js', 'example', `lowerBound([1, 3, 3, 5, 8], 3)    // 1
lowerBound([1, 3, 3, 5, 8], 4)    // 3   (insertion point)
lowerBound([1, 3, 3, 5, 8], 9)    // 5   (none)`)}`,
  reasoning: [
    { cat: 'algorithm', q: 'When <code>a[mid] &gt;= target</code>, what do you do with <code>mid</code>?', choices: ['Exclude it: <code>hi = mid - 1</code>', 'Keep it as a candidate: <code>hi = mid</code> — the answer could be mid or something to its left', 'Return mid', 'Set <code>lo = mid</code>'], answer: 1,
      explain: '<p>The boundary form keeps the candidate. Excluding it is the off-by-one that returns the wrong index on duplicates.</p>' },
    { cat: 'edge', q: 'Why does the loop <code>while (lo &lt; hi)</code> with <code>lo = mid + 1</code> / <code>hi = mid</code> always terminate?', choices: ['Because mid is random', 'Each iteration strictly shrinks the range: either lo moves past mid, or hi moves down to mid (and mid &lt; hi because mid rounds down)', 'It doesn’t on empty arrays', 'Because of the return inside'], answer: 1,
      explain: '<p>Say it: “the interval strictly shrinks every iteration, and lo === hi is the answer.” That is the correctness argument.</p>' },
    { type: 'text', cat: 'explanation', q: 'State the invariant your two pointers maintain.', min: 25,
      model: '<p>“Everything left of <code>lo</code> is smaller than the target, and <code>hi</code> and everything right of it is at least the target — so the answer is always inside [lo, hi], and when they meet that index is the first element ≥ target.”</p>' }
  ],
  ownTests: true,
  ownTemplate: `
[
  { name: 'found in the middle', args: [[1, 4, 9], 4], expect: 1 },
  // add at least two more — duplicates, larger than everything, empty array…
]`,
  coverage: [
    { label: 'duplicates of the target', hit: args => Array.isArray(args[0]) && args[0].filter(x => x === args[1]).length >= 2 },
    { label: 'target larger than every element', hit: args => Array.isArray(args[0]) && args[0].length > 0 && args[0].every(x => x < args[1]) },
    { label: 'empty array', hit: args => Array.isArray(args[0]) && args[0].length === 0 },
    { label: 'target absent, insertion point inside', hit: args => Array.isArray(args[0]) && !args[0].includes(args[1]) && args[0].some(x => x < args[1]) && args[0].some(x => x > args[1]) }
  ],
  starter: `
function lowerBound(sorted, target) {
  let lo = 0, hi = sorted.length;
  // while lo < hi …
}`,
  tests: [
    { name: 'first of duplicates', args: [[1, 3, 3, 5, 8], 3], expect: 1 },
    { name: 'insertion point between values', args: [[1, 3, 3, 5, 8], 4], expect: 3 },
    { name: 'larger than all → length', args: [[1, 3, 3, 5, 8], 9], expect: 5 },
    { name: 'smaller than all → 0', args: [[1, 3, 3, 5, 8], 0], expect: 0 },
    { name: 'empty array → 0', args: [[], 7], expect: 0 },
    { name: 'single element, equal', args: [[5], 5], expect: 0 },
    { name: 'single element, greater target', args: [[5], 6], expect: 1 },
    { name: 'all duplicates', args: [[2, 2, 2, 2], 2], expect: 0 },
    { name: 'last element is the answer', args: [[1, 2, 3, 10], 10], expect: 3 },
    { name: 'large sorted array (100,000)', args: [Array.from({ length: 100000 }, (_, i) => i * 2), 77777], expect: 38889 }
  ],
  antiSolutions: [
    { name: 'excludes mid (wrong on duplicates)', code: 'function lowerBound(a, t) { let lo = 0, hi = a.length - 1; while (lo <= hi) { const m = (lo + hi) >> 1; if (a[m] === t) return m; if (a[m] < t) lo = m + 1; else hi = m - 1; } return lo; }' },
    { name: 'returns -1 when absent', code: 'function lowerBound(a, t) { let lo = 0, hi = a.length; while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] >= t) hi = m; else lo = m + 1; } return lo < a.length ? lo : -1; }' }
  ],
  hints: [
    '<p>Half-open range: <code>lo = 0, hi = length</code>. Loop while <code>lo &lt; hi</code>.</p>',
    '<p><code>if (sorted[mid] &gt;= target) hi = mid; else lo = mid + 1;</code> — return <code>lo</code>.</p>'
  ],
  solution: `
function lowerBound(sorted, target) {
  let lo = 0, hi = sorted.length;          // answer ∈ [lo, hi]
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] >= target) hi = mid;   // mid may be the answer
    else lo = mid + 1;                     // mid is too small
  }
  return lo;
}`,
  solutionExplain: '<p>“Last index with value ≤ target” is <code>lowerBound(a, target + 1) - 1</code> for integers, or the mirror template. Knowing one boundary form well beats half-remembering three.</p>',
  complexity: '<p>“O(log n) time, O(1) space.”</p>',
  followUp: {
    q: 'Follow-up: “Given hourly balances sorted by time, find the first hour the balance dropped below 0.” Binary search?',
    choices: ['Yes, always', 'Only if the predicate is monotonic (once below 0, stays below 0) — otherwise a linear scan is required', 'No, use a heap', 'No, use BFS'],
    answer: 1,
    explain: '<p>Binary search needs a monotonic predicate. Balances can go negative and recover, so the honest answer is “linear scan unless the data guarantees monotonicity”. Saying that is worth more than forcing the algorithm.</p>'
  }
})}
`
      },

      /* ------------------------------------------------ 9.4 ------ */
      {
        type: 'quiz',
        title: 'Quiz: bonus topics',
        questions: [
          { q: 'When do you switch from BFS to Dijkstra?', choices: ['When the graph is large', 'When edges have non-negative weights and you want the minimum total weight, not the fewest hops', 'When the graph is undirected', 'Never'], answer: 1,
            explain: '<p>Hops vs cost.</p>' },
          { q: 'Sliding window replaces which brute force?', choices: ['Nested loops recomputing every window: O(n·k) → O(n)', 'Sorting', 'Recursion', 'Hashing'], answer: 0,
            explain: '<p>Add the entering element, remove the leaving one.</p>' },
          { q: 'Binary search requires…', choices: ['A Map', 'Sorted input (or a monotonic predicate) so half the range can be discarded each step', 'Distinct elements', 'Numbers only'], answer: 1,
            explain: '<p>Monotonicity is the real requirement.</p>' },
          { q: 'The lower-bound template returns <code>sorted.length</code> when…', choices: ['The target is found', 'Every element is smaller than the target', 'The array is empty only', 'There are duplicates'], answer: 1,
            explain: '<p>It’s the insertion point past the end — a useful, non-error value.</p>' }
        ]
      }
    ]
  });
})();
