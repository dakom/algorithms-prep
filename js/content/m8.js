/* Module 8 — Final Mixed Interview */
(function () {
  const { code, callout, diagram, widget } = window.T;

  const txHarness = () => ({
    adj(txs, minAmount) {
      const m = new Map();
      for (const t of txs) {
        if (minAmount !== undefined && t.amount < minAmount) continue;
        if (!m.has(t.from)) m.set(t.from, []);
        if (!m.has(t.to)) m.set(t.to, []);
        m.get(t.from).push(t.to);
      }
      return m;
    },
    dist(txs, src, minAmount) {
      const adj = this.adj(txs, minAmount), d = new Map([[src, 0]]), q = [src];
      while (q.length) { const u = q.shift(); for (const v of adj.get(u) || []) if (!d.has(v)) { d.set(v, d.get(u) + 1); q.push(v); } }
      return d;
    },
    isPath(txs, path, minAmount) {
      const adj = this.adj(txs, minAmount);
      for (let i = 0; i + 1 < path.length; i++) if (!(adj.get(path[i]) || []).includes(path[i + 1])) return false;
      return true;
    }
  });
  const pathCheck = (out, args, H) => {
    const [txs, src, dst, minAmount] = args;
    const d = H.dist(txs, src, minAmount);
    if (!d.has(dst)) return { ok: out === null, expected: 'null — unreachable' };
    const want = d.get(dst) + 1;
    if (!Array.isArray(out)) return { ok: false, expected: 'an array of ' + want + ' account(s)' };
    const ok = out.length === want && out[0] === src && out[out.length - 1] === dst && H.isPath(txs, out, minAmount);
    return { ok, expected: 'a valid chain of length ' + want + ' from ' + src + ' to ' + dst + (out.length > want ? ' (yours has ' + out.length + ')' : '') };
  };
  const T = (from, to, amount) => ({ from, to, amount });
  const NET = [T('A', 'B', 10), T('B', 'C', 15), T('A', 'D', 20), T('D', 'C', 5), T('C', 'E', 50), T('E', 'A', 3), T('X', 'Y', 99)];

  window.MODULES.push({
    title: 'Final Mixed Interview',
    blurb: 'A timed, four-part problem where the pattern is not announced',
    minutes: 20,
    sections: [

      /* ------------------------------------------------ 8.1 ------ */
      {
        type: 'read',
        title: 'Rules of the mock',
        minutes: 2,
        html: `
<p>This is the dress rehearsal. One problem, four requirement changes, <strong>20 minutes</strong> for all of it. Nobody tells you which pattern it is — the reasoning questions are deliberately open.</p>
<ul>
<li>The clock in the exercise header is your interview timer. Stay under 20 minutes total.</li>
<li>Hints are labelled “Ask interviewer”. Real interviewers give hints; they also notice. Each one after the first costs rubric points.</li>
<li>Write the explanation answers <em>as you'd say them</em>. Short, structured, entities-first.</li>
<li>Requirements accumulate in one editor. Keep earlier functions working — the later parts reuse them.</li>
<li>After each part, the reference appears. Skim it, but don't copy it into the next part — adapt <em>your</em> code.</li>
</ul>
${callout('say', 'Your opening line, whatever the problem is', `<p>“Let me restate: … The entities are … and the relationship is … The output is [a boolean / a path / a count], so I’m thinking … Before I code — are transfers directed, and can I assume the input fits in memory?”</p>`)}
`
      },

      /* ------------------------------------------------ 8.2 ------ */
      {
        type: 'project',
        title: 'Mock: suspicious transfer network',
        minutes: 20,
        checklist: [
          'Restated the problem and named the entities before answering the reasoning questions',
          'Finished all four parts under 20 minutes',
          'Used at most one “ask interviewer”',
          'Part 2 → part 3 → part 4 each changed only one layer of the code'
        ],
        html: `
${widget('exercise', {
  id: 'ex-8-1',
  title: 'Suspicious transfer network',
  time: 20,
  interview: true,
  fn: 'canTransferReach',
  harness: txHarness,
  prompt: `<p>Your fraud team gives you a list of transactions:</p>
${code('js', 'input shape', `[
  { from: "A", to: "B", amount: 10 },
  { from: "B", to: "C", amount: 15 },
  { from: "A", to: "D", amount: 20 },
  { from: "D", to: "C", amount: 5 }
]`)}
<p>The requirements will change four times. Keep all functions in the editor.</p>`,
  starter: `
// Part 1
function canTransferReach(transactions, source, destination) {

}`,
  stages: [
    {
      title: 'Part 1 · reachability',
      fn: 'canTransferReach',
      prompt: `<p>Implement <code>canTransferReach(transactions, source, destination)</code>: could money have flowed from <code>source</code> to <code>destination</code> through any sequence of transactions? An account reaches itself.</p>`,
      reasoning: [
        { type: 'text', cat: 'abstraction', q: 'Restate the problem: what are the entities, what is the relationship between them, and what exactly must you return?', min: 40,
          model: '<p>“Accounts are the entities; each transaction is a directed relationship from one account to another. I need to return whether a path of transactions exists from source to destination — a boolean, an existence question.”</p>' },
        { cat: 'algorithm', q: 'Which approach?', choices: ['Sort transactions by amount and scan', 'Build an adjacency list (from → [to…]) and run DFS or BFS from the source with a visited set; return true if the destination is reached', 'Count transactions per account in a Map and compare', 'A min-heap of transactions'], answer: 1,
          explain: '<p>Entities connected to entities + “could money have flowed” = graph reachability.</p>' },
        { cat: 'complexity', q: 'Complexity, in the problem’s own terms?', choices: ['O(A + T) — accounts plus transactions, each processed once', 'O(T²)', 'O(T log T)', 'O(A · T)'], answer: 0,
          explain: '<p>V = accounts, E = transactions.</p>' }
      ],
      tests: [
        { name: 'direct', args: [NET, 'A', 'B'], expect: true },
        { name: 'multi-hop (A → D → C → E)', args: [NET, 'A', 'E'], expect: true },
        { name: 'direction matters', args: [NET, 'B', 'A'], expect: true },
        { name: 'no route into the X/Y component', args: [NET, 'A', 'Y'], expect: false },
        { name: 'reverse direction not allowed', args: [NET, 'Y', 'X'], expect: false },
        { name: 'source equals destination', args: [NET, 'C', 'C'], expect: true },
        { name: 'unknown source', args: [NET, 'Q', 'A'], expect: false },
        { name: 'cycle A→B→C→E→A must terminate', args: [NET, 'A', 'Z'], expect: false },
        { name: 'empty transactions', args: [[], 'A', 'B'], expect: false }
      ],
      antiSolutions: [
        { name: 'no visited set', code: 'function canTransferReach(txs, s, d) { const adj = new Map(); for (const t of txs) { if (!adj.has(t.from)) adj.set(t.from, []); adj.get(t.from).push(t.to); } const st = [s]; while (st.length) { const n = st.pop(); if (n === d) return true; for (const x of adj.get(n) ?? []) st.push(x); } return false; }' }
      ],
      hints: [
        '<p>What connects two accounts? Build that structure first.</p>',
        '<p>Adjacency list from → [to], then DFS/BFS with a visited Set; <code>adj.get(node) ?? []</code>.</p>'
      ],
      solution: `
function buildAdj(transactions, minAmount = -Infinity) {
  const adj = new Map();
  for (const { from, to, amount } of transactions) {
    if (amount < minAmount) continue;
    if (!adj.has(from)) adj.set(from, []);
    if (!adj.has(to)) adj.set(to, []);
    adj.get(from).push(to);
  }
  return adj;
}

function canTransferReach(transactions, source, destination) {
  const adj = buildAdj(transactions);
  const visited = new Set([source]);
  const stack = [source];
  while (stack.length) {
    const node = stack.pop();
    if (node === destination) return true;
    for (const next of adj.get(node) ?? []) {
      if (!visited.has(next)) { visited.add(next); stack.push(next); }
    }
  }
  return false;
}`,
      solutionExplain: '<p>The reference already extracts <code>buildAdj</code> with an optional <code>minAmount</code> — you don’t know part 3 is coming, but separating “build the graph” from “traverse it” is what makes the later parts one-line changes.</p>',
      complexity: '<p>“O(A + T) time and space.”</p>'
    },
    {
      title: 'Part 2 · shortest chain',
      fn: 'shortestTransferChain',
      prompt: `<p>Change: the team wants to <em>see</em> the chain. Implement <code>shortestTransferChain(transactions, source, destination)</code> returning the shortest list of accounts from source to destination (inclusive), or <code>null</code>. Source equals destination → <code>[source]</code>.</p>`,
      reasoning: [
        { cat: 'algorithm', q: 'What changes versus part 1?', choices: ['Nothing — return the visited set', 'Two things: BFS instead of DFS (shortest in hops), and a parent map so the path can be rebuilt backwards from the destination', 'Sort transactions by amount', 'Use recursion'], answer: 1,
          explain: '<p>“Shortest” → BFS. “See the chain” → parent map + reconstruction. Mark visited on enqueue.</p>' },
        { type: 'text', cat: 'explanation', q: 'Say in one or two sentences why BFS guarantees the shortest chain.', min: 30,
          model: '<p>“BFS dequeues accounts in non-decreasing hop distance, so the first time the destination is discovered it is via a route with the minimum number of hops; recording each node’s parent at discovery time therefore records a shortest path.”</p>' }
      ],
      tests: [
        { name: 'shortest of two routes (A→D→C beats A→B→C? equal length — either)', args: [NET, 'A', 'C'] },
        { name: 'longer chain A → ? → E', args: [NET, 'A', 'E'] },
        { name: 'direct', args: [NET, 'X', 'Y'] },
        { name: 'unreachable → null', args: [NET, 'A', 'Y'] },
        { name: 'source equals destination', args: [NET, 'D', 'D'] },
        { name: 'through the cycle: E → A → B', args: [NET, 'E', 'B'] },
        { name: 'shorter route listed later', args: [[T('A', 'B', 1), T('B', 'C', 1), T('C', 'D', 1), T('A', 'D', 1)], 'A', 'D'] },
        { name: 'part 1 still works (canTransferReach kept)', desc: 'Calls canTransferReach on the same network for A→E (true) and A→Y (false).', args: [NET], run: (fn, H, net) => { const f = H.fns.canTransferReach; if (typeof f !== 'function') throw new Error('canTransferReach is no longer defined — keep part 1 in the editor'); return [f(net, 'A', 'E'), f(net, 'A', 'Y')]; }, expect: [true, false] }
      ],
      check: pathCheck,
      hints: [
        '<p>Queue + visited (mark on enqueue) + <code>parent.set(next, node)</code>.</p>',
        '<p>When you dequeue the destination: walk <code>parent</code> back to the source, reverse.</p>'
      ],
      solution: `
function buildAdj(transactions, minAmount = -Infinity) {
  const adj = new Map();
  for (const { from, to, amount } of transactions) {
    if (amount < minAmount) continue;
    if (!adj.has(from)) adj.set(from, []);
    if (!adj.has(to)) adj.set(to, []);
    adj.get(from).push(to);
  }
  return adj;
}

function canTransferReach(transactions, source, destination) {
  const adj = buildAdj(transactions);
  const visited = new Set([source]);
  const stack = [source];
  while (stack.length) {
    const node = stack.pop();
    if (node === destination) return true;
    for (const next of adj.get(node) ?? []) {
      if (!visited.has(next)) { visited.add(next); stack.push(next); }
    }
  }
  return false;
}

function shortestTransferChain(transactions, source, destination) {
  const adj = buildAdj(transactions);
  const parent = new Map();
  const visited = new Set([source]);
  const queue = [source];
  while (queue.length) {
    const node = queue.shift();
    if (node === destination) {
      const path = [];
      for (let cur = destination; cur !== undefined; cur = parent.get(cur)) path.push(cur);
      return path.reverse();
    }
    for (const next of adj.get(node) ?? []) {
      if (!visited.has(next)) { visited.add(next); parent.set(next, node); queue.push(next); }
    }
  }
  return null;
}`,
      solutionExplain: '<p>Part 1 is untouched; part 2 is a new function sharing <code>buildAdj</code>.</p>',
      complexity: '<p>“Still O(A + T); O(A) extra for the parent map.”</p>'
    },
    {
      title: 'Part 3 · minimum amount',
      fn: 'shortestTransferChain',
      prompt: `<p>Change: “transfers below a minimum amount are noise — ignore them.” Add an optional 4th parameter: <code>shortestTransferChain(transactions, source, destination, minAmount)</code>. Transactions with <code>amount &lt; minAmount</code> don't count as edges. Without the parameter, behavior is unchanged.</p>`,
      reasoning: [
        { cat: 'algorithm', q: 'Where does the change belong?', choices: ['In the path reconstruction', 'While building the adjacency list (skip small transactions) — or equivalently when iterating neighbors; the traversal itself is unchanged', 'Sort transactions by amount first', 'Run BFS twice'], answer: 1,
          explain: '<p>The graph changes; the algorithm doesn’t. One filter line, ideally in the graph-building function everything shares.</p>' },
        { type: 'text', cat: 'explanation', q: 'What do you say to the interviewer as you make this change?', min: 20,
          model: '<p>“This only changes which edges exist, so I’ll add the threshold to the adjacency-list builder and leave the BFS alone. I’ll default the parameter so the earlier behavior is preserved.”</p>' }
      ],
      tests: [
        { name: 'threshold removes the A→D→C route (D→C is 5)', args: [NET, 'A', 'C', 10] },
        { name: 'threshold makes E unreachable from A? (C→E is 50, fine) — check A→E at min 10', args: [NET, 'A', 'E', 10] },
        { name: 'threshold cuts everything → null', args: [NET, 'A', 'B', 100] },
        { name: 'minAmount omitted → unchanged', args: [NET, 'A', 'C'] },
        { name: 'equal to threshold still counts', args: [[T('A', 'B', 10)], 'A', 'B', 10] },
        { name: 'source equals destination regardless of threshold', args: [NET, 'A', 'A', 1000] },
        { name: 'only the small edge exists → null', args: [[T('A', 'B', 1)], 'A', 'B', 2] }
      ],
      check: pathCheck,
      antiSolutions: [
        { name: 'ignores minAmount', code: 'function shortestTransferChain(txs, s, d) { const adj = new Map(); for (const t of txs) { if (!adj.has(t.from)) adj.set(t.from, []); adj.get(t.from).push(t.to); } const p = new Map(), seen = new Set([s]), q = [s]; while (q.length) { const n = q.shift(); if (n === d) { const path = []; for (let c = d; c !== undefined; c = p.get(c)) path.push(c); return path.reverse(); } for (const x of adj.get(n) ?? []) if (!seen.has(x)) { seen.add(x); p.set(x, n); q.push(x); } } return null; }' }
      ],
      hints: [
        '<p>Add <code>minAmount = -Infinity</code> (default) to the signature and skip transactions with <code>amount &lt; minAmount</code> when building the graph.</p>'
      ],
      solution: `
function buildAdj(transactions, minAmount = -Infinity) {
  const adj = new Map();
  for (const { from, to, amount } of transactions) {
    if (amount < minAmount) continue;                 // part 3: filter edges here
    if (!adj.has(from)) adj.set(from, []);
    if (!adj.has(to)) adj.set(to, []);
    adj.get(from).push(to);
  }
  return adj;
}

function canTransferReach(transactions, source, destination) {
  const adj = buildAdj(transactions);
  const visited = new Set([source]);
  const stack = [source];
  while (stack.length) {
    const node = stack.pop();
    if (node === destination) return true;
    for (const next of adj.get(node) ?? []) {
      if (!visited.has(next)) { visited.add(next); stack.push(next); }
    }
  }
  return false;
}

function shortestTransferChain(transactions, source, destination, minAmount = -Infinity) {
  const adj = buildAdj(transactions, minAmount);
  const parent = new Map();
  const visited = new Set([source]);
  const queue = [source];
  while (queue.length) {
    const node = queue.shift();
    if (node === destination) {
      const path = [];
      for (let cur = destination; cur !== undefined; cur = parent.get(cur)) path.push(cur);
      return path.reverse();
    }
    for (const next of adj.get(node) ?? []) {
      if (!visited.has(next)) { visited.add(next); parent.set(next, node); queue.push(next); }
    }
  }
  return null;
}`,
      solutionExplain: '<p>Two lines changed. If your part-2 code built the graph inline, this is the moment you notice why a separate builder was worth it — say so; interviewers love hearing you refactor for the <em>next</em> change.</p>',
      complexity: '<p>“Unchanged: O(A + T).”</p>'
    },
    {
      title: 'Part 4 · count reachable',
      fn: 'countReachable',
      prompt: `<p>Change: “how big is the network around a suspicious account?” Implement <code>countReachable(transactions, source, minAmount)</code>: the number of <em>other</em> accounts reachable from <code>source</code> using transactions of at least <code>minAmount</code> (optional, default no threshold).</p>`,
      reasoning: [
        { cat: 'algorithm', q: 'Which output type is this, and what does it change in the traversal?', choices: ['Shortest path — needs parents', 'A count — same traversal, no early exit, answer is <code>visited.size − 1</code>', 'Existence — return on first hit', 'Top K — heap'], answer: 1,
          explain: '<p>The core traversal doesn’t change. Don’t stop early; the visited set is the answer (minus the source).</p>' }
      ],
      tests: [
        { name: 'from A, no threshold (B, C, D, E)', args: [NET, 'A'], expect: 4 },
        { name: 'from A with threshold 10 (D→C too small, but A→B→C works)', args: [NET, 'A', 10], expect: 4 },
        { name: 'from A with threshold 20 (only A→D, C→E; D→C cut) ', args: [NET, 'A', 20], expect: 1 },
        { name: 'isolated component', args: [NET, 'X'], expect: 1 },
        { name: 'sink account', args: [NET, 'Y'], expect: 0 },
        { name: 'unknown account', args: [NET, 'Q'], expect: 0 },
        { name: 'cycle does not inflate the count', args: [[T('A', 'B', 1), T('B', 'A', 1)], 'A'], expect: 1 },
        { name: 'threshold cuts everything', args: [NET, 'A', 1000], expect: 0 }
      ],
      antiSolutions: [
        { name: 'counts the source', code: 'function countReachable(txs, s, m = -Infinity) { const adj = new Map(); for (const t of txs) { if (t.amount < m) continue; if (!adj.has(t.from)) adj.set(t.from, []); adj.get(t.from).push(t.to); } const seen = new Set([s]), st = [s]; while (st.length) { const n = st.pop(); for (const x of adj.get(n) ?? []) if (!seen.has(x)) { seen.add(x); st.push(x); } } return seen.size; }' }
      ],
      hints: [
        '<p>Copy the part-1 traversal, remove the early return, and return <code>visited.size - 1</code>.</p>'
      ],
      solution: `
function buildAdj(transactions, minAmount = -Infinity) {
  const adj = new Map();
  for (const { from, to, amount } of transactions) {
    if (amount < minAmount) continue;
    if (!adj.has(from)) adj.set(from, []);
    if (!adj.has(to)) adj.set(to, []);
    adj.get(from).push(to);
  }
  return adj;
}

function canTransferReach(transactions, source, destination) {
  const adj = buildAdj(transactions);
  const visited = new Set([source]);
  const stack = [source];
  while (stack.length) {
    const node = stack.pop();
    if (node === destination) return true;
    for (const next of adj.get(node) ?? []) {
      if (!visited.has(next)) { visited.add(next); stack.push(next); }
    }
  }
  return false;
}

function shortestTransferChain(transactions, source, destination, minAmount = -Infinity) {
  const adj = buildAdj(transactions, minAmount);
  const parent = new Map();
  const visited = new Set([source]);
  const queue = [source];
  while (queue.length) {
    const node = queue.shift();
    if (node === destination) {
      const path = [];
      for (let cur = destination; cur !== undefined; cur = parent.get(cur)) path.push(cur);
      return path.reverse();
    }
    for (const next of adj.get(node) ?? []) {
      if (!visited.has(next)) { visited.add(next); parent.set(next, node); queue.push(next); }
    }
  }
  return null;
}

function countReachable(transactions, source, minAmount = -Infinity) {
  const adj = buildAdj(transactions, minAmount);
  const visited = new Set([source]);
  const stack = [source];
  while (stack.length) {
    const node = stack.pop();
    for (const next of adj.get(node) ?? []) {
      if (!visited.has(next)) { visited.add(next); stack.push(next); }
    }
  }
  return visited.size - 1;              // exclude the source itself
}`,
      solutionExplain: '<p>Four requirements, one graph builder, three traversals that differ only in <em>when they stop</em> and <em>what they return</em>. That is the shape of nearly every graph interview: recognize, build, traverse, adapt the output.</p>',
      complexity: '<p>“O(A + T) each; the whole session never left linear time.”</p>',
      followUp: {
        type: 'text',
        q: 'Last question from the interviewer: “The transaction list has 50 million rows and doesn’t fit in memory. What changes?”',
        model: '<p>“The traversal is the same; the adjacency list becomes a query. Store transactions in a database indexed on <code>from</code> (and amount), and have the traversal fetch neighbors on demand — BFS with a visited set of account IDs, which is much smaller than the transaction list. Batch the neighbor lookups per BFS level to avoid one query per node, and cap the depth or visited size for hostile inputs. If it’s an offline analysis, a graph database or a MapReduce-style connected-components job is the heavier tool.”</p>'
      }
    }
  ]
})}
`
      },

      /* ------------------------------------------------ 8.3 ------ */
      {
        type: 'project',
        title: 'Mock 2: merchant spend',
        minutes: 20,
        checklist: [
          'Named the pattern for each part before coding (aggregate → top-K → stateful → sort + window)',
          'Reused part 1 inside part 3 instead of rewriting it',
          'Finished under 20 minutes'
        ],
        html: `
<p>A second dress rehearsal with a different pattern family — so the reflex isn't just “it's probably a graph”. Same rules: 20 minutes, four parts, the pattern is not announced.</p>

${widget('exercise', {
  id: 'ex-8-2',
  title: 'Merchant spend analytics',
  time: 20,
  interview: true,
  fn: 'spendByMerchant',
  prompt: `<p>A card-processing team gives you transactions:</p>
${code('js', 'input shape', `[
  { merchant: "coffee", amount: 4,   time: 1000 },
  { merchant: "grocer", amount: 82,  time: 2000 },
  { merchant: "coffee", amount: 5,   time: 3000 }
]`)}
<p><code>time</code> is milliseconds; the input is <em>not</em> sorted. Requirements change four times; keep everything in the editor.</p>`,
  starter: `
// Part 1
function spendByMerchant(transactions) {

}`,
  stages: [
    {
      title: 'Part 1 · totals',
      fn: 'spendByMerchant',
      prompt: `<p>Implement <code>spendByMerchant(transactions)</code>: total amount per merchant, as a plain object (a Map is accepted).</p>`,
      reasoning: [
        { type: 'text', cat: 'abstraction', q: 'Restate: entities, relationship, output?', min: 30,
          model: '<p>“Entities are transactions with a merchant key; the output is one total per merchant — an aggregation, so a Map from merchant to running sum. O(n).”</p>' },
        { cat: 'algorithm', q: 'Approach?', choices: ['Sort by merchant, then scan groups', 'One pass with a Map, accumulating with a default of 0', 'Nested loops', 'A heap'], answer: 1,
          explain: '<p>Sorting works but costs O(n log n) for no gain.</p>' }
      ],
      tests: [
        { name: 'example', args: [[{ merchant: 'coffee', amount: 4, time: 1000 }, { merchant: 'grocer', amount: 82, time: 2000 }, { merchant: 'coffee', amount: 5, time: 3000 }]], expect: { coffee: 9, grocer: 82 } },
        { name: 'empty', args: [[]], expect: {} },
        { name: 'refunds net out', args: [[{ merchant: 'a', amount: 10, time: 1 }, { merchant: 'a', amount: -10, time: 2 }]], expect: { a: 0 } },
        { name: 'many merchants', args: [Array.from({ length: 300 }, (_, i) => ({ merchant: 'm' + (i % 3), amount: 1, time: i }))], expect: { m0: 100, m1: 100, m2: 100 } }
      ],
      hints: ['<p><code>(totals.get(m) ?? 0) + amount</code>.</p>'],
      solution: `
function spendByMerchant(transactions) {
  const totals = new Map();
  for (const { merchant, amount } of transactions) {
    totals.set(merchant, (totals.get(merchant) ?? 0) + amount);
  }
  return Object.fromEntries(totals);
}`,
      complexity: '<p>“O(n) time, O(m) space for m merchants.”</p>'
    },
    {
      title: 'Part 2 · top merchants',
      fn: 'topMerchants',
      prompt: `<p>Implement <code>topMerchants(transactions, k)</code>: the <code>k</code> merchants with the highest total spend, highest first. Fewer than <code>k</code> merchants → all of them. No ties in the tests.</p>`,
      reasoning: [
        { cat: 'abstraction', q: 'Which two patterns?', choices: ['Graph + BFS', 'Aggregate (reuse part 1), then rank: sort or a size-k min-heap', 'Sort + intervals', 'Set + binary search'], answer: 1,
          explain: '<p>Say “reuse part 1” out loud.</p>' },
        { type: 'text', cat: 'complexity', q: 'Complexity of sort-based vs heap-based ranking, in the problem’s terms?', min: 30,
          model: '<p>“Aggregation is O(n). Sorting the m merchant totals is O(m log m); a min-heap of size k is O(m log k). For a one-off query with small m, sorting is the right first answer.”</p>' }
      ],
      tests: [
        { name: 'top 2', args: [[{ merchant: 'a', amount: 5, time: 1 }, { merchant: 'b', amount: 50, time: 2 }, { merchant: 'c', amount: 20, time: 3 }, { merchant: 'a', amount: 30, time: 4 }], 2], expect: ['b', 'a'] },
        { name: 'many small beat one big', args: [[{ merchant: 'big', amount: 60, time: 1 }, { merchant: 'small', amount: 40, time: 2 }, { merchant: 'small', amount: 40, time: 3 }], 1], expect: ['small'] },
        { name: 'k larger than merchants', args: [[{ merchant: 'a', amount: 1, time: 1 }, { merchant: 'b', amount: 2, time: 2 }], 5], expect: ['b', 'a'] },
        { name: 'k = 0', args: [[{ merchant: 'a', amount: 1, time: 1 }], 0], expect: [] },
        { name: 'empty', args: [[], 3], expect: [] },
        { name: 'part 1 still works', args: [[{ merchant: 'x', amount: 2, time: 1 }, { merchant: 'x', amount: 3, time: 2 }]], run: (fn, H, txs) => { const f = H.fns.spendByMerchant; if (typeof f !== 'function') throw new Error('spendByMerchant is gone — keep part 1'); return f(txs); }, expect: { x: 5 } }
      ],
      hints: ['<p><code>Object.entries(spendByMerchant(transactions)).sort((a, b) => b[1] - a[1]).slice(0, k).map(([m]) => m)</code>.</p>'],
      solution: `
function spendByMerchant(transactions) {
  const totals = new Map();
  for (const { merchant, amount } of transactions) {
    totals.set(merchant, (totals.get(merchant) ?? 0) + amount);
  }
  return Object.fromEntries(totals);
}

function topMerchants(transactions, k) {
  return Object.entries(spendByMerchant(transactions))
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([merchant]) => merchant);
}`,
      complexity: '<p>“O(n + m log m).”</p>'
    },
    {
      title: 'Part 3 · a live tracker',
      fn: 'SpendTracker',
      isClass: true,
      prompt: `<p>Change: transactions now arrive one at a time. Implement <code>class SpendTracker</code> with <code>record(transaction)</code>, <code>total(merchant)</code> (0 if unknown), <code>top(k)</code> (same semantics as part 2, computed from everything recorded so far) and <code>history(merchant)</code> (the recorded transactions for that merchant in arrival order — return a copy).</p>`,
      reasoning: [
        { cat: 'abstraction', q: 'What state does the class hold?', choices: ['An array of all transactions, re-aggregated on every call', 'A running <code>Map&lt;merchant, total&gt;</code> updated on record (O(1)), plus a <code>Map&lt;merchant, transaction[]&gt;</code> for history; <code>top(k)</code> ranks the totals map', 'A heap of transactions', 'A Set of merchants'], answer: 1,
          explain: '<p>The aggregation becomes long-lived state; the ranking runs per query. Same layers as before, different lifetime.</p>' },
        { type: 'text', cat: 'explanation', q: 'What changes in the trade-offs when this becomes a class with queries?', min: 30,
          model: '<p>“Recording is now O(1) and totals are always current, while <code>top(k)</code> is O(m log m) per query. If queries are frequent and merchants numerous I’d maintain a sorted structure incrementally; for now the simple version is correct and I’d say so.”</p>' }
      ],
      tests: [
        { name: 'record then total', run: (ST) => { const t = new ST(); t.record({ merchant: 'a', amount: 5, time: 1 }); t.record({ merchant: 'a', amount: 7, time: 2 }); return [t.total('a'), t.total('zzz')]; }, expect: [12, 0] },
        { name: 'top(k) over recorded data', run: (ST) => { const t = new ST(); t.record({ merchant: 'a', amount: 5, time: 1 }); t.record({ merchant: 'b', amount: 50, time: 2 }); t.record({ merchant: 'c', amount: 20, time: 3 }); t.record({ merchant: 'a', amount: 30, time: 4 }); return [t.top(2), t.top(10)]; }, expect: [['b', 'a'], ['b', 'a', 'c']] },
        { name: 'history in arrival order, copy', run: (ST) => { const t = new ST(); t.record({ merchant: 'a', amount: 1, time: 5 }); t.record({ merchant: 'b', amount: 2, time: 6 }); t.record({ merchant: 'a', amount: 3, time: 7 }); const h = t.history('a'); h.push({ merchant: 'a', amount: 999, time: 9 }); return [t.history('a').map(x => x.amount), t.history('nobody')]; }, expect: [[1, 3], []] },
        { name: 'empty tracker', run: (ST) => { const t = new ST(); return [t.top(3), t.total('a')]; }, expect: [[], 0] },
        { name: 'instances independent', run: (ST) => { const a = new ST(), b = new ST(); a.record({ merchant: 'x', amount: 1, time: 1 }); return b.total('x'); }, expect: 0 }
      ],
      hints: ['<p>Two Maps in the constructor. <code>record</code> updates both; <code>top</code> sorts <code>[...this.totals]</code>.</p>'],
      solution: `
function spendByMerchant(transactions) {
  const totals = new Map();
  for (const { merchant, amount } of transactions) {
    totals.set(merchant, (totals.get(merchant) ?? 0) + amount);
  }
  return Object.fromEntries(totals);
}

function topMerchants(transactions, k) {
  return Object.entries(spendByMerchant(transactions))
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([merchant]) => merchant);
}

class SpendTracker {
  constructor() {
    this.totals = new Map();           // merchant → total
    this.byMerchant = new Map();       // merchant → transactions[]
  }
  record(tx) {
    this.totals.set(tx.merchant, (this.totals.get(tx.merchant) ?? 0) + tx.amount);
    if (!this.byMerchant.has(tx.merchant)) this.byMerchant.set(tx.merchant, []);
    this.byMerchant.get(tx.merchant).push({ ...tx });
  }
  total(merchant) {
    return this.totals.get(merchant) ?? 0;
  }
  top(k) {
    return [...this.totals].sort((a, b) => b[1] - a[1]).slice(0, k).map(([m]) => m);
  }
  history(merchant) {
    return (this.byMerchant.get(merchant) ?? []).map(tx => ({ ...tx }));
  }
}`,
      complexity: '<p>“record O(1); total O(1); top O(m log m); history O(h).”</p>'
    },
    {
      title: 'Part 4 · burst detection',
      fn: 'burstyMerchants',
      prompt: `<p>Change: fraud wants merchants with suspicious bursts. Implement <code>burstyMerchants(transactions, windowMs, threshold)</code>: the merchants for which the total amount inside <em>some</em> window of <code>windowMs</code> (a closed interval <code>[t, t + windowMs]</code>) is <strong>strictly greater</strong> than <code>threshold</code>. Return them sorted alphabetically. Remember the input is unsorted.</p>`,
      reasoning: [
        { cat: 'abstraction', q: 'Which pattern?', choices: ['Graph', 'Group by merchant, sort each merchant’s transactions by time, then a sliding window over time: advance the right edge, shrink the left while the span exceeds windowMs, track the max sum', 'Heap of amounts', 'Binary search on amounts'], answer: 1,
          explain: '<p>Sort + window. The window is variable-size in count, fixed-size in time.</p>' },
        { type: 'text', cat: 'complexity', q: 'Complexity?', min: 20,
          model: '<p>“Grouping is O(n); sorting each group is O(n log n) overall; the two-pointer window is O(n) since each transaction enters and leaves once. O(n log n) total.”</p>' }
      ],
      tests: [
        { name: 'burst inside the window', args: [[{ merchant: 'a', amount: 60, time: 0 }, { merchant: 'a', amount: 60, time: 500 }, { merchant: 'b', amount: 60, time: 0 }, { merchant: 'b', amount: 60, time: 5000 }], 1000, 100], expect: ['a'] },
        { name: 'unsorted input', args: [[{ merchant: 'a', amount: 60, time: 500 }, { merchant: 'a', amount: 60, time: 0 }], 1000, 100], expect: ['a'] },
        { name: 'unsorted input must not create a false burst', args: [[{ merchant: 'a', amount: 60, time: 0 }, { merchant: 'a', amount: 60, time: 5000 }, { merchant: 'a', amount: 60, time: 2500 }], 1000, 100], expect: [] },
        { name: 'exactly at the threshold is not a burst', args: [[{ merchant: 'a', amount: 50, time: 0 }, { merchant: 'a', amount: 50, time: 10 }], 1000, 100], expect: [] },
        { name: 'window boundary is inclusive', args: [[{ merchant: 'a', amount: 60, time: 0 }, { merchant: 'a', amount: 60, time: 1000 }], 1000, 100], expect: ['a'] },
        { name: 'just outside the window', args: [[{ merchant: 'a', amount: 60, time: 0 }, { merchant: 'a', amount: 60, time: 1001 }], 1000, 100], expect: [] },
        { name: 'single big transaction is a burst', args: [[{ merchant: 'z', amount: 500, time: 0 }], 10, 100], expect: ['z'] },
        { name: 'several merchants, alphabetical', args: [[{ merchant: 'z', amount: 200, time: 0 }, { merchant: 'b', amount: 200, time: 0 }, { merchant: 'm', amount: 1, time: 0 }], 10, 100], expect: ['b', 'z'] },
        { name: 'empty', args: [[], 1000, 100], expect: [] },
        { name: 'window slides past an old spike', args: [[{ merchant: 'a', amount: 90, time: 0 }, { merchant: 'a', amount: 5, time: 2000 }, { merchant: 'a', amount: 5, time: 2500 }, { merchant: 'a', amount: 5, time: 3000 }], 1000, 100], expect: [] }
      ],
      antiSolutions: [{ name: 'forgets to sort by time', code: 'function burstyMerchants(txs, w, th) { const g = new Map(); for (const t of txs) { if (!g.has(t.merchant)) g.set(t.merchant, []); g.get(t.merchant).push(t); } const out = []; for (const [m, list] of g) { let l = 0, sum = 0, hit = false; for (let r = 0; r < list.length; r++) { sum += list[r].amount; while (list[r].time - list[l].time > w) { sum -= list[l].amount; l++; } if (sum > th) hit = true; } if (hit) out.push(m); } return out.sort(); }' }],
      hints: ['<p>Group by merchant (Map of arrays), sort each by <code>time</code>.</p>', '<p>Two pointers per merchant: add <code>list[r]</code>, then <code>while (list[r].time - list[l].time &gt; windowMs) { sum -= list[l].amount; l++; }</code>; check <code>sum &gt; threshold</code>.</p>'],
      solution: `
function spendByMerchant(transactions) {
  const totals = new Map();
  for (const { merchant, amount } of transactions) {
    totals.set(merchant, (totals.get(merchant) ?? 0) + amount);
  }
  return Object.fromEntries(totals);
}

function topMerchants(transactions, k) {
  return Object.entries(spendByMerchant(transactions))
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([merchant]) => merchant);
}

class SpendTracker {
  constructor() { this.totals = new Map(); this.byMerchant = new Map(); }
  record(tx) {
    this.totals.set(tx.merchant, (this.totals.get(tx.merchant) ?? 0) + tx.amount);
    if (!this.byMerchant.has(tx.merchant)) this.byMerchant.set(tx.merchant, []);
    this.byMerchant.get(tx.merchant).push({ ...tx });
  }
  total(merchant) { return this.totals.get(merchant) ?? 0; }
  top(k) { return [...this.totals].sort((a, b) => b[1] - a[1]).slice(0, k).map(([m]) => m); }
  history(merchant) { return (this.byMerchant.get(merchant) ?? []).map(tx => ({ ...tx })); }
}

function burstyMerchants(transactions, windowMs, threshold) {
  const byMerchant = new Map();
  for (const tx of transactions) {
    if (!byMerchant.has(tx.merchant)) byMerchant.set(tx.merchant, []);
    byMerchant.get(tx.merchant).push(tx);
  }
  const flagged = [];
  for (const [merchant, list] of byMerchant) {
    list.sort((a, b) => a.time - b.time);            // sort first…
    let left = 0, sum = 0, bursty = false;
    for (let right = 0; right < list.length; right++) {   // …then slide
      sum += list[right].amount;
      while (list[right].time - list[left].time > windowMs) { sum -= list[left].amount; left++; }
      if (sum > threshold) { bursty = true; break; }
    }
    if (bursty) flagged.push(merchant);
  }
  return flagged.sort();
}`,
      solutionExplain: '<p>Four parts, four patterns: aggregate → rank → stateful → sort + window. Notice what carried over: the Map of groups from part 1 is the skeleton of part 4. A mixed interview is testing whether you see the shared skeleton.</p>',
      complexity: '<p>“O(n log n) from sorting within groups; the window pass is O(n).”</p>',
      followUp: { type: 'text', q: 'Last question: “Transactions stream in; flag a burst the moment it happens.” What changes?',
        model: '<p>“Keep a per-merchant queue of recent transactions (like the rate limiter): on each arrival, append, evict from the front anything older than the window, maintain the running sum, and flag if it exceeds the threshold. Amortized O(1) per transaction, O(window size) memory per merchant — the same structure, kept live instead of recomputed.”</p>' }
    }
  ]
})}
`
      },

      /* ------------------------------------------------ 8.4 ------ */
      {
        type: 'read',
        title: 'Debrief',
        minutes: 3,
        html: `
<p>Check your rubric score above, then be honest about these:</p>
<table>
<tr><th>Habit</th><th>Ask yourself</th></tr>
<tr><td>Before coding</td><td>Did I name input, output, abstraction, structures, algorithm and complexity — in that order — before typing?</td></tr>
<tr><td>During coding</td><td>Meaningful names? Small functions (a separate graph builder)? No cleverness? Edge cases handled where they arise?</td></tr>
<tr><td>After coding</td><td>Did I trace one example by hand and name three tests: normal, edge, adversarial (cycle / empty / unknown account)?</td></tr>
<tr><td>Follow-ups</td><td>Did each change touch one layer? Could I say which layer out loud?</td></tr>
</table>
<p>If any answer is “no”, restart the mock (Restart exercise) tomorrow and do it clean. Spaced repetition beats one long session — a second run the next day is worth more than an extra hour today.</p>
${callout('tip', 'Where to go next', `<p>Module 9 has the optional topics (Dijkstra recognition, sliding window, binary search) if you have time. Module 10 is the cheat sheet and the timed pattern drill — do the drill the morning of the assessment.</p>`)}
`
      }
    ]
  });
})();
