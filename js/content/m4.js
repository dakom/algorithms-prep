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
      explain: '<p>Each node visited once. The recursion stack is as deep as the tree — O(log n) balanced, O(n) for a chain. Say the “h” part unprompted.</p>' }
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

${widget('blanks', {
  label: 'Complete the level loop',
  q: 'The size snapshot is the whole trick.',
  name: 'levels.js',
  template: `
function levels(root) {
  if (!root) return [];
  const result = [];
  const queue = [root];
  while (queue.length) {
    const size = «0»;
    const level = [];
    for (let i = 0; i < size; i++) {
      const node = queue.«1»();
      level.push(node.val);
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    result.push(«2»);
  }
  return result;
}`,
  blanks: [
    { choices: ['queue.length', 'result.length', 'level.length', '2'], answer: 0 },
    { choices: ['shift', 'pop', 'at', 'slice'], answer: 0 },
    { choices: ['level', 'node.val', 'queue', 'size'], answer: 0 }
  ],
  explain: '<p>Reading <code>queue.length</code> once, before the inner loop, is what separates levels — the children pushed during the loop belong to the <em>next</em> level. <code>shift</code> (front) makes it BFS; <code>pop</code> would make it a strange DFS.</p>'
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
      explain: '<p>Every node enqueued once. The queue holds at most one full level — up to n/2 for a complete binary tree.</p>' }
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
