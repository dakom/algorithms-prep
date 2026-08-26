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
