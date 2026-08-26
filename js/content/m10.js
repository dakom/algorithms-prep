/* Module 10 — Cheat sheets, final drill, completion criteria */
(function () {
  const { code, callout, diagram, widget } = window.T;
  const PATTERNS = ['Set', 'Map / aggregate', 'Graph + DFS/BFS', 'BFS (shortest)', 'Cycle detection', 'Tree traversal', 'Sort + scan', 'Heap / top-K', 'Stateful model', 'Binary search', 'Sliding window', 'Dijkstra'];

  window.MODULES.push({
    title: 'Cheat Sheets & Final Self-Test',
    blurb: 'Day-of reference, a timed pattern drill, and the completion checklist',
    minutes: 10,
    sections: [

      /* ------------------------------------------------ 10.1 ------ */
      {
        type: 'read',
        title: 'Cheat sheets',
        minutes: 5,
        html: `
<h2>Pattern recognition</h2>
<table>
<tr><th>Prompt contains…</th><th>Think…</th></tr>
${window.T.patternRow('“Have we seen this?”', 'Set')}
${window.T.patternRow('“Find by ID”', 'Map')}
${window.T.patternRow('“Count / group by…”', 'Map')}
${window.T.patternRow('“Connected to…”', 'Graph')}
${window.T.patternRow('“Can A reach B?”', 'DFS/BFS + visited')}
${window.T.patternRow('“Shortest number of steps”', 'BFS')}
${window.T.patternRow('“Dependencies / circular”', 'Graph cycle detection')}
${window.T.patternRow('“Hierarchy”', 'Tree')}
${window.T.patternRow('“Overlapping time ranges”', 'Sort + intervals')}
${window.T.patternRow('“Top K” / “repeated min/max”', 'Heap')}
${window.T.patternRow('“Sorted input”', 'Binary search / two pointers')}
${window.T.patternRow('“Contiguous subarray / window”', 'Sliding window')}
${window.T.patternRow('“Changing requirements + methods”', 'Stateful data model')}
</table>

<h2>Complexity</h2>
<table>
<tr><th>Pattern</th><th>Typical</th><th>Say it as</th></tr>
<tr><td>One pass</td><td>O(n)</td><td>“linear in the number of transactions”</td></tr>
<tr><td>Hash map lookup</td><td>O(1) average</td><td>“constant per lookup”</td></tr>
<tr><td>Sorting</td><td>O(n log n)</td><td>“the sort dominates”</td></tr>
<tr><td>DFS / BFS</td><td>O(V + E)</td><td>“accounts plus transfers, each once”</td></tr>
<tr><td>Binary search</td><td>O(log n)</td><td>“halving each step”</td></tr>
<tr><td>Heap insert / remove</td><td>O(log n)</td><td>—</td></tr>
<tr><td>Top K with heap</td><td>O(n log k)</td><td>“log of k, not n”</td></tr>
<tr><td>Nested scan</td><td>O(n²)</td><td>“this is the one I’m avoiding”</td></tr>
</table>

<h2>Common mistakes — the ones interviewers watch for</h2>
<div class="two-col">
<div class="card"><h4>Graphs</h4><ul><li>forgetting <code>visited</code> → infinite loop on cycles</li><li>DFS when the shortest unweighted path is required</li><li>marking BFS visited on dequeue instead of enqueue</li><li>directed vs undirected confusion</li><li>destination-only nodes missing from the adjacency list</li><li>no parent map when the actual path is required</li></ul></div>
<div class="card"><h4>Hash maps</h4><ul><li><code>map.get(k) + x</code> on a missing key → NaN</li><li>overwriting instead of accumulating</li><li><code>if (map.get(k))</code> vs <code>map.has(k)</code> for falsy values</li><li>nested loops where an index would do</li></ul></div>
<div class="card"><h4>Trees</h4><ul><li>missing the null base case</li><li>recursion depth on degenerate trees</li><li>nodes vs edges when talking about depth</li></ul></div>
<div class="card"><h4>Intervals</h4><ul><li>forgetting to sort (or sorting lexicographically)</li><li>wrong overlap condition (≤ vs &lt;)</li><li>losing the last interval</li><li>mutating the caller’s array</li></ul></div>
<div class="card"><h4>Stateful systems</h4><ul><li>partially applying a failed operation</li><li>undefined error behavior</li><li>duplicate side effects (no idempotency)</li><li>breaking old methods while adding new ones</li><li>never naming the invariants</li></ul></div>
<div class="card"><h4>Process</h4><ul><li>coding before restating</li><li>complexity without naming the entities</li><li>“done” without three tests</li><li>rewriting instead of adapting on follow-ups</li></ul></div>
</div>

<h2>The decision framework</h2>
${diagram(`
1. What are the entities?
2. What relationships exist?
3. What exactly must I return?

Seen before?             -> Set
Lookup/group/count?      -> Map
Reachability?            -> DFS/BFS
Shortest unweighted?     -> BFS
Weighted shortest path?  -> Dijkstra
Hierarchy?               -> Tree traversal
Overlap/ranges?          -> Sort + scan
Top K?                   -> Heap
Changing system state?   -> Maps + invariants + clean API

Explain -> Implement -> Test -> Complexity -> Follow-up`)}
`
      },

      /* ------------------------------------------------ 10.2 ------ */
      {
        type: 'drill',
        title: 'Final drill: name the pattern in 20 seconds',
        minutes: 5,
        html: `
<p>The verbal self-test. No code, no thinking about syntax — just the reflex. Do it once now and again the morning of the assessment.</p>

${widget('drill', {
  label: 'Pattern recognition drill',
  q: 'Read the prompt, click the approach you would reach for first.',
  seconds: 20,
  choices: PATTERNS,
  items: [
    { prompt: 'Determine whether any transaction ID appears twice.', answer: 'Set', explain: 'Membership: “seen before?”' },
    { prompt: 'Compute the total transfer amount for every user.', answer: 'Map / aggregate', explain: 'Group/aggregate by key.' },
    { prompt: 'Determine whether account A can eventually transfer to account B through intermediaries.', answer: 'Graph + DFS/BFS', explain: 'Reachability.' },
    { prompt: 'Find the fewest transfer hops between two accounts.', answer: 'BFS (shortest)', explain: 'Shortest in an unweighted graph.' },
    { prompt: 'Detect circular service dependencies.', answer: 'Cycle detection', explain: 'Directed cycle — three-color DFS.' },
    { prompt: 'Combine overlapping maintenance windows.', answer: 'Sort + scan', explain: 'Sort by start, merge.' },
    { prompt: 'Return the 10 users with the highest transaction volume.', answer: 'Heap / top-K', explain: 'Aggregate with a Map, then heap or sort.' },
    { prompt: 'Traverse an organization’s management hierarchy.', answer: 'Tree traversal', explain: 'Hierarchy → tree; DFS or level-order.' },
    { prompt: 'Implement deposits, withdrawals and transfers, then add transaction history.', answer: 'Stateful model', explain: 'Maps + invariants + clean API.' },
    { prompt: 'Given hourly prices sorted by time, find the first hour the price was at least $100.', answer: 'Binary search', explain: 'Sorted + “first index where…”.' },
    { prompt: 'Find the busiest 5-minute stretch in a per-minute request log.', answer: 'Sliding window', explain: 'Fixed-size contiguous window.' },
    { prompt: 'Find the cheapest route between two exchanges when each hop has a fee.', answer: 'Dijkstra', explain: 'Weighted shortest path, non-negative weights.' },
    { prompt: 'Which orders reference a product ID that doesn’t exist in the catalog?', answer: 'Set', explain: 'Index the catalog IDs, scan the orders.' },
    { prompt: 'Can a person attend all of their meetings?', answer: 'Sort + scan', explain: 'Sort by start, compare neighbors.' },
    { prompt: 'Is this maze exit reachable from the entrance?', answer: 'Graph + DFS/BFS', explain: 'Grid cells are nodes.' },
    { prompt: 'Group support tickets by customer.', answer: 'Map / aggregate', explain: 'Map<customer, ticket[]>.' },
    { prompt: 'Print an org chart one management layer at a time.', answer: 'Tree traversal', explain: 'Level order = BFS on a tree.' },
    { prompt: 'Keep the 100 largest trades seen so far as trades stream in.', answer: 'Heap / top-K', explain: 'Min-heap capped at 100.' }
  ]
})}
`
      },

      /* ------------------------------------------------ 10.3 ------ */
      {
        type: 'drill',
        title: 'Complexity drill: read the code, name the Big-O',
        minutes: 5,
        html: `
<p>“Estimate complexity” is a rubric line in every exercise. This drill trains it directly: a short snippet, 20 seconds, name the time complexity. Assume <code>n</code> is the input size, <code>k</code> a small parameter, and Map/Set operations are O(1).</p>

${widget('drill', {
  label: 'Complexity drill',
  q: 'What is the time complexity?',
  seconds: 20,
  choices: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n²)', 'O(V + E)', 'O(n log k)'],
  items: [
    { prompt: '<pre class="drill-code">const seen = new Set();\nfor (const id of ids) {\n  if (seen.has(id)) return true;\n  seen.add(id);\n}\nreturn false;</pre>', answer: 'O(n)', explain: 'One pass, O(1) per element.' },
    { prompt: '<pre class="drill-code">for (let i = 0; i < a.length; i++)\n  for (let j = i + 1; j < a.length; j++)\n    if (a[i] + a[j] === target) return [i, j];</pre>', answer: 'O(n²)', explain: 'Every pair.' },
    { prompt: '<pre class="drill-code">const sorted = [...intervals].sort((x, y) => x[0] - y[0]);\nfor (let i = 1; i < sorted.length; i++)\n  if (sorted[i][0] < sorted[i - 1][1]) return true;</pre>', answer: 'O(n log n)', explain: 'The sort dominates the linear scan.' },
    { prompt: '<pre class="drill-code">while (queue.length) {\n  const node = queue.shift();\n  for (const next of adj.get(node) ?? [])\n    if (!visited.has(next)) { visited.add(next); queue.push(next); }\n}</pre>', answer: 'O(V + E)', explain: 'Each node dequeued once, each edge scanned once (ignoring shift’s cost).' },
    { prompt: '<pre class="drill-code">let lo = 0, hi = a.length;\nwhile (lo < hi) {\n  const mid = (lo + hi) >> 1;\n  if (a[mid] >= t) hi = mid; else lo = mid + 1;\n}</pre>', answer: 'O(log n)', explain: 'Halves the range each step.' },
    { prompt: '<pre class="drill-code">for (const [acct, total] of totals) {\n  heap.push([acct, total]);\n  if (heap.size > k) heap.pop();\n}</pre>', answer: 'O(n log k)', explain: 'n pushes/pops on a heap that never exceeds k.' },
    { prompt: '<pre class="drill-code">return balances.get(accountId) ?? 0;</pre>', answer: 'O(1)', explain: 'A single hash lookup.' },
    { prompt: '<pre class="drill-code">for (const tx of transactions) {\n  if (frozen.includes(tx.account)) flagged.push(tx);\n}</pre>', answer: 'O(n²)', explain: '<code>includes</code> is a linear scan inside a linear loop — O(n·m), quadratic in the worst case. Index <code>frozen</code> in a Set first.' },
    { prompt: '<pre class="drill-code">function depth(node) {\n  if (!node) return 0;\n  return 1 + Math.max(depth(node.left), depth(node.right));\n}</pre>', answer: 'O(n)', explain: 'Every node visited once.' },
    { prompt: '<pre class="drill-code">let sum = 0;\nfor (let i = 0; i < k; i++) sum += v[i];\nfor (let i = k; i < v.length; i++) sum += v[i] - v[i - k];</pre>', answer: 'O(n)', explain: 'Sliding window: each element enters and leaves once.' },
    { prompt: '<pre class="drill-code">const result = [];\nfor (const x of items) {\n  result.push(x);\n  result.sort((a, b) => a - b);\n}</pre>', answer: 'O(n²)', explain: 'Sorting inside the loop: n sorts of up to n elements is O(n² log n) — the closest listed answer, and clearly worse than sorting once at the end.' },
    { prompt: '<pre class="drill-code">for (const [from, to] of edges) {\n  if (!adj.has(from)) adj.set(from, []);\n  adj.get(from).push(to);\n}</pre>', answer: 'O(V + E)', explain: 'Building the adjacency list touches each edge once (and creates up to V keys).' },
    { prompt: '<pre class="drill-code">const totals = new Map();\nfor (const t of txs) totals.set(t.acct, (totals.get(t.acct) ?? 0) + t.amount);\nreturn [...totals].sort((a, b) => b[1] - a[1]).slice(0, k);</pre>', answer: 'O(n log n)', explain: 'O(n) aggregation plus an O(m log m) sort of the merchant totals; with m ≤ n that is O(n log n) — the heap version would be O(n log k).' },
    { prompt: '<pre class="drill-code">const state = new Map();\nfunction dfs(u) {\n  state.set(u, 1);\n  for (const v of adj.get(u) ?? []) {\n    if (state.get(v) === 1) return true;\n    if (!state.has(v) && dfs(v)) return true;\n  }\n  state.set(u, 2); return false;\n}</pre>', answer: 'O(V + E)', explain: 'Three-color DFS: each node enters and finishes once, each edge examined once.' }
  ]
})}
`
      },

      /* ------------------------------------------------ 10.4 ------ */
      {
        type: 'project',
        title: 'Completion criteria',
        minutes: 3,
        checklist: [
          'When should I use a <code>Map</code> vs a <code>Set</code>?',
          'How do I recognize a graph problem when the word “graph” isn’t used?',
          'When do I use BFS instead of DFS?',
          'Why does BFS find shortest paths in unweighted graphs?',
          'Why is <code>visited</code> necessary — and when is it marked?',
          'How do I reconstruct a graph path?',
          'How do I detect a directed cycle (and why isn’t “visited” enough)?',
          'How are trees related to graph traversal?',
          'When does “sort then scan” solve an interval problem — and which overlap convention am I using?',
          'When should I think about a heap, and which heap for top-K?',
          'How do I evolve a stateful implementation when requirements change?',
          'How do I explain time and space complexity in the problem’s own entities?',
          'What three tests do I name before saying “done”?'
        ],
        html: `
<p>Tick each one only if you can answer it <em>out loud, in two sentences, right now</em>. Anything unticked has a module number next to it in your head — go back to it.</p>
<div class="big-quote">Explain → Implement → Test → Complexity → Follow-up.</div>
<p>That sequence is the whole course. If you do nothing else in the assessment, do that.</p>
`
      }
    ]
  });
})();
