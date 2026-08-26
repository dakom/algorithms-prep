/* Module 2 — Graph Traversal */
(function () {
  const { code, callout, diagram, widget } = window.T;

  /* shared harness for graph exercises: edges are [from, to] pairs */
  const graphHarness = () => ({
    adj(edges) {
      const m = new Map();
      for (const [a, b] of edges) {
        if (!m.has(a)) m.set(a, []);
        if (!m.has(b)) m.set(b, []);
        m.get(a).push(b);
      }
      return m;
    },
    bfsDist(edges, src) {
      const adj = this.adj(edges), dist = new Map([[src, 0]]), q = [src];
      while (q.length) {
        const u = q.shift();
        for (const v of adj.get(u) || []) if (!dist.has(v)) { dist.set(v, dist.get(u) + 1); q.push(v); }
      }
      return dist;
    },
    isPath(edges, path) {
      const adj = this.adj(edges);
      for (let i = 0; i + 1 < path.length; i++) if (!(adj.get(path[i]) || []).includes(path[i + 1])) return false;
      return true;
    }
  });

  window.MODULES.push({
    title: 'Graph Traversal',
    blurb: 'The most important module: see the graph, pick DFS or BFS, never forget visited',
    minutes: 45,
    sections: [

      /* ------------------------------------------------ 2.0 ------ */
      {
        type: 'read',
        title: 'Recognizing graphs (the word “graph” never appears)',
        minutes: 5,
        html: `
<div class="big-quote">A graph exists whenever entities are connected to other entities.</div>
<p>Interviewers almost never say “graph”. They say accounts and transfers, users and referrals, services and dependencies, cities and routes, files and imports, cells and their neighbors. Your job is to hear the costume and see the shape.</p>

<table>
<tr><th>Story</th><th>Nodes</th><th>Edges</th><th>Directed?</th></tr>
<tr><td>accounts, transfers</td><td>accounts</td><td>transfer from → to</td><td>yes</td></tr>
<tr><td>users, referrals</td><td>users</td><td>inviter → invitee</td><td>yes</td></tr>
<tr><td>services, dependencies</td><td>services</td><td>depends-on</td><td>yes</td></tr>
<tr><td>cities, roads</td><td>cities</td><td>road between</td><td>usually no</td></tr>
<tr><td>friends</td><td>people</td><td>friendship</td><td>no</td></tr>
<tr><td>a maze / grid</td><td>cells</td><td>adjacent open cells</td><td>no</td></tr>
<tr><td>states + legal moves (puzzles)</td><td>states</td><td>a move</td><td>yes</td></tr>
</table>

<h2>Vocabulary you must use fluently</h2>
<ul>
<li><strong>node / vertex</strong> — an entity. <strong>edge</strong> — a connection.</li>
<li><strong>directed edge</strong> A→B: you can go from A to B but not back. <strong>undirected</strong>: both ways. <em>Ask which one</em> — “does a transfer from A to B mean B can reach A?” — the answer is no, and asking shows you know it matters.</li>
<li><strong>adjacency list</strong> — <code>Map&lt;node, node[]&gt;</code>: for each node, its outgoing neighbors. The representation for nearly everything.</li>
<li><strong>reachable</strong> — there is <em>some</em> path. <strong>connected component</strong> — a set of nodes all reachable from each other.</li>
<li><strong>V, E</strong> — number of nodes and edges. Traversal complexity is <strong>O(V + E)</strong>.</li>
</ul>

${widget('multi', {
  label: 'Directed or not?',
  q: 'Which of these relationships are naturally <em>directed</em>?',
  choices: ['A transferred money to B', 'A and B are friends', 'Service A depends on service B', 'Two grid cells are adjacent', 'A referred B to the platform', 'Cities connected by a two-way road'],
  answers: [0, 2, 4],
  explain: '<p>Transfers, dependencies, referrals have a direction; friendship, adjacency, two-way roads do not. For undirected data you add <em>both</em> A→B and B→A to the adjacency list — forgetting one half is a classic bug.</p>'
})}

${widget('mcq', {
  label: 'Recognition',
  q: '“Given which employees report to whom, find everyone who ultimately reports to the CTO.” Which shape?',
  choices: ['Set — dedupe the employees', 'Sort + scan', 'Graph (a tree, really): start at the CTO, traverse the reports-to edges, collect everything reached', 'Heap — top K employees'],
  answer: 2,
  explain: '<p>Entities connected to entities → graph. “Ultimately” = transitively = traversal. A hierarchy is a tree, which is a graph with extra rules (Module 3), so the same DFS/BFS works.</p>'
})}

${callout('key', 'The recognition sentence', `<p>“The ___ are nodes and each ___ is a directed edge from ___ to ___. The question is [reachability / shortest path / cycle / count], so I’ll build an adjacency list and run [DFS / BFS].”</p>`)}
`
      },

      /* ------------------------------------------------ 2.1 ------ */
      {
        type: 'read',
        title: 'Adjacency lists — build one',
        minutes: 5,
        html: `
<p>Every graph exercise starts by converting the input (usually a list of pairs) into a <code>Map&lt;node, neighbors[]&gt;</code>. Get this to muscle memory; it's ten lines you'll write in every graph interview.</p>

${diagram(`
edges                        adjacency list
[["A","B"],                  Map {
 ["A","C"],         →          "A" => ["B", "C"],
 ["B","D"]]                    "B" => ["D"],
                               "C" => [],      ← destination-only nodes still get a key
                               "D" => []
                             }`)}

${callout('warn', 'The destination-only trap', `<p>If a node only ever appears as a destination and you only create keys for sources, then later <code>adj.get("D")</code> is <code>undefined</code> and <code>for (const n of undefined)</code> throws. Either register both endpoints when building, or always read with <code>adj.get(node) ?? []</code>. Do one of them <em>every time</em>.</p>`)}

${widget('exercise', {
  id: 'ex-2-0',
  title: 'buildGraph(edges)',
  time: 4,
  fn: 'buildGraph',
  prompt: `<p>Given directed edges as <code>[from, to]</code> pairs, return an adjacency list: a <code>Map</code> (or plain object) from each node to the array of its outgoing neighbors, <strong>in input order</strong>. Every node that appears anywhere must be a key — destination-only nodes map to <code>[]</code>.</p>
${code('js', 'example', `buildGraph([["A", "B"], ["A", "C"], ["B", "D"]])
// Map { "A" => ["B", "C"], "B" => ["D"], "C" => [], "D" => [] }`)}`,
  reasoning: [
    { cat: 'abstraction', q: 'What is the adjacency list, in Module 1 terms?', choices: ['A Set of nodes', 'A group-by: Map from source node → list of destinations', 'A sorted array of edges', 'A heap of edges'], answer: 1,
      explain: '<p>It’s the grouping idiom from Module 1 — <code>if (!m.has(k)) m.set(k, []); m.get(k).push(v)</code> — applied to edges. Same reflex, new costume.</p>' },
    { cat: 'edge', q: 'Why create a key for the destination node too?', choices: ['Because Maps need even numbers of keys', 'So that later traversal can iterate <code>adj.get(node)</code> for any node without hitting <code>undefined</code>', 'To make the Map sorted', 'It isn’t necessary'], answer: 1,
      explain: '<p>Robustness. A traversal that reaches “D” asks for D’s neighbors; if D has no key that’s a crash (or a silent skip, which is worse).</p>' }
  ],
  starter: `
function buildGraph(edges) {
  const adj = new Map();
  // TODO
  return adj;
}`,
  tests: [
    { name: 'example', args: [[['A', 'B'], ['A', 'C'], ['B', 'D']]], expect: { A: ['B', 'C'], B: ['D'], C: [], D: [] } },
    { name: 'node with multiple outgoing edges keeps input order', args: [[['X', 'C'], ['X', 'A'], ['X', 'B']]], expect: { X: ['C', 'A', 'B'], C: [], A: [], B: [] } },
    { name: 'destination-only node gets an empty list', args: [[['A', 'B']]], expect: { A: ['B'], B: [] } },
    { name: 'empty edge list', args: [[]], expect: {} },
    { name: 'cycle is just edges', args: [[['A', 'B'], ['B', 'A']]], expect: { A: ['B'], B: ['A'] } },
    { name: 'duplicate edge is kept (multigraph)', args: [[['A', 'B'], ['A', 'B']]], expect: { A: ['B', 'B'], B: [] } }
  ],
  antiSolutions: [
    { name: 'forgets destination-only nodes', code: 'function buildGraph(edges) { const m = new Map(); for (const [a, b] of edges) { if (!m.has(a)) m.set(a, []); m.get(a).push(b); } return m; }' }
  ],
  hints: [
    '<p>It’s group-by: key = from, value = list of to.</p>',
    '<p>For each <code>[a, b]</code>: ensure <em>both</em> <code>a</code> and <code>b</code> have a key, then push <code>b</code> onto <code>a</code>’s list.</p>'
  ],
  solution: `
function buildGraph(edges) {
  const adj = new Map();
  for (const [from, to] of edges) {
    if (!adj.has(from)) adj.set(from, []);
    if (!adj.has(to)) adj.set(to, []);      // destination-only nodes get a key too
    adj.get(from).push(to);
  }
  return adj;
}`,
  solutionExplain: '<p>For an <em>undirected</em> graph, add the mirror edge: <code>adj.get(to).push(from)</code>. Say which one you’re building.</p>',
  complexity: '<p>“O(V + E) time and space: one Map entry per node, one list entry per edge.”</p>',
  followUp: {
    q: 'Follow-up: transfers now carry an amount — <code>[from, to, amount]</code> — and later questions will need it. What do you store?',
    choices: ['Ignore the amount', 'Neighbors as objects/tuples: <code>adj.get(from).push({ to, amount })</code> — the traversal reads <code>.to</code>', 'A second Map from amount to edge', 'Sort edges by amount first'],
    answer: 1,
    explain: '<p>Weighted adjacency list. The traversal code barely changes (<code>for (const { to } of adj.get(u))</code>), and you’re ready for “ignore transfers under X” or Dijkstra later.</p>'
  }
})}
`
      },

      /* ------------------------------------------------ 2.2 ------ */
      {
        type: 'read',
        title: 'DFS — follow one branch to the end',
        minutes: 10,
        html: `
<div class="big-quote">DFS: follow one branch as far as it goes, then back up and try the next.</div>

${diagram(`
visit(node):
    if node in visited:  return        ← the line everyone forgets
    visited.add(node)
    for each neighbor of node:
        visit(neighbor)`)}

<p>That's the entire algorithm. Recursion gives you the "back up" for free — the call stack <em>is</em> the path you're on. The iterative version replaces the call stack with an explicit stack (push neighbors, pop the last pushed).</p>

<p><strong>Use DFS for:</strong> reachability (“can A reach B?”), exhaustive traversal (“collect everything reachable”), connected components, cycle detection, tree traversal. <strong>Not for:</strong> shortest paths — DFS finds <em>a</em> path, not the shortest one.</p>

<h2>Trace it yourself</h2>
<p>Predict each visited node. Neighbors are explored in the order listed. Watch what happens when E points back to A.</p>
${widget('trace', {
  algo: 'dfs',
  graph: { A: ['B', 'C'], B: ['D'], C: ['D', 'E'], D: [], E: ['A'] },
  start: 'A',
  pos: { A: [50, 110], B: [170, 45], C: [170, 175], D: [300, 45], E: [300, 175] },
  explain: '<p>From C, DFS tries D — already visited — so it skips to E. From E, A is already visited: without the <code>visited</code> check, E → A → B → … would loop forever. That single check is what makes traversal terminate on cyclic graphs.</p>'
})}

${widget('spotbug', {
  label: 'Spot the bug',
  q: 'This should return whether <code>target</code> is reachable from <code>start</code>. On a graph with a cycle it never returns. Click the missing-logic line (the line where the check should be but isn’t).',
  name: 'reachable.js',
  code: `
function reachable(adj, start, target) {
  const visited = new Set();
  function dfs(node) {
    if (node === target) return true;
    visited.add(node);
    for (const next of adj.get(node) ?? []) {
      if (dfs(next)) return true;
    }
    return false;
  }
  return dfs(start);
}`,
  bugLine: 7,
  hint: 'The set is created and added to… but where is it ever <em>read</em>?',
  explain: '<p><code>visited</code> is written but never consulted. Line 7 must skip already-visited nodes: <code>if (!visited.has(next) && dfs(next)) return true;</code> — or put the guard at the top of <code>dfs</code>. Creating the set and forgetting to check it is the most common graph bug in interviews.</p>'
})}

${widget('blanks', {
  label: 'Complete the iterative DFS',
  q: 'Same algorithm with an explicit stack instead of recursion (no stack-overflow risk on deep graphs).',
  name: 'dfs-iterative.js',
  template: `
function collectReachable(adj, start) {
  const visited = new Set();
  const stack = [start];
  while (stack.length) {
    const node = stack.«0»();
    if (visited.has(node)) «1»;
    visited.add(node);
    for (const next of adj.get(node) ?? []) {
      if (!visited.has(next)) stack.«2»(next);
    }
  }
  return visited;
}`,
  blanks: [
    { choices: ['pop', 'shift', 'unshift', 'at'], answer: 0 },
    { choices: ['continue', 'break', 'return visited', 'return'], answer: 0 },
    { choices: ['push', 'unshift', 'add', 'shift'], answer: 0 }
  ],
  explain: '<p><code>pop</code> takes the <em>most recently</em> pushed node — that is what makes it depth-first. Swap <code>pop</code> for <code>shift</code> and you have BFS (next section). Checking <code>visited</code> after popping (not only before pushing) handles the case where a node was pushed twice before being processed.</p>'
})}

<h2>Exercise 2.1</h2>
${widget('exercise', {
  id: 'ex-2-1',
  title: 'canReach(transfers, source, destination)',
  time: 8,
  fn: 'canReach',
  harness: graphHarness,
  prompt: `<p>Transfers are directed <code>[from, to]</code> pairs. Return <code>true</code> if funds could have moved from <code>source</code> to <code>destination</code> through any chain of transfers. An account trivially reaches itself.</p>
${code('js', 'example', `const transfers = [["A", "B"], ["B", "C"], ["C", "D"]];
canReach(transfers, "A", "D")   // true
canReach(transfers, "D", "A")   // false — transfers are directed`)}`,
  reasoning: [
    { cat: 'abstraction', q: 'What are the nodes and edges?', choices: ['Nodes = transfers, edges = accounts', 'Nodes = accounts, edges = directed transfers from → to', 'Nodes = amounts, edges = accounts', 'There is no graph; sort the transfers'], answer: 1,
      explain: '<p>Entities are accounts; each transfer connects two of them with a direction.</p>' },
    { cat: 'algorithm', q: 'Which output type is this, and therefore which algorithm?', choices: ['Shortest path → BFS with parent map', 'Existence of a path → DFS or BFS, stop as soon as destination is seen', 'Cycle → three-color DFS', 'Top K → heap'], answer: 1,
      explain: '<p>Reachability is existence. Either traversal works; DFS is the shorter code. Returning early when you hit the destination is a nice touch.</p>' },
    { cat: 'algorithm', q: 'Why is a <code>visited</code> set necessary?', choices: ['To make the result sorted', 'Because on a cycle (A→B→A) the traversal would revisit nodes forever, and even without cycles it would redo work exponentially on diamond shapes', 'To count the nodes', 'It isn’t; the graph is a tree'], answer: 1,
      explain: '<p>Termination on cycles is the headline; avoiding repeated work on DAGs is the second reason. Say both.</p>' },
    { cat: 'complexity', q: 'Complexity?', choices: ['O(V · E)', 'O(V + E) — each account and each transfer is processed at most once', 'O(E log V)', 'O(V²)'], answer: 1,
      explain: '<p>Building the adjacency list is O(V + E); the traversal visits each node once and scans each edge once. Name V and E as accounts and transfers.</p>' },
    { type: 'text', cat: 'explanation', q: 'Say the approach in two or three sentences.', min: 50,
      model: '<p>“I’ll treat accounts as nodes and transfers as directed edges, building an adjacency list. Then a DFS from the source with a visited set: if I ever reach the destination I return true; if the traversal exhausts, false. O(V + E) time and space. Edge cases: source equals destination, source with no outgoing transfers, cycles.”</p>' }
  ],
  starter: `
function canReach(transfers, source, destination) {
  // build adjacency list, then DFS/BFS with a visited set
}`,
  tests: [
    { name: 'direct transfer', args: [[['A', 'B']], 'A', 'B'], expect: true },
    { name: 'multi-hop path', args: [[['A', 'B'], ['B', 'C'], ['C', 'D']], 'A', 'D'], expect: true },
    { name: 'direction matters (D cannot reach A)', args: [[['A', 'B'], ['B', 'C'], ['C', 'D']], 'D', 'A'], expect: false },
    { name: 'no path', args: [[['A', 'B'], ['C', 'D']], 'A', 'D'], expect: false },
    { name: 'cycle with no route to destination must terminate', args: [[['A', 'B'], ['B', 'C'], ['C', 'A'], ['X', 'Y']], 'A', 'Y'], expect: false },
    { name: 'cycle on the way to the destination', args: [[['A', 'B'], ['B', 'A'], ['B', 'C']], 'A', 'C'], expect: true },
    { name: 'source equals destination', args: [[['A', 'B']], 'A', 'A'], expect: true },
    { name: 'source is a destination-only node', args: [[['A', 'B']], 'B', 'A'], expect: false },
    { name: 'source not in any transfer', args: [[['A', 'B']], 'Q', 'B'], expect: false },
    { name: 'disconnected graph, path within one component', args: [[['A', 'B'], ['B', 'C'], ['X', 'Y'], ['Y', 'Z']], 'X', 'Z'], expect: true },
    { name: 'diamond (shared node) does not double count', args: [[['A', 'B'], ['A', 'C'], ['B', 'D'], ['C', 'D'], ['D', 'E']], 'A', 'E'], expect: true },
    { name: 'long chain (2,000 hops)', args: [Array.from({ length: 2000 }, (_, i) => ['n' + i, 'n' + (i + 1)]), 'n0', 'n2000'], expect: true }
  ],
  antiSolutions: [
    { name: 'no visited set (loops forever on cycle)', code: 'function canReach(t, s, d) { const adj = new Map(); for (const [a, b] of t) { if (!adj.has(a)) adj.set(a, []); adj.get(a).push(b); } const stack = [s]; while (stack.length) { const n = stack.pop(); if (n === d) return true; for (const x of adj.get(n) ?? []) stack.push(x); } return false; }' },
    { name: 'treats transfers as undirected', code: 'function canReach(t, s, d) { const adj = new Map(); for (const [a, b] of t) { if (!adj.has(a)) adj.set(a, []); if (!adj.has(b)) adj.set(b, []); adj.get(a).push(b); adj.get(b).push(a); } const seen = new Set([s]), st = [s]; while (st.length) { const n = st.pop(); if (n === d) return true; for (const x of adj.get(n) ?? []) if (!seen.has(x)) { seen.add(x); st.push(x); } } return false; }' }
  ],
  ownTests: true,
  ownTemplate: `
[
  { name: 'two hops', args: [[['A', 'B'], ['B', 'C']], 'A', 'C'], expect: true },
  // add at least two more — a cycle, no path, source === destination, wrong direction…
]`,
  coverage: [
    { label: 'no path', hit: args => { const [t, s, d] = args; if (!Array.isArray(t)) return false; const adj = new Map(); for (const [a, b] of t) { if (!adj.has(a)) adj.set(a, []); adj.get(a).push(b); } const seen = new Set([s]), st = [s]; while (st.length) { const n = st.pop(); if (n === d) return false; for (const x of adj.get(n) ?? []) if (!seen.has(x)) { seen.add(x); st.push(x); } } return true; } },
    { label: 'contains a cycle', hit: args => { const [t] = args; if (!Array.isArray(t)) return false; const adj = new Map(); for (const [a, b] of t) { if (!adj.has(a)) adj.set(a, []); adj.get(a).push(b); } const state = new Map(); let cyc = false; const dfs = n => { state.set(n, 1); for (const x of adj.get(n) ?? []) { if (state.get(x) === 1) cyc = true; else if (!state.has(x)) dfs(x); } state.set(n, 2); }; for (const n of adj.keys()) if (!state.has(n)) dfs(n); return cyc; } },
    { label: 'source === destination', hit: args => args[1] === args[2] },
    { label: 'reverse direction (path exists only backwards)', hit: args => { const [t, s, d] = args; if (!Array.isArray(t)) return false; const reach = (edges, a, b) => { const adj = new Map(); for (const [x, y] of edges) { if (!adj.has(x)) adj.set(x, []); adj.get(x).push(y); } const seen = new Set([a]), st = [a]; while (st.length) { const n = st.pop(); if (n === b) return true; for (const y of adj.get(n) ?? []) if (!seen.has(y)) { seen.add(y); st.push(y); } } return false; }; return !reach(t, s, d) && reach(t, d, s); } }
  ],
  hints: [
    '<p>What are the entities, and what represents a connection between them?</p>',
    '<p>Build an adjacency list first (you just wrote <code>buildGraph</code>).</p>',
    '<p>Starting at the source, what prevents revisiting the same account forever?</p>',
    '<p>DFS (recursive or with a stack) with a <code>visited</code> Set; return true the moment you pop/visit the destination. Remember <code>adj.get(node) ?? []</code> for nodes with no outgoing transfers.</p>'
  ],
  solution: `
function canReach(transfers, source, destination) {
  const adj = new Map();
  for (const [from, to] of transfers) {
    if (!adj.has(from)) adj.set(from, []);
    adj.get(from).push(to);
  }
  const visited = new Set();
  const stack = [source];
  while (stack.length) {
    const node = stack.pop();
    if (node === destination) return true;
    if (visited.has(node)) continue;
    visited.add(node);
    for (const next of adj.get(node) ?? []) {
      if (!visited.has(next)) stack.push(next);
    }
  }
  return false;
}`,
  solutionExplain: '<p>Iterative DFS. The recursive form is equally fine — <code>function dfs(n) { if (n === destination) return true; if (visited.has(n)) return false; visited.add(n); return (adj.get(n) ?? []).some(dfs); }</code> — but mention the recursion-depth risk on very long chains (the 2,000-hop test is fine; 100,000 would not be).</p>',
  complexity: '<p>“O(V + E) time where V is the number of accounts and E the number of transfers — each is processed at most once thanks to the visited set — and O(V + E) space for the adjacency list plus O(V) for visited and the stack.”</p>',
  followUp: {
    q: 'Follow-up: “Return <em>how many</em> accounts are reachable from the source (excluding it).” What changes?',
    choices: ['Switch to BFS', 'Remove the early return, traverse everything, and return <code>visited.size - 1</code>', 'Count the edges instead', 'You need a second traversal from every node'],
    answer: 1,
    explain: '<p>Same traversal, different output: don’t stop early, and the visited set <em>is</em> the answer. Module 7’s mock interview ends on exactly this twist.</p>'
  }
})}
`
      },

      /* ------------------------------------------------ 2.3 ------ */
      {
        type: 'read',
        title: 'BFS — one distance level at a time',
        minutes: 12,
        html: `
<div class="big-quote">BFS: explore everything at distance 1, then everything at distance 2, then 3…</div>

${diagram(`
distance 0:  A
distance 1:  B, C          ← everything one hop from A
distance 2:  D, E, F       ← everything two hops from A (that wasn't already seen)

queue:  [A] → [B, C] → [C, D, E] → [D, E, F] → …    (take from the front, add to the back)`)}

<p><strong>Why BFS finds the shortest path in an unweighted graph:</strong> the queue processes nodes in non-decreasing distance order. When a node is <em>first</em> discovered, it's discovered from a node at distance d, so its distance is d+1 — and nothing later can find a shorter route, because everything later is at distance ≥ d. Say this sentence in the interview; it's the whole proof.</p>

<h2>Trace it — compare with the DFS order you saw</h2>
${widget('trace', {
  algo: 'bfs',
  graph: { A: ['B', 'C', 'D'], B: ['E'], C: ['E', 'F'], D: ['F'], E: ['G'], F: ['G'], G: [] },
  start: 'A',
  pos: { A: [40, 110], B: [150, 40], C: [150, 110], D: [150, 180], E: [270, 60], F: [270, 160], G: [390, 110] },
  explain: '<p>BFS visits by rings: {B, C, D} then {E, F} then {G}. G’s distance is 3 and BFS discovers it via E (the first distance-2 node dequeued). DFS on the same graph would go A, B, E, G, C, F, D — it reaches G just as fast here, but on other graphs it can find G via a much longer path first.</p>'
})}

<h2>The visited-timing rule</h2>
${callout('key', 'Mark nodes visited when you ENQUEUE them, not when you dequeue them', `<p>Invariant: <em>every node in the queue has been discovered exactly once.</em> If you mark on dequeue, the same node can be pushed several times by different neighbors before it’s processed — still correct for reachability, but it inflates the queue, breaks the “first discovery = shortest” argument for path reconstruction, and on dense graphs blows up the work.</p>`)}

${widget('spotbug', {
  label: 'Spot the bug',
  q: 'This BFS returns the shortest hop count. It gives the right number but does far too much work on dense graphs and can enqueue the same node many times. Click the line that is in the wrong place.',
  name: 'shortestHops.js',
  code: `
function shortestHops(adj, start, target) {
  const visited = new Set();
  const queue = [[start, 0]];
  while (queue.length) {
    const [node, dist] = queue.shift();
    if (node === target) return dist;
    visited.add(node);
    for (const next of adj.get(node) ?? []) {
      if (!visited.has(next)) queue.push([next, dist + 1]);
    }
  }
  return -1;
}`,
  bugLine: 7,
  hint: 'When does a node get marked — as it enters the queue, or as it leaves?',
  explain: '<p>Marking on dequeue (line 7) means a node can sit in the queue several times. Mark on <em>enqueue</em> instead: <code>visited.add(start)</code> before the loop, and inside the loop <code>if (!visited.has(next)) { visited.add(next); queue.push(…) }</code>. Same result, tight queue, and the parent-map trick in the next exercise depends on it.</p>'
})}

<h2>Reconstructing the actual path</h2>
<p>To return the path — not just its length — remember <em>how</em> each node was discovered: <code>parent.set(next, node)</code> at enqueue time. When you reach the destination, walk parents backwards to the source and reverse.</p>
${code('js', 'path reconstruction', `
const path = [];
for (let cur = destination; cur !== undefined; cur = parent.get(cur)) path.push(cur);
path.reverse();               // parent.get(source) is undefined → loop stops there`)}

<h2>Exercise 2.2</h2>
${widget('exercise', {
  id: 'ex-2-2',
  title: 'shortestTransferPath(transfers, source, destination)',
  time: 10,
  fn: 'shortestTransferPath',
  harness: graphHarness,
  check: (out, args, H) => {
    const [edges, src, dst] = args;
    const dist = H.bfsDist(edges, src);
    if (!dist.has(dst)) return { ok: out === null, expected: 'null — destination unreachable' };
    const want = dist.get(dst) + 1;
    if (!Array.isArray(out)) return { ok: false, expected: 'an array path of ' + want + ' account(s) from ' + src + ' to ' + dst };
    const ok = out.length === want && out[0] === src && out[out.length - 1] === dst && H.isPath(edges, out);
    return { ok, expected: 'a valid path of length ' + want + ' from ' + src + ' to ' + dst + (out.length > want ? ' (yours has ' + out.length + ' — not the shortest)' : '') };
  },
  prompt: `<p>Return the <strong>shortest</strong> chain of accounts from <code>source</code> to <code>destination</code> as an array (inclusive of both ends), or <code>null</code> if unreachable. Any path with the minimum number of hops is accepted. If source equals destination, return <code>[source]</code>.</p>
${code('js', 'example', `const transfers = [["A","B"], ["B","C"], ["A","D"], ["D","E"], ["E","C"], ["C","F"]];
shortestTransferPath(transfers, "A", "F")   // ["A", "B", "C", "F"]  (A→D→E→C→F is longer)`)}`,
  reasoning: [
    { cat: 'algorithm', q: 'BFS or DFS — and why?', choices: ['DFS, because it follows a chain naturally', 'BFS, because it discovers nodes in order of hop distance, so the first time the destination is discovered is via a shortest route', 'Either; they always give the same path', 'DFS with sorting'], answer: 1,
      explain: '<p>“Shortest” in an unweighted graph is the BFS trigger word. DFS finds <em>a</em> path — on the example it might return the 5-node route.</p>' },
    { cat: 'algorithm', q: 'What extra state do you need to return the path itself?', choices: ['A distance counter', 'A <code>parent</code> Map recording, for each discovered node, the node it was discovered from', 'A stack of paths', 'A sorted list of nodes'], answer: 1,
      explain: '<p>Store the predecessor at enqueue time, then walk backwards from the destination. Storing whole paths in the queue also works but is O(V²) memory in the worst case — mention that if you choose it.</p>' },
    { cat: 'edge', q: 'When should a node be marked visited?', choices: ['When dequeued', 'When enqueued (discovered) — so each node is queued exactly once and its recorded parent is the shortest-route one', 'At the end', 'Only if it’s the destination'], answer: 1,
      explain: '<p>If you mark on dequeue, a later, longer discovery could overwrite the parent recorded by the shortest one (unless you guard). Mark-on-enqueue makes the invariant simple.</p>' },
    { cat: 'complexity', q: 'Complexity?', choices: ['O(V + E) time, O(V) extra for queue/visited/parent', 'O(V²)', 'O(E log V)', 'O(V · E)'], answer: 0,
      explain: '<p>Same as any traversal. Path reconstruction adds O(path length) ≤ O(V).</p>' }
  ],
  starter: `
function shortestTransferPath(transfers, source, destination) {
  // BFS with a parent map, then reconstruct backwards
}`,
  tests: [
    { name: 'example — shortest among multiple routes', args: [[['A', 'B'], ['B', 'C'], ['A', 'D'], ['D', 'E'], ['E', 'C'], ['C', 'F']], 'A', 'F'] },
    { name: 'direct connection', args: [[['A', 'B'], ['B', 'C']], 'A', 'B'] },
    { name: 'source equals destination', args: [[['A', 'B']], 'A', 'A'] },
    { name: 'no path → null', args: [[['A', 'B'], ['C', 'D']], 'A', 'D'] },
    { name: 'wrong direction → null', args: [[['A', 'B']], 'B', 'A'] },
    { name: 'cycle must not break it', args: [[['A', 'B'], ['B', 'A'], ['B', 'C'], ['C', 'A']], 'A', 'C'] },
    { name: 'longer route listed first, short route later', args: [[['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'E'], ['A', 'X'], ['X', 'E']], 'A', 'E'] },
    { name: 'unreachable destination inside a cycle elsewhere', args: [[['A', 'B'], ['C', 'D'], ['D', 'C']], 'A', 'C'] },
    { name: 'source not in graph → null', args: [[['A', 'B']], 'Q', 'B'] },
    { name: 'long chain (1,500 hops)', args: [Array.from({ length: 1500 }, (_, i) => ['n' + i, 'n' + (i + 1)]), 'n0', 'n1500'] }
  ],
  antiSolutions: [
    { name: 'DFS returns a non-shortest path', code: 'function shortestTransferPath(t, s, d) { const adj = new Map(); for (const [a, b] of t) { if (!adj.has(a)) adj.set(a, []); adj.get(a).push(b); } const seen = new Set(); function dfs(n, path) { if (n === d) return path; if (seen.has(n)) return null; seen.add(n); for (const x of adj.get(n) ?? []) { const r = dfs(x, path.concat([x])); if (r) return r; } return null; } return dfs(s, [s]); }' },
    { name: 'marks visited on dequeue and overwrites parents', code: 'function shortestTransferPath(t, s, d) { const adj = new Map(); for (const [a, b] of t) { if (!adj.has(a)) adj.set(a, []); adj.get(a).push(b); } const seen = new Set(), parent = new Map(), q = [s]; while (q.length) { const n = q.shift(); if (seen.has(n)) continue; seen.add(n); if (n === d) break; for (const x of adj.get(n) ?? []) if (!seen.has(x)) { parent.set(x, n); q.push(x); } } if (!seen.has(d)) return null; const p = []; for (let c = d; c !== undefined; c = parent.get(c)) p.push(c); return p.reverse(); }' }
  ],
  ownTests: true,
  ownTemplate: `
[
  { name: 'two hops', args: [[['A', 'B'], ['B', 'C']], 'A', 'C'], expect: ['A', 'B', 'C'] },
  // add at least two more — no path (expect: null), source === destination, a shorter route hidden behind a longer one…
]`,
  coverage: [
    { label: 'unreachable (null)', hit: args => { const [t, s, d] = args; if (!Array.isArray(t)) return false; const adj = new Map(); for (const [a, b] of t) { if (!adj.has(a)) adj.set(a, []); adj.get(a).push(b); } const seen = new Set([s]), q = [s]; while (q.length) { const n = q.shift(); if (n === d) return false; for (const x of adj.get(n) ?? []) if (!seen.has(x)) { seen.add(x); q.push(x); } } return true; } },
    { label: 'source === destination', hit: args => args[1] === args[2] },
    { label: 'two routes of different length', hit: args => { const [t, s, d] = args; if (!Array.isArray(t)) return false; const adj = new Map(); for (const [a, b] of t) { if (!adj.has(a)) adj.set(a, []); adj.get(a).push(b); } let count = 0, shortest = Infinity, longest = 0; const dfs = (n, seen, len) => { if (count > 50) return; if (n === d) { count++; shortest = Math.min(shortest, len); longest = Math.max(longest, len); return; } for (const x of adj.get(n) ?? []) if (!seen.has(x)) { seen.add(x); dfs(x, seen, len + 1); seen.delete(x); } }; dfs(s, new Set([s]), 0); return count >= 2 && longest > shortest; } },
    { label: 'contains a cycle', hit: args => { const [t] = args; if (!Array.isArray(t)) return false; const adj = new Map(); for (const [a, b] of t) { if (!adj.has(a)) adj.set(a, []); adj.get(a).push(b); } const state = new Map(); let cyc = false; const dfs = n => { state.set(n, 1); for (const x of adj.get(n) ?? []) { if (state.get(x) === 1) cyc = true; else if (!state.has(x)) dfs(x); } state.set(n, 2); }; for (const n of adj.keys()) if (!state.has(n)) dfs(n); return cyc; } }
  ],
  hints: [
    '<p>Which traversal discovers nodes in order of distance?</p>',
    '<p>Queue starts with the source; the visited set starts containing the source. When you discover <code>next</code> from <code>node</code>, record <code>parent.set(next, node)</code> and mark it visited <em>right there</em>.</p>',
    '<p>Stop when you dequeue (or discover) the destination. Then: <code>for (let cur = destination; cur !== undefined; cur = parent.get(cur)) path.push(cur)</code>, reverse it.</p>',
    '<p>Unreachable: if the loop ends and the destination was never visited, return <code>null</code>. Source === destination falls out naturally if you check on dequeue.</p>'
  ],
  solution: `
function shortestTransferPath(transfers, source, destination) {
  const adj = new Map();
  for (const [from, to] of transfers) {
    if (!adj.has(from)) adj.set(from, []);
    adj.get(from).push(to);
  }
  const parent = new Map();            // child → the node it was discovered from
  const visited = new Set([source]);   // mark on enqueue
  const queue = [source];
  while (queue.length) {
    const node = queue.shift();
    if (node === destination) {
      const path = [];
      for (let cur = destination; cur !== undefined; cur = parent.get(cur)) path.push(cur);
      return path.reverse();
    }
    for (const next of adj.get(node) ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        parent.set(next, node);
        queue.push(next);
      }
    }
  }
  return null;
}`,
  solutionExplain: '<p><code>queue.shift()</code> is O(n) on JS arrays, making the whole thing O(V²) in theory. In an interview, say “I’d use a head index or a real deque in production” — <code>let head = 0; … queue[head++]</code> — and move on. Interviewers care that you know, not that you write it.</p>',
  complexity: '<p>“O(V + E) time; O(V) extra space for the queue, visited set and parent map, on top of O(V + E) for the adjacency list.”</p>',
  followUp: {
    q: 'Follow-up: “Return the shortest path length as a number of hops, or -1.” Simplest change?',
    choices: ['Keep everything and return <code>path.length - 1</code> (or track a distance map instead of parents)', 'Switch to DFS', 'Sort the transfers', 'Run BFS from both ends'],
    answer: 0,
    explain: '<p>Either return <code>path.length - 1</code>, or replace the parent map with <code>dist</code> (<code>dist.set(next, dist.get(node) + 1)</code>). Bidirectional BFS is a real optimization but overkill unless asked about scale.</p>'
  }
})}
`
      },

      /* ------------------------------------------------ 2.4 ------ */
      {
        type: 'read',
        title: 'Cycle detection — three colors',
        minutes: 8,
        html: `
<p>“Circular dependency”, “can this ever deadlock”, “is this schedule possible” — all mean: <strong>does the directed graph contain a cycle?</strong></p>

${callout('warn', 'A previously visited node does NOT mean a cycle (in a directed graph)', `<p>Diamond: A→B, A→C, B→D, C→D. DFS from A reaches D via B, then later reaches D again via C. D was visited — but there is no cycle. What signals a cycle is reaching a node that is on the <em>current path</em> (still being explored).</p>`)}

${diagram(`
three states per node:
  unseen      – never touched
  exploring   – on the current DFS path (entered, not yet finished)     ← "grey"
  done        – fully explored, every descendant finished                ← "black"

dfs(node):
  state[node] = exploring
  for next of adj[node]:
      if state[next] == exploring:  CYCLE          ← back edge to the current path
      if state[next] == unseen:     dfs(next)
  state[node] = done

run dfs from every unseen node (the graph may be disconnected)`)}

<p>With two Sets instead of a state map: <code>visiting</code> (grey) and <code>visited</code> (black). A neighbor in <code>visiting</code> = cycle; a neighbor in <code>visited</code> = skip; else recurse. Remember to move the node from <code>visiting</code> to <code>visited</code> when its recursion returns.</p>

${widget('mcq', {
  label: 'Check the trap',
  q: 'Dependencies: <code>api→db, api→cache, db→shared, cache→shared</code>. A single-<code>visited</code>-set DFS reports “cycle” when it reaches <code>shared</code> the second time. What’s the actual answer and why?',
  choices: [
    'There is a cycle — shared is reached twice',
    'No cycle — shared was reached twice via different branches, but by the time the second branch reaches it, it is <em>done</em>, not <em>exploring</em>',
    'No cycle — because the graph has 4 edges and 4 nodes',
    'It depends on the order of the edges'
  ],
  answer: 1,
  explain: '<p>The diamond. Only a back edge to a node still on the recursion stack is a cycle. This is the difference between the reachability visited set and cycle detection’s three colors — say “grey/black” or “exploring/done” and interviewers relax.</p>'
})}

<h2>Exercise 2.3</h2>
${widget('exercise', {
  id: 'ex-2-3',
  title: 'hasCycle(dependencies)',
  time: 8,
  fn: 'hasCycle',
  prompt: `<p>Dependencies are directed <code>[from, to]</code> pairs meaning “<code>from</code> depends on <code>to</code>”. Return <code>true</code> if there is any circular dependency. The graph may be disconnected.</p>
${code('js', 'example', `hasCycle([["api", "database"], ["database", "cache"], ["cache", "api"]])   // true
hasCycle([["api", "database"], ["api", "cache"]])                           // false`)}`,
  reasoning: [
    { cat: 'abstraction', q: 'Which graph question is “circular dependency”?', choices: ['Shortest path', 'Reachability from one node', 'Directed cycle detection', 'Top K nodes by degree'], answer: 2,
      explain: '<p>Cycle ⇔ some node can reach itself. The trigger words: circular, deadlock, “can this order ever be resolved”.</p>' },
    { cat: 'algorithm', q: 'What identifies a cycle during DFS?', choices: ['Reaching any node that has already been visited', 'Reaching a node that is currently on the DFS path (state = exploring / grey)', 'Reaching a node with no outgoing edges', 'Visiting more nodes than edges'], answer: 1,
      explain: '<p>The back edge. A node that is finished (black) can be reached again in a DAG with no cycle at all.</p>' },
    { cat: 'edge', q: 'The graph has two separate components and the cycle is in the second one. What must your code do?', choices: ['Nothing special; DFS finds it', 'Start a DFS from <em>every</em> node that is still unseen, not just the first one', 'Sort the nodes first', 'Return false; disconnected graphs can’t have cycles'], answer: 1,
      explain: '<p>A traversal from one start node only explores its component. Loop over all nodes and launch DFS from each unseen one.</p>' },
    { cat: 'complexity', q: 'Complexity?', choices: ['O(V + E)', 'O(V²)', 'O(V · E)', 'O(E log E)'], answer: 0,
      explain: '<p>Each node enters “exploring” once and “done” once; each edge is examined once.</p>' }
  ],
  starter: `
function hasCycle(dependencies) {
  // three states: unseen / exploring / done
}`,
  tests: [
    { name: 'example — three-node cycle', args: [[['api', 'database'], ['database', 'cache'], ['cache', 'api']]], expect: true },
    { name: 'simple DAG', args: [[['api', 'database'], ['api', 'cache']]], expect: false },
    { name: 'diamond is NOT a cycle', args: [[['a', 'b'], ['a', 'c'], ['b', 'd'], ['c', 'd']]], expect: false },
    { name: 'self-dependency', args: [[['a', 'a']]], expect: true },
    { name: 'two-node cycle', args: [[['a', 'b'], ['b', 'a']]], expect: true },
    { name: 'cycle in a second, disconnected component', args: [[['a', 'b'], ['x', 'y'], ['y', 'z'], ['z', 'x']]], expect: true },
    { name: 'cycle not reachable from the first-listed node', args: [[['start', 'a'], ['b', 'c'], ['c', 'b']]], expect: true },
    { name: 'empty', args: [[]], expect: false },
    { name: 'long chain, no cycle', args: [Array.from({ length: 1000 }, (_, i) => ['s' + i, 's' + (i + 1)])], expect: false },
    { name: 'DAG with many shared nodes (revisits without cycle)', args: [[['a', 'x'], ['b', 'x'], ['c', 'x'], ['x', 'y'], ['a', 'y'], ['b', 'y'], ['y', 'z'], ['a', 'z']]], expect: false },
    { name: 'cycle deep in a long chain', args: [Array.from({ length: 300 }, (_, i) => ['c' + i, 'c' + (i + 1)]).concat([['c300', 'c150']])], expect: true }
  ],
  antiSolutions: [
    { name: 'single visited set (flags the diamond)', code: 'function hasCycle(deps) { const adj = new Map(); for (const [a, b] of deps) { if (!adj.has(a)) adj.set(a, []); if (!adj.has(b)) adj.set(b, []); adj.get(a).push(b); } const seen = new Set(); function dfs(n) { if (seen.has(n)) return true; seen.add(n); return (adj.get(n) ?? []).some(dfs); } for (const n of adj.keys()) if (!seen.has(n) && dfs(n)) return true; return false; }' },
    { name: 'only starts from the first node', code: 'function hasCycle(deps) { if (!deps.length) return false; const adj = new Map(); for (const [a, b] of deps) { if (!adj.has(a)) adj.set(a, []); if (!adj.has(b)) adj.set(b, []); adj.get(a).push(b); } const state = new Map(); function dfs(n) { state.set(n, 1); for (const x of adj.get(n) ?? []) { if (state.get(x) === 1) return true; if (!state.has(x) && dfs(x)) return true; } state.set(n, 2); return false; } return dfs(deps[0][0]); }' }
  ],
  hints: [
    '<p>Reachability’s visited set isn’t enough — you need to know whether a node is <em>currently being explored</em>.</p>',
    '<p>Keep <code>state = new Map()</code> with values <code>"exploring"</code> / <code>"done"</code> (absent = unseen). Set exploring on entry, done on exit.</p>',
    '<p>Inside the loop over neighbors: exploring → return true; unseen → recurse and propagate true; done → skip.</p>',
    '<p>Outside: <code>for (const n of adj.keys()) if (!state.has(n) && dfs(n)) return true; return false;</code> — every component.</p>'
  ],
  solution: `
function hasCycle(dependencies) {
  const adj = new Map();
  for (const [from, to] of dependencies) {
    if (!adj.has(from)) adj.set(from, []);
    if (!adj.has(to)) adj.set(to, []);
    adj.get(from).push(to);
  }
  const EXPLORING = 1, DONE = 2;
  const state = new Map();               // absent = unseen
  function dfs(node) {
    state.set(node, EXPLORING);
    for (const next of adj.get(node) ?? []) {
      if (state.get(next) === EXPLORING) return true;      // back edge → cycle
      if (!state.has(next) && dfs(next)) return true;
    }
    state.set(node, DONE);
    return false;
  }
  for (const node of adj.keys()) {
    if (!state.has(node) && dfs(node)) return true;         // every component
  }
  return false;
}`,
  solutionExplain: '<p>The alternative that interviewers also like: <strong>Kahn’s algorithm</strong> — compute in-degrees, repeatedly remove nodes with in-degree 0; if you can’t remove everything, there’s a cycle. It doubles as topological sort (“in what order can I deploy these services?”). Mention it as the follow-up answer.</p>',
  complexity: '<p>“O(V + E) time and O(V) extra space for the state map and recursion stack.”</p>',
  followUp: {
    q: 'Follow-up: “If there is no cycle, return a valid build order (dependencies first).” What do you reach for?',
    choices: ['Sort the nodes alphabetically', 'Topological sort: either record nodes in DFS post-order and reverse, or Kahn’s in-degree queue', 'BFS from the first node', 'The same DFS, returning the visited set'],
    answer: 1,
    explain: '<p>Cycle detection and topological sort are the same DFS: when a node becomes <em>done</em>, push it to a list; the reversed list is a valid order (for “depends-on” edges, the un-reversed post-order already puts dependencies first). Kahn’s algorithm is the BFS-flavored alternative.</p>'
  }
})}
`
      },

      /* ------------------------------------------------ 2.5 ------ */
      {
        type: 'read',
        title: 'A grid is a graph too',
        minutes: 7,
        html: `
<p>The conceptual transfer this section exists for: <strong>not every graph looks like <code>{ A: ["B"] }</code></strong>. In a grid, each cell is a node and its up/down/left/right open neighbors are the edges — the adjacency list is <em>computed on the fly</em> from coordinates instead of stored.</p>

${diagram(`
S . # .          node  = (row, col)
# . # .          edges = the 4 neighbors that are in bounds and not '#'
. . . E          visited = a Set of "row,col" strings (or a 2-D boolean array)`)}

<p>Everything else is identical to Exercise 2.1: a queue or stack, a visited set, stop when you reach E. Don't burn time on matrix syntax — the two lines you need are the direction list and the bounds check:</p>
${code('js', 'the grid idioms', `
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];       // down, up, right, left
const inBounds = (r, c) => r >= 0 && r < rows && c >= 0 && c < cols;
const key = (r, c) => r + ',' + c;                     // Set can't hold [r, c] arrays by value`)}

${widget('mcq', {
  label: 'Why the string key?',
  q: 'Why does <code>visited.has([r, c])</code> never work as intended?',
  choices: ['Sets can’t hold arrays', 'Arrays are compared by reference — a fresh <code>[r, c]</code> is never “equal” to the one stored, so every cell looks unvisited (infinite loop)', 'It works, but is slow', 'Because r and c are numbers'],
  answer: 1,
  explain: '<p>Identity, not structural, equality. Use a string key <code>r + "," + c</code> (or <code>r * cols + c</code>), or a 2-D boolean array. This bug produces exactly the “timed out” message you may have already seen.</p>'
})}

${widget('exercise', {
  id: 'ex-2-4',
  title: 'canExit(grid)',
  time: 8,
  fn: 'canExit',
  prompt: `<p><code>grid</code> is an array of equal-length strings. <code>S</code> is the start, <code>E</code> the exit, <code>#</code> a wall, <code>.</code> open floor. Moving up/down/left/right only, return whether <code>E</code> is reachable from <code>S</code>.</p>
${code('js', 'example', `canExit([
  "S.#.",
  "#.#.",
  "...E"
])   // true`)}`,
  reasoning: [
    { cat: 'abstraction', q: 'In graph terms, what are the nodes and edges?', choices: ['Nodes = rows, edges = columns', 'Nodes = cells, edges = adjacency between two open cells (up/down/left/right)', 'Nodes = walls, edges = paths', 'It’s not a graph; it’s a matrix problem'], answer: 1,
      explain: '<p>Cells are entities; adjacency is the relationship. The adjacency “list” is computed from coordinates, never stored.</p>' },
    { cat: 'algorithm', q: 'BFS or DFS for “is the exit reachable?”', choices: ['Only BFS works on grids', 'Either — it’s existence; BFS would additionally give the fewest steps', 'Only DFS works on grids', 'Dijkstra'], answer: 1,
      explain: '<p>Existence → either. If the follow-up is “fewest moves”, you’ll want BFS, so many people default to BFS on grids.</p>' },
    { cat: 'complexity', q: 'Complexity for an R × C grid?', choices: ['O(R · C) — each cell visited once, 4 edges each', 'O(R + C)', 'O((R·C)²)', 'O(R · C · log(R · C))'], answer: 0,
      explain: '<p>V = R·C cells, E ≤ 4V, so O(V + E) = O(R·C).</p>' }
  ],
  starter: `
function canExit(grid) {
  const rows = grid.length, cols = grid[0].length;
  // find S, then BFS/DFS over cells with a visited Set of "r,c" keys
}`,
  tests: [
    { name: 'example', args: [['S.#.', '#.#.', '...E']], expect: true },
    { name: 'walled off', args: [['S.#.', '###.', '...E']], expect: false },
    { name: 'S next to E', args: [['SE']], expect: true },
    { name: 'must go around', args: [['S..', '.#.', '..E']], expect: true },
    { name: 'no diagonal moves', args: [['S#', '#E']], expect: false },
    { name: 'E in a sealed pocket', args: [['S....', '.###.', '.#E#.', '.###.', '.....']], expect: false },
    { name: 'winding corridor', args: [['S#...', '.#.#.', '.#.#.', '...#E']], expect: true },
    { name: 'single row, wall in between', args: [['S.#.E']], expect: false },
    { name: 'large open grid 60×60', args: [Array.from({ length: 60 }, (_, r) => Array.from({ length: 60 }, (_, c) => (r === 0 && c === 0) ? 'S' : (r === 59 && c === 59) ? 'E' : '.').join(''))], expect: true },
    { name: 'S in the bottom-right, E top-left', args: [['E..', '...', '..S']], expect: true }
  ],
  antiSolutions: [
    { name: 'allows diagonal moves', code: 'function canExit(grid) { const R = grid.length, C = grid[0].length; let s; for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (grid[r][c] === "S") s = [r, c]; const seen = new Set([s.join()]), q = [s]; while (q.length) { const [r, c] = q.shift(); if (grid[r][c] === "E") return true; for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]) { const nr = r + dr, nc = c + dc; if (nr < 0 || nr >= R || nc < 0 || nc >= C || grid[nr][nc] === "#" || seen.has(nr + "," + nc)) continue; seen.add(nr + "," + nc); q.push([nr, nc]); } } return false; }' },
    { name: 'visited set of arrays (never matches)', code: 'function canExit(grid) { const R = grid.length, C = grid[0].length; let s; for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (grid[r][c] === "S") s = [r, c]; const seen = new Set([s]), q = [s]; while (q.length) { const [r, c] = q.shift(); if (grid[r][c] === "E") return true; for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nr = r + dr, nc = c + dc; if (nr < 0 || nr >= R || nc < 0 || nc >= C || grid[nr][nc] === "#" || seen.has([nr, nc])) continue; seen.add([nr, nc]); q.push([nr, nc]); } } return false; }' }
  ],
  hints: [
    '<p>Find S with a double loop. Then it’s Exercise 2.1 with computed neighbors.</p>',
    '<p>Neighbors of (r, c): the four (r+dr, c+dc) that are in bounds and not <code>#</code>.</p>',
    '<p>Visited: <code>new Set()</code> of <code>r + "," + c</code> strings. Mark on enqueue.</p>',
    '<p>When you dequeue a cell and <code>grid[r][c] === "E"</code>, return true. Return false when the queue empties.</p>'
  ],
  solution: `
function canExit(grid) {
  const rows = grid.length, cols = grid[0].length;
  let start = null;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (grid[r][c] === 'S') start = [r, c];
  if (!start) return false;

  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const key = (r, c) => r + ',' + c;
  const visited = new Set([key(start[0], start[1])]);
  const queue = [start];
  while (queue.length) {
    const [r, c] = queue.shift();
    if (grid[r][c] === 'E') return true;
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;   // bounds
      if (grid[nr][nc] === '#' || visited.has(key(nr, nc))) continue;
      visited.add(key(nr, nc));
      queue.push([nr, nc]);
    }
  }
  return false;
}`,
  solutionExplain: '<p>The only grid-specific lines are the S search, the DIRS loop, and the bounds check. Everything else is the BFS you already wrote — which is the point.</p>',
  complexity: '<p>“O(R·C) time and space: each cell is enqueued at most once and has at most four neighbors.”</p>',
  followUp: {
    q: 'Follow-up: “Return the minimum number of moves, or -1.” What changes?',
    choices: ['Switch to DFS', 'Store the distance alongside each cell in the queue (<code>[r, c, d]</code>) — BFS guarantees the first arrival at E is minimal', 'Run the search from E instead', 'Count the open cells'],
    answer: 1,
    explain: '<p>Same BFS, plus a distance per queue entry (or a level-by-level loop). This is the grid version of Exercise 2.2.</p>'
  }
})}
`
      },

      /* ------------------------------------------------ 2.6 ------ */
      {
        type: 'quiz',
        title: 'Quiz: graph traversal',
        intro: '<p>The module that matters most. Eight questions — aim for all of them.</p>',
        questions: [
          { q: '“Find the fewest transfer hops between two accounts.” Which is correct?', choices: ['DFS, returning the first path found', 'BFS, because it discovers nodes in order of hop distance', 'Sort transfers by amount', 'Either DFS or BFS — same result'], answer: 1,
            explain: '<p>“Fewest” in an unweighted graph is BFS. DFS finds <em>a</em> path.</p>' },
          { q: 'Why does BFS find shortest paths in unweighted graphs?', choices: ['Because it uses a queue, which is faster', 'Because nodes are dequeued in non-decreasing distance order, so a node’s first discovery is via a shortest route', 'Because it visits every node', 'It doesn’t — Dijkstra is required'], answer: 1,
            explain: '<p>That sentence is the proof. Dijkstra generalizes it to non-negative weights.</p>' },
          { q: 'Which is the correct place to mark a node visited in BFS?', choices: ['When it is dequeued', 'When it is enqueued (discovered)', 'When all its neighbors are processed', 'Only when it equals the target'], answer: 1,
            explain: '<p>Invariant: every node in the queue has been discovered exactly once. Marking late allows duplicate entries.</p>' },
          { q: 'In a directed graph, DFS reaches a node that has already been fully explored. This means…', choices: ['A cycle', 'Nothing by itself — it’s a cycle only if the node is still on the current DFS path', 'The graph is disconnected', 'The algorithm is broken'], answer: 1,
            explain: '<p>Diamond shapes revisit finished nodes without any cycle. Grey vs black.</p>' },
          { q: 'How do you reconstruct the path after BFS reaches the destination?', choices: ['Re-run BFS backwards', 'Walk a <code>parent</code> map from destination back to source and reverse', 'Keep the whole visited set; it is the path', 'DFS from the destination'], answer: 1,
            explain: '<p><code>parent.set(next, node)</code> at enqueue time; then a loop from the destination until <code>parent.get(cur)</code> is undefined.</p>' },
          { q: 'Transfers are given as A→B pairs. The interviewer asks “can B reach A?” with only <code>[["A","B"]]</code>. Your code says true. What went wrong?', choices: ['Nothing; reachability is symmetric', 'The adjacency list was built undirected (both A→B and B→A were added)', 'The visited set was missing', 'BFS was used instead of DFS'], answer: 1,
            explain: '<p>Confusing directed and undirected edges. Ask, then build accordingly.</p>' },
          { q: 'What is the complexity of DFS/BFS on a graph with V nodes and E edges, and how do you say it for accounts and transfers?', choices: ['O(V · E)', 'O(V + E): “linear in the number of accounts plus transfers, each processed once”', 'O(V log V)', 'O(E²)'], answer: 1,
            explain: '<p>Always in the problem’s entities.</p>' },
          { q: 'A grid BFS never terminates. The most likely cause?', choices: ['The grid is too large', 'The visited set stores <code>[r, c]</code> arrays, which are compared by reference, so nothing is ever “visited”', 'Using BFS instead of DFS', 'The DIRS list has 4 entries'], answer: 1,
            explain: '<p>Use string keys or a 2-D boolean array.</p>' }
        ]
      }
    ]
  });
})();
