/* Module 4 — Trees and Recursion */
(function () {
  const { code, callout, diagram, widget } = window.T;
  const N = (val, left = null, right = null) => ({ val, left, right });
  const chain = n => { let t = null; for (let i = n; i >= 1; i--) t = N('n' + i, t, null); return t; };

  window.MODULES.push({
    title: 'Trees & Recursion',
    blurb: 'Trees are graphs with rules — the same traversals, plus a base case',
    minutes: 20,
    sections: [

      /* ------------------------------------------------ 4.1 ------ */
      {
        type: 'read',
        title: 'Trees are graphs with stronger structure',
        minutes: 10,
        html: `
<p>A tree is a graph with rules: one <strong>root</strong>, every other node has exactly one parent, <strong>no cycles</strong>, exactly one path between any two nodes. Those rules buy you something: <em>you don't need a visited set</em> — you can't revisit a node by following child pointers. What replaces it is the <strong>base case</strong>: <code>if (!node) return …</code>.</p>

${diagram(`
      A              node = { val: 'A', left: {…}, right: {…} }
     / \\             leaf = { val: 'D', left: null, right: null }
    B   C            empty tree = null
       /
      D              depth (in nodes): A=1, B/C=2, D=3   → maxDepth = 3`)}

<p><strong>Two traversals, same as graphs:</strong> DFS (recursion — preorder/inorder/postorder are just where you put the "do work" line) and BFS (a queue — <em>level order</em>). The recursive shape you'll write in 90% of tree questions:</p>
${code('js', 'the recursive template', `
function solve(node) {
  if (node === null) return BASE;              // 1. base case — forgetting it = crash
  const left = solve(node.left);               // 2. trust the recursion on subtrees
  const right = solve(node.right);
  return COMBINE(node.val, left, right);        // 3. combine
}`)}

${callout('warn', 'Depth: nodes or edges?', `<p>“Depth 3” can mean 3 nodes on the path or 3 edges (which is 4 nodes). This site counts <strong>nodes</strong> (so a single node has depth 1, an empty tree 0). In an interview, <em>ask</em> — then the empty-tree and single-node cases fall out of your convention.</p>`)}

${widget('mcq', {
  label: 'Base case reflex',
  q: 'A function computes the sum of all values in a tree. Which base case is right?',
  choices: ['<code>if (!node.left && !node.right) return node.val</code>', '<code>if (node === null) return 0</code>', '<code>if (node.val === undefined) return 0</code>', 'No base case is needed; the loop stops at leaves'],
  answer: 1,
  explain: '<p>Checking for null <em>at the top</em> handles the empty tree, missing children and leaves uniformly. The leaf-check version crashes on an empty tree and duplicates logic.</p>'
})}

${widget('exercise', {
  id: 'ex-4-1',
  title: 'maxDepth(root)',
  time: 5,
  fn: 'maxDepth',
  prompt: `<p>Nodes are <code>{ val, left, right }</code>; missing children are <code>null</code>. Return the number of nodes on the longest root-to-leaf path. An empty tree (<code>null</code>) has depth 0.</p>
${code('js', 'example', `const tree = { val: 'A',
  left:  { val: 'B', left: null, right: null },
  right: { val: 'C', left: { val: 'D', left: null, right: null }, right: null } };
maxDepth(tree)   // 3   (A → C → D)`)}`,
  reasoning: [
    { cat: 'algorithm', q: 'Express the answer recursively.', choices: ['depth(node) = depth(left) + depth(right)', 'depth(node) = 1 + max(depth(left), depth(right)), with depth(null) = 0', 'depth(node) = number of children + 1', 'depth(node) = depth(left) + 1'], answer: 1,
      explain: '<p>The deepest path goes through the deeper child, plus this node. The base case makes leaves work without special handling: 1 + max(0, 0) = 1.</p>' },
    { cat: 'edge', q: 'Which inputs must the base case cover?', choices: ['Only the empty tree', 'The empty tree and every missing child — <code>null</code> can appear anywhere', 'Only leaves', 'None; the tree is guaranteed non-empty'], answer: 1,
      explain: '<p>Any node may have a null left or right. One null check at the top of the function handles all of them.</p>' },
    { cat: 'complexity', q: 'Complexity for n nodes?', choices: ['O(n) time, O(h) space for the recursion stack (h = height)', 'O(log n)', 'O(n²)', 'O(n) time, O(1) space'], answer: 0,
      explain: '<p>Each node visited once. The recursion stack is as deep as the tree — O(log n) balanced, O(n) for a chain. Say the “h” part unprompted.</p>' },
    { type: 'text', cat: 'explanation', q: 'State the recurrence and the base case out loud.', min: 30,
      model: '<p>“The depth of an empty tree is 0; otherwise it’s 1 plus the larger of the two subtree depths. That single null base case covers the empty tree, missing children and leaves. O(n) time, O(h) stack space.”</p>' }
  ],
  ownTests: true,
  ownTemplate: `
[
  { name: 'root only', args: [{ val: 'A', left: null, right: null }], expect: 1 },
  // add at least two more — empty tree, a skewed chain, deeper on the right…
]`,
  coverage: [
    { label: 'empty tree', hit: args => args[0] === null },
    { label: 'right subtree deeper than left', hit: args => { const d = n => n ? 1 + Math.max(d(n.left), d(n.right)) : 0; const r = args[0]; return !!r && d(r.right) > d(r.left); } },
    { label: 'depth ≥ 4', hit: args => { const d = n => n ? 1 + Math.max(d(n.left), d(n.right)) : 0; return d(args[0]) >= 4; } },
    { label: 'balanced (both children present)', hit: args => { const r = args[0]; return !!r && !!r.left && !!r.right; } }
  ],
  starter: `
function maxDepth(root) {
  // base case first
}`,
  tests: [
    { name: 'example', args: [N('A', N('B'), N('C', N('D')))], expect: 3 },
    { name: 'empty tree', args: [null], expect: 0 },
    { name: 'single node', args: [N('A')], expect: 1 },
    { name: 'left-skewed chain of 5', args: [chain(5)], expect: 5 },
    { name: 'right-skewed', args: [N(1, null, N(2, null, N(3)))], expect: 3 },
    { name: 'balanced, depth 3', args: [N(1, N(2, N(4), N(5)), N(3, N(6), N(7)))], expect: 3 },
    { name: 'deeper on the right than the left', args: [N(1, N(2), N(3, N(4, N(5))))], expect: 4 },
    { name: 'deep chain (1,500 nodes)', args: [chain(1500)], expect: 1500 }
  ],
  antiSolutions: [
    { name: 'counts edges, not nodes', code: 'function maxDepth(r) { if (!r) return -1; return 1 + Math.max(maxDepth(r.left), maxDepth(r.right)); }' },
    { name: 'ignores the right subtree', code: 'function maxDepth(r) { if (!r) return 0; return 1 + maxDepth(r.left); }' }
  ],
  hints: [
    '<p>What is the depth of an empty tree? That’s your base case.</p>',
    '<p><code>return 1 + Math.max(maxDepth(root.left), maxDepth(root.right))</code></p>'
  ],
  solution: `
function maxDepth(root) {
  if (root === null) return 0;
  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}`,
  solutionExplain: '<p>Two lines. The iterative alternative is a BFS counting levels (next exercise) — worth mentioning when asked about very deep trees and stack limits.</p>',
  complexity: '<p>“O(n) time — every node once — and O(h) stack space, where h is the height: log n if balanced, n if degenerate.”</p>',
  followUp: {
    q: 'Follow-up: nodes are now <code>{ val, children: [] }</code> (an org chart). What changes?',
    choices: ['Everything — use BFS instead', 'Only the combine step: <code>1 + Math.max(0, ...node.children.map(maxDepth))</code>', 'You need a visited set now', 'Nothing at all'], answer: 1,
    explain: '<p>The base case shifts to “no children → 1” (or keep null-check + <code>Math.max(0, …)</code> for the empty children list). The recursion shape survives the data-model change — that’s the interview lesson.</p>'
  }
})}
`
      },

      /* ------------------------------------------------ 4.2 ------ */
      {
        type: 'read',
        title: 'Level order — BFS on a tree',
        minutes: 8,
        html: `
<p>“Print the org chart one management layer at a time”, “group nodes by depth” — that's BFS with one twist: you process the queue <em>one level at a time</em>. Snapshot the queue length at the start of each level, dequeue exactly that many, enqueue their children.</p>

${diagram(`
queue: [A]          → level 0 = [A],      enqueue B, C
queue: [B, C]       → level 1 = [B, C],   enqueue D
queue: [D]          → level 2 = [D]
queue: []           → done`)}

${widget('kata', {
  label: 'Write it — the level loop',
  q: 'Return the number of nodes on the <strong>widest</strong> level of a binary tree (<code>{ val, left, right }</code>, <code>null</code> for missing). Empty tree → 0. The size snapshot is the whole trick — write it from scratch.',
  fn: 'widestLevel',
  starter: `
function widestLevel(root) {
  // BFS; snapshot queue.length at the start of each level
}`,
  tests: [
    { name: 'example tree (A; B C; D) → 2', args: [{ val: 'A', left: { val: 'B', left: null, right: null }, right: { val: 'C', left: { val: 'D', left: null, right: null }, right: null } }], expect: 2 },
    { name: 'empty → 0', args: [null], expect: 0 },
    { name: 'single node → 1', args: [{ val: 1, left: null, right: null }], expect: 1 },
    { name: 'full tree of 3 levels → 4', args: [{ val: 1, left: { val: 2, left: { val: 4, left: null, right: null }, right: { val: 5, left: null, right: null } }, right: { val: 3, left: { val: 6, left: null, right: null }, right: { val: 7, left: null, right: null } } }], expect: 4 },
    { name: 'chain → 1', args: [{ val: 1, left: { val: 2, left: { val: 3, left: null, right: null }, right: null }, right: null }], expect: 1 },
    { name: 'widest level is the middle one', args: [{ val: 1, left: { val: 2, left: { val: 4, left: null, right: null }, right: null }, right: { val: 3, left: null, right: { val: 5, left: null, right: null } } }], expect: 2 },
    { name: 'queue mixing two levels must not inflate the answer', args: [{ val: 1, left: { val: 2, left: { val: 4, left: null, right: null }, right: { val: 5, left: null, right: null } }, right: { val: 3, left: null, right: null } }], expect: 2 }
  ],
  antiSolutions: [{ name: 'no snapshot (counts whole queue growth)', code: 'function widestLevel(root) { if (!root) return 0; let best = 0; const q = [root]; while (q.length) { best = Math.max(best, q.length); const x = q.shift(); if (x.left) q.push(x.left); if (x.right) q.push(x.right); } return best; }' }],
  hints: ['<p><code>const size = queue.length</code> at the top of the outer loop is one level; <code>best = Math.max(best, size)</code>.</p>', '<p>Inner loop runs exactly <code>size</code> times: shift, push children.</p>'],
  solution: `
function widestLevel(root) {
  if (root === null) return 0;
  let best = 0;
  const queue = [root];
  while (queue.length) {
    const size = queue.length;            // nodes on this level
    best = Math.max(best, size);
    for (let i = 0; i < size; i++) {
      const node = queue.shift();
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
  }
  return best;
}`,
  explain: '<p>The anti-pattern this kata catches: reading <code>queue.length</code> <em>inside</em> the loop, where it mixes this level’s remaining nodes with the next level’s already-pushed children. Snapshot once, before the inner loop.</p>'
})}

${widget('exercise', {
  id: 'ex-4-2',
  title: 'levels(root)',
  time: 6,
  fn: 'levels',
  prompt: `<p>Return the values grouped by level, top to bottom, each level left to right. Empty tree → <code>[]</code>.</p>
${code('js', 'example', `levels(tree)   // [["A"], ["B", "C"], ["D"]]   for the tree from 3.1`)}`,
  reasoning: [
    { cat: 'abstraction', q: 'Which graph traversal is “group by level”?', choices: ['DFS preorder', 'BFS — the queue naturally holds one level (plus part of the next) at a time', 'Inorder traversal', 'Sorting by depth'], answer: 1,
      explain: '<p>Exactly the BFS from Module 3, with the level boundary made explicit. (DFS with a depth parameter also works: <code>result[depth].push(val)</code> — a fine alternative.)</p>' },
    { cat: 'algorithm', q: 'How do you know where one level ends and the next begins?', choices: ['Nodes carry a depth field', 'Snapshot <code>queue.length</code> at the start of the level and dequeue exactly that many', 'Use a second queue for odd levels', 'Compare values'], answer: 1,
      explain: '<p>Or push a sentinel <code>null</code> marker after each level. The snapshot is cleaner.</p>' },
    { cat: 'complexity', q: 'Complexity?', choices: ['O(n) time, O(w) space where w is the widest level', 'O(n log n)', 'O(h)', 'O(n²)'], answer: 0,
      explain: '<p>Every node enqueued once. The queue holds at most one full level — up to n/2 for a complete binary tree.</p>' },
    { type: 'text', cat: 'explanation', q: 'Connect this to graph BFS in two sentences: what is the same, what is different?', min: 40,
      model: '<p>“It’s the same queue-based BFS from the graph module: the queue holds the frontier and children are enqueued as they’re discovered. Two differences: no visited set, because a tree has no cycles, and a size snapshot per iteration so the output is grouped by level.”</p>' }
  ],
  ownTests: true,
  ownTemplate: `
[
  { name: 'root and two children', args: [{ val: 1, left: { val: 2, left: null, right: null }, right: { val: 3, left: null, right: null } }], expect: [[1], [2, 3]] },
  // add at least two more — empty tree, only right children, uneven levels…
]`,
  coverage: [
    { label: 'empty tree', hit: args => args[0] === null },
    { label: 'a level with only a right child', hit: args => { let hit = false; const walk = n => { if (!n) return; if (!n.left && n.right) hit = true; walk(n.left); walk(n.right); }; walk(args[0]); return hit; } },
    { label: '3+ levels', hit: args => { const d = n => n ? 1 + Math.max(d(n.left), d(n.right)) : 0; return d(args[0]) >= 3; } },
    { label: 'a level with 3+ nodes', hit: args => { const r = args[0]; if (!r) return false; let q = [r]; while (q.length) { if (q.length >= 3) return true; const next = []; for (const n of q) { if (n.left) next.push(n.left); if (n.right) next.push(n.right); } q = next; } return false; } }
  ],
  starter: `
function levels(root) {
  // BFS, one level at a time
}`,
  tests: [
    { name: 'example', args: [N('A', N('B'), N('C', N('D')))], expect: [['A'], ['B', 'C'], ['D']] },
    { name: 'empty tree', args: [null], expect: [] },
    { name: 'single node', args: [N('A')], expect: [['A']] },
    { name: 'full tree of 3 levels, left-to-right order', args: [N(1, N(2, N(4), N(5)), N(3, N(6), N(7)))], expect: [[1], [2, 3], [4, 5, 6, 7]] },
    { name: 'left-skewed chain', args: [chain(4)], expect: [['n1'], ['n2'], ['n3'], ['n4']] },
    { name: 'only right children', args: [N('r', null, N('s', null, N('t')))], expect: [['r'], ['s'], ['t']] },
    { name: 'uneven levels', args: [N(1, N(2, null, N(5)), N(3, N(6, N(7)), null))], expect: [[1], [2, 3], [5, 6], [7]] }
  ],
  antiSolutions: [
    { name: 'right before left', code: 'function levels(root) { if (!root) return []; const res = [], q = [root]; while (q.length) { const n = q.length, lvl = []; for (let i = 0; i < n; i++) { const x = q.shift(); lvl.push(x.val); if (x.right) q.push(x.right); if (x.left) q.push(x.left); } res.push(lvl); } return res; }' },
    { name: 'flat BFS order, not grouped', code: 'function levels(root) { if (!root) return []; const out = [], q = [root]; while (q.length) { const x = q.shift(); out.push([x.val]); if (x.left) q.push(x.left); if (x.right) q.push(x.right); } return out; }' }
  ],
  hints: [
    '<p>Start with the queue holding the root. Each outer iteration produces one level array.</p>',
    '<p><code>const size = queue.length</code> before the inner loop; dequeue <code>size</code> nodes; push their non-null children.</p>'
  ],
  solution: `
function levels(root) {
  if (root === null) return [];
  const result = [];
  const queue = [root];
  while (queue.length) {
    const size = queue.length;          // nodes on this level
    const level = [];
    for (let i = 0; i < size; i++) {
      const node = queue.shift();
      level.push(node.val);
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    result.push(level);
  }
  return result;
}`,
  solutionExplain: '<p>Connect it back explicitly: this is Module 3’s BFS with the “distance rings” made visible. No visited set because a tree has no cycles — say that, it shows you know <em>why</em> the graph version needed one.</p>',
  complexity: '<p>“O(n) time; O(w) extra space for the queue where w is the maximum level width.”</p>',
  followUp: {
    q: 'Follow-up: “Return the <em>rightmost</em> value of each level” (the right-side view). Change?',
    choices: ['Reverse the tree first', 'Same loop; push only the last node of each level (<code>i === size - 1</code>)', 'Use DFS from the right', 'Sort each level'], answer: 1,
    explain: '<p>Level order with a different “emit” rule. Many tree follow-ups are just changing what you collect per level.</p>'
  }
})}
`
      },

      /* ------------------------------------------------ 4.3 ------ */
      {
        type: 'read',
        title: 'Org charts: n-ary trees with a path',
        minutes: 8,
        html: `
<p>Business trees are rarely binary. An org chart, a category taxonomy, a folder tree: <code>{ id, children: [...] }</code>. The recursion is the same; the two things that change are the loop over <code>children</code> and, very often, the need to return the <strong>path</strong> to something — “who is in X’s management chain?”, “what is the breadcrumb for this category?”.</p>

${diagram(`
DFS with a path:
  find(node, path):
      path = [...path, node.id]        (or push/pop on one shared array — O(1) per step)
      if node.id === target: return path
      for child of node.children:
          result = find(child, path)
          if result: return result
      return null`)}

${widget('exercise', {
  id: 'ex-4-3',
  title: 'managementChain(root, employeeId)',
  time: 7,
  fn: 'managementChain',
  prompt: `<p>An org chart is an n-ary tree: <code>{ id, children: [ … ] }</code> (every node has a <code>children</code> array, possibly empty). Return the chain of IDs from the root down to the given employee, inclusive — or <code>null</code> if the employee isn’t in the tree. IDs are unique.</p>
${code('js', 'example', `const org = { id: 'ceo', children: [
  { id: 'cto', children: [{ id: 'eng1', children: [] }, { id: 'eng2', children: [] }] },
  { id: 'cfo', children: [{ id: 'acct', children: [] }] }
] };
managementChain(org, 'eng2')   // ['ceo', 'cto', 'eng2']
managementChain(org, 'nobody') // null`)}`,
  reasoning: [
    { cat: 'abstraction', q: 'Which traversal, and what extra state does “return the chain” require?', choices: ['BFS with a parent map, then reconstruct', 'DFS carrying the current path (recursion stack = the chain) — or BFS + parent map; both work', 'Sort the employees', 'A Set of IDs'], answer: 1,
      explain: '<p>DFS is natural here because the recursion stack <em>is</em> the chain. BFS + parent map (Module 3) also works; say you know both.</p>' },
    { cat: 'edge', q: 'The employee isn’t in the tree. How does your recursion report that cleanly?', choices: ['Throw an error', 'Every branch returns <code>null</code> when it fails, and the caller only returns a non-null result — so “not found” falls out as <code>null</code> at the root', 'Return an empty array', 'Return the root only'], answer: 1,
      explain: '<p>Consistent “found → path, not found → null” return values compose through the recursion without special cases.</p>' },
    { cat: 'complexity', q: 'Complexity for n employees?', choices: ['O(n) time, O(h) stack/path space', 'O(n log n)', 'O(h)', 'O(n²) because of path copying at each level'], answer: 0,
      explain: '<p>Each node visited at most once. If you copy the path array at each level (<code>[...path, id]</code>) the cost is O(h) per node in the worst case — mention that a shared array with push/pop avoids it.</p>' },
    { type: 'text', cat: 'explanation', q: 'Say your approach in two sentences, as you would to the interviewer.', min: 40,
      model: '<p>“I’ll DFS from the root, passing the path so far; when I reach the target ID I return the path, otherwise I try each child and return the first non-null result, or null if none. O(n) time; the path/stack is O(h). No visited set — it’s a tree.”</p>' }
  ],
  starter: `
function managementChain(root, employeeId) {
  // DFS carrying the path; return it when you find the id, else null
}`,
  tests: [
    { name: 'example — eng2', args: [{ id: 'ceo', children: [{ id: 'cto', children: [{ id: 'eng1', children: [] }, { id: 'eng2', children: [] }] }, { id: 'cfo', children: [{ id: 'acct', children: [] }] }] }, 'eng2'], expect: ['ceo', 'cto', 'eng2'] },
    { name: 'target is the root', args: [{ id: 'ceo', children: [{ id: 'x', children: [] }] }, 'ceo'], expect: ['ceo'] },
    { name: 'not found → null', args: [{ id: 'ceo', children: [{ id: 'x', children: [] }] }, 'nobody'], expect: null },
    { name: 'second subtree (first branch must not leak into the path)', args: [{ id: 'ceo', children: [{ id: 'cto', children: [{ id: 'eng1', children: [] }] }, { id: 'cfo', children: [{ id: 'acct', children: [] }] }] }, 'acct'], expect: ['ceo', 'cfo', 'acct'] },
    { name: 'deep chain', args: [{ id: 'a', children: [{ id: 'b', children: [{ id: 'c', children: [{ id: 'd', children: [] }] }] }] }, 'd'], expect: ['a', 'b', 'c', 'd'] },
    { name: 'wide node (5 children), target is the last', args: [{ id: 'r', children: ['c1', 'c2', 'c3', 'c4', 'c5'].map(id => ({ id, children: [] })) }, 'c5'], expect: ['r', 'c5'] },
    { name: 'empty tree (null root)', args: [null, 'x'], expect: null },
    { name: 'input tree not mutated', args: [{ id: 'ceo', children: [{ id: 'x', children: [] }] }, 'x'], expect: ['ceo', 'x'], noMutate: 'fail' }
  ],
  antiSolutions: [
    { name: 'shared path array never popped (first branch leaks)', code: 'function managementChain(root, id) { if (!root) return null; const path = []; function dfs(n) { path.push(n.id); if (n.id === id) return true; for (const c of n.children) if (dfs(c)) return true; return false; } return dfs(root) ? path : null; }' },
    { name: 'only searches the first child', code: 'function managementChain(root, id) { if (!root) return null; if (root.id === id) return [root.id]; const r = root.children.length ? managementChain(root.children[0], id) : null; return r ? [root.id, ...r] : null; }' }
  ],
  hints: [
    '<p><code>function dfs(node, path)</code> where <code>path</code> already includes the ancestors; build <code>const here = [...path, node.id]</code>.</p>',
    '<p>If <code>node.id === employeeId</code> return <code>here</code>; else loop children, return the first non-null <code>dfs(child, here)</code>; finally return <code>null</code>.</p>'
  ],
  solution: `
function managementChain(root, employeeId) {
  if (root === null) return null;
  function dfs(node, path) {
    const here = [...path, node.id];
    if (node.id === employeeId) return here;
    for (const child of node.children) {
      const found = dfs(child, here);
      if (found) return found;
    }
    return null;
  }
  return dfs(root, []);
}`,
  solutionExplain: '<p>The push/pop variant — one shared array, <code>path.push(id)</code> on entry and <code>path.pop()</code> before returning null — avoids copying but the pop is easy to forget (that is exactly the first anti-solution the tests catch). Copying is fine to write first; mention the optimization.</p>',
  complexity: '<p>“O(n) time to visit every employee once in the worst case; O(h) extra space for the recursion and the path, h being the depth of the hierarchy.”</p>',
  followUp: {
    q: 'Follow-up: “Given two employee IDs, find their lowest common manager.” Which idea?',
    choices: ['Sort both subtrees', 'Get both chains with this function, then walk them together while they agree — the last common ID is the answer', 'BFS from the root twice', 'A heap of managers'], answer: 1,
    explain: '<p>Two chains, one zip. O(n) for the two searches plus O(h) for the comparison. Composing the function you just wrote is the point.</p>'
  }
})}
`
      },

      /* ------------------------------------------------ 4.4 ------ */
      {
        type: 'quiz',
        title: 'Quiz: trees',
        questions: [
          { q: 'Why don’t tree traversals need a <code>visited</code> set?', choices: ['They do', 'A tree has no cycles and each node has one parent, so following child pointers can never revisit a node', 'Because trees are small', 'Because recursion tracks it'], answer: 1,
            explain: '<p>If the input might contain cycles or shared nodes (a DAG), it’s a graph again — bring the set back.</p>' },
          { q: 'The most common tree-recursion bug is…', choices: ['Using the wrong traversal order', 'Missing the <code>null</code> base case, crashing on empty trees or missing children', 'Too much memory', 'Using Math.max'], answer: 1,
            explain: '<p>Put <code>if (!node) return BASE</code> first, always.</p>' },
          { q: 'Recursion depth is a concern when…', choices: ['The tree is balanced', 'The tree is very deep (a degenerate chain of ~10⁵ nodes) — the call stack can overflow; use an explicit stack/queue', 'The tree has many leaves', 'Never in JavaScript'], answer: 1,
            explain: '<p>Stack space is O(h). Mention the iterative alternative when the interviewer asks about scale.</p>' },
          { q: 'Level-order traversal is really…', choices: ['DFS with a counter', 'BFS with a per-level size snapshot', 'Sorting by depth', 'Inorder traversal'], answer: 1,
            explain: '<p>Same queue as graph BFS.</p>' },
          { q: '“Depth of the tree” — what should you do before coding?', choices: ['Assume edges', 'Assume nodes', 'Ask whether depth counts nodes or edges, and state the empty-tree answer under that convention', 'Return both'], answer: 2,
            explain: '<p>A 5-second clarification that prevents an off-by-one argument later.</p>' }
        ]
      }
    ]
  });
})();
