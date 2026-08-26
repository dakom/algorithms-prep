/* Module 2 — Hash Maps and Sets */
(function () {
  const { code, callout, diagram, widget } = window.T;

  window.MODULES.push({
    title: 'Hash Maps & Sets',
    blurb: 'Make “seen it?”, “find by ID” and “group by” automatic',
    minutes: 20,
    sections: [

      /* ------------------------------------------------ 2.1 ------ */
      {
        type: 'read',
        title: 'Set vs Map: the two questions',
        minutes: 5,
        html: `
<p>A surprising share of “algorithm” interview questions are really <strong>indexing</strong> problems: put things in a structure that answers one question in O(1), then walk the input once. Two structures, two questions.</p>

<div class="two-col">
<div class="card"><h4>Set — “is this value present?”</h4>
<ul><li>have I seen this before?</li><li>eliminate duplicates</li><li>membership of an allow/deny list</li><li><strong>prevent re-visiting in graph traversal</strong> (Module 3 lives on this)</li></ul></div>
<div class="card"><h4>Map — “what is associated with this key?”</h4>
<ul><li>find a record by ID</li><li>count occurrences</li><li>group by key</li><li>remember predecessor / state per entity (BFS <code>parent</code>, balances, memo)</li></ul></div>
</div>

${widget('repl', {
  label: 'The API you must type without thinking',
  q: 'Predict every line of output first, then run. Edit freely.',
  name: 'map-set.js',
  code: `
const seen = new Set();
seen.add('tx1'); seen.add('tx2'); seen.add('tx1');   // duplicates collapse
console.log(seen.size, seen.has('tx1'), seen.has('nope'));

const totals = new Map();
totals.set('A', 10);
totals.set('A', (totals.get('A') ?? 0) + 12);        // accumulate, don't overwrite
totals.set('B', (totals.get('B') ?? 0) + 5);         // ?? handles the missing key
console.log(totals.get('A'), totals.get('B'), totals.get('Z'));

for (const [account, total] of totals) console.log(account, '→', total);
console.log([...totals.keys()], [...totals.values()]);
console.log(Object.fromEntries(totals));              // Map → plain object

// group by key: Map<key, array>
const byAccount = new Map();
for (const tx of [{ account: 'A', id: 1 }, { account: 'B', id: 2 }, { account: 'A', id: 3 }]) {
  if (!byAccount.has(tx.account)) byAccount.set(tx.account, []);
  byAccount.get(tx.account).push(tx.id);
}
console.log(byAccount.get('A'), byAccount.get('B'));`,
  explain: '<p>Three idioms to have in muscle memory: <code>(map.get(k) ?? 0) + x</code> for counting/totalling, <code>if (!map.has(k)) map.set(k, [])</code> for grouping, and <code>Object.fromEntries(map)</code> when the caller wants a plain object. <code>Map</code> keeps insertion order and takes any key type; a plain object coerces keys to strings — fine for account IDs, wrong for object keys.</p>'
})}

<h2>The four classic mistakes</h2>
<table>
<tr><th>Mistake</th><th>What it looks like</th><th>Fix</th></tr>
<tr><td>Assuming the key exists</td><td><code>totals.get(k) + amount</code> → <code>NaN</code> on first sight</td><td><code>(totals.get(k) ?? 0) + amount</code></td></tr>
<tr><td>Overwriting instead of accumulating</td><td><code>totals.set(k, amount)</code></td><td>read-modify-write</td></tr>
<tr><td>Presence vs falsy</td><td><code>if (map.get(k))</code> fails for a stored <code>0</code> / <code>""</code> / <code>false</code></td><td><code>map.has(k)</code></td></tr>
<tr><td>Unnecessary nested loop</td><td><code>for … for … if (a[i] === b[j])</code> — O(n·m)</td><td>index one side in a Set/Map, scan the other</td></tr>
</table>

${widget('kata', {
  fix: true,
  label: 'Fix it — presence vs truthiness',
  q: 'This is meant to return each account’s <em>balance</em> after applying signed amounts, treating accounts that have <strong>ever been seen</strong> as present (even at 0) and unknown accounts as <code>null</code>. One line uses truthiness where it needs presence. Find it, fix it, make the tests pass.',
  fn: 'balanceOf',
  starter: `
function balanceOf(transactions, accountId) {
  const balances = new Map();
  for (const tx of transactions) {
    balances.set(tx.account, (balances.get(tx.account) ?? 0) + tx.amount);
  }
  const balance = balances.get(accountId);
  if (balance) return balance;
  return null;
}`,
  tests: [
    { name: 'known account with positive balance', args: [[{ account: 'A', amount: 10 }], 'A'], expect: 10 },
    { name: 'unknown account → null', args: [[{ account: 'A', amount: 10 }], 'Z'], expect: null },
    { name: 'known account that nets to 0 → 0, not null', args: [[{ account: 'A', amount: 10 }, { account: 'A', amount: -10 }], 'A'], expect: 0 },
    { name: 'known account with negative balance', args: [[{ account: 'A', amount: -5 }], 'A'], expect: -5 },
    { name: 'empty transactions → null', args: [[], 'A'], expect: null }
  ],
  antiSolutions: [{ name: 'original', code: 'function balanceOf(t, id) { const b = new Map(); for (const tx of t) b.set(tx.account, (b.get(tx.account) ?? 0) + tx.amount); const x = b.get(id); if (x) return x; return null; }' }],
  hints: ['<p>Which stored values are falsy but valid? Run the tests and read the failing case.</p>', '<p>Test presence with <code>balances.has(accountId)</code> (or <code>!== undefined</code>), not with truthiness.</p>'],
  solution: `
function balanceOf(transactions, accountId) {
  const balances = new Map();
  for (const tx of transactions) {
    balances.set(tx.account, (balances.get(tx.account) ?? 0) + tx.amount);
  }
  return balances.has(accountId) ? balances.get(accountId) : null;   // presence, not truthiness
}`,
  explain: '<p><code>if (balance)</code> treats <code>0</code> (and <code>-0</code>, <code>NaN</code>) as “missing”. For balances, counters and flags, 0 is a real value — test <em>presence</em> with <code>has()</code>. The same bug hides in <code>if (map.get(k))</code> everywhere; the fix is a reflex worth burning in.</p>'
})}

${widget('kata', {
  label: 'Write it — index one side, scan the other',
  q: 'Given <code>accounts</code> (<code>{ id }</code> objects) and <code>transactions</code> (<code>{ id, account }</code>), return the IDs of transactions whose <code>account</code> is not a known account, in input order. It must be O(n + m), so no <code>find</code>/<code>includes</code> inside the loop.',
  fn: 'unknownAccounts',
  starter: `
function unknownAccounts(accounts, transactions) {
  // index the accounts, then one pass over transactions
}`,
  tests: [
    { name: 'one unknown', args: [[{ id: 'A' }, { id: 'B' }], [{ id: 't1', account: 'A' }, { id: 't2', account: 'Q' }]], expect: ['t2'] },
    { name: 'all known', args: [[{ id: 'A' }], [{ id: 't1', account: 'A' }]], expect: [] },
    { name: 'no accounts at all → every transaction is unknown', args: [[], [{ id: 't1', account: 'A' }, { id: 't2', account: 'B' }]], expect: ['t1', 't2'] },
    { name: 'no transactions', args: [[{ id: 'A' }], []], expect: [] },
    { name: 'order preserved, repeats kept', args: [[{ id: 'A' }], [{ id: 't1', account: 'X' }, { id: 't2', account: 'A' }, { id: 't3', account: 'X' }]], expect: ['t1', 't3'] },
    { name: 'large: 50,000 accounts × 50,000 transactions (quadratic times out)', args: [Array.from({ length: 50000 }, (_, i) => ({ id: 'a' + i })), Array.from({ length: 50000 }, (_, i) => ({ id: 't' + i, account: i % 1000 === 0 ? 'ghost' + i : 'a' + i }))], expect: Array.from({ length: 50 }, (_, i) => 't' + (i * 1000)) }
  ],
  antiSolutions: [{ name: 'nested some() — quadratic, times out on the large test', expectTimeout: true, code: 'function unknownAccounts(a, t) { const out = []; for (const tx of t) { if (!a.some(x => x.id === tx.account)) out.push(tx.id); } return out; }' }],
  hints: ['<p><code>const known = new Set(accounts.map(a => a.id))</code>.</p>', '<p>Then <code>transactions.filter(tx => !known.has(tx.account)).map(tx => tx.id)</code>.</p>'],
  solution: `
function unknownAccounts(accounts, transactions) {
  const known = new Set(accounts.map(a => a.id));            // O(n) index
  const result = [];
  for (const tx of transactions) {                           // O(m) scan
    if (!known.has(tx.account)) result.push(tx.id);
  }
  return result;
}`,
  explain: '<p>O(n + m) versus O(n·m). The large test has 20k × 20k = 400M comparisons for the nested version — it trips the loop guard, which is the point: interviewers ask “what happens at scale?” and this is the concrete answer.</p>'
})}

${callout('say', 'The sentence to say', `<p>“I'll index the ___ in a Map/Set so lookups are O(1), then walk the ___ once. That's O(n + m) time and O(n) extra space.” Fill in the blanks for any indexing problem.</p>`)}
`
      },

      /* ------------------------------------------------ 2.2 ------ */
      {
        type: 'read',
        title: 'Exercise 2.1 — Duplicate transactions',
        minutes: 5,
        html: `
<p>Your first full run of the loop. The editor stays locked until the reasoning is done — that mirrors the interview, where you'd be talking before typing.</p>

${widget('exercise', {
  id: 'ex-2-1',
  title: 'hasDuplicate(ids)',
  time: 5,
  fn: 'hasDuplicate',
  prompt: `<p>Return <code>true</code> if any transaction ID appears more than once in <code>ids</code>, otherwise <code>false</code>.</p>
${code('js', 'example', `hasDuplicate(["tx1", "tx2", "tx3", "tx2"])   // true
hasDuplicate(["tx1", "tx2"])                 // false`)}`,
  reasoning: [
    { cat: 'abstraction', q: 'What kind of question is the core of this problem?', choices: ['Ordering — sort the IDs', 'Membership — “have I seen this value before?”', 'Reachability — connect IDs that match', 'Aggregation — total per ID'], answer: 1,
      explain: '<p>“Appears twice” = “seen before”. That word maps straight to a Set.</p>' },
    { cat: 'complexity', q: 'Target complexity for n IDs?', choices: ['O(n) time, O(n) space', 'O(n log n) time, O(1) space', 'O(n²) time, O(1) space', 'O(1) time, O(n) space'], answer: 0,
      explain: '<p>One pass, one Set that can hold up to n entries. Sorting (O(n log n)) also works but is strictly worse here; the nested loop is the answer to avoid.</p>' },
    { type: 'text', cat: 'explanation', q: 'Explain your approach in two sentences, as you would to the interviewer.', min: 40,
      model: '<p>“I’ll walk the IDs once, keeping a Set of the ones I’ve seen. If the current ID is already in the Set I return true immediately; otherwise I add it. If the loop finishes, return false. O(n) time and O(n) space.”</p>' }
  ],
  starter: `
function hasDuplicate(ids) {
  // TODO
}`,
  tests: [
    { name: 'example — duplicate present', args: [['tx1', 'tx2', 'tx3', 'tx2']], expect: true },
    { name: 'no duplicates', args: [['tx1', 'tx2', 'tx3']], expect: false },
    { name: 'empty list', args: [[]], expect: false },
    { name: 'single element', args: [['tx1']], expect: false },
    { name: 'duplicate is the last element', args: [['a', 'b', 'c', 'd', 'a']], expect: true },
    { name: 'many duplicates', args: [['x', 'x', 'x']], expect: true },
    { name: 'similar but distinct IDs', args: [['tx1', 'tx10', 'tx01']], expect: false },
    { name: 'large input (10,000 IDs, one duplicate at the end)', args: [Array.from({ length: 10000 }, (_, i) => 'id' + i).concat(['id0'])], expect: true }
  ],
  antiSolutions: [
    { name: 'returns true for any non-empty input', code: 'function hasDuplicate(ids) { return ids.length > 0; }' }
  ],
  ownTests: true,
  ownTemplate: `
[
  { name: 'empty list', args: [[]], expect: false },
  // add at least two more — think: single item, duplicate at the end, no duplicates…
]`,
  coverage: [
    { label: 'empty input', hit: args => Array.isArray(args[0]) && args[0].length === 0 },
    { label: 'single element', hit: args => Array.isArray(args[0]) && args[0].length === 1 },
    { label: 'duplicate present', hit: args => Array.isArray(args[0]) && new Set(args[0]).size < args[0].length },
    { label: 'no duplicate (n ≥ 2)', hit: args => Array.isArray(args[0]) && args[0].length >= 2 && new Set(args[0]).size === args[0].length }
  ],
  hints: [
    '<p>Which structure answers “have I seen this before?” in O(1)?</p>',
    '<p>Create a <code>new Set()</code> before the loop. For each ID: if the set already has it, you’re done.</p>',
    '<p>Full shape: <code>for (const id of ids) { if (seen.has(id)) return true; seen.add(id); } return false;</code></p>'
  ],
  solution: `
function hasDuplicate(ids) {
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) return true;
    seen.add(id);
  }
  return false;
}`,
  solutionExplain: '<p>Returning early on the first repeat is worth mentioning: best case O(1), worst case O(n). A one-liner alternative is <code>new Set(ids).size !== ids.length</code> — fine in an interview if you also say it always processes the whole list.</p>',
  complexity: '<p>“O(n) time — one pass with O(1) Set operations — and O(n) extra space for the Set in the worst case where there are no duplicates.”</p>',
  followUp: {
    q: 'Follow-up: “Return the <em>first</em> ID that repeats, or <code>null</code>.” What changes?',
    choices: ['Replace the Set with a Map from ID to count and do a second pass', 'Almost nothing — return <code>id</code> instead of <code>true</code> where the repeat is detected, and <code>null</code> at the end', 'Sort first so repeats are adjacent', 'You need a nested loop now'],
    answer: 1,
    explain: '<p>The structure already knows the moment a repeat happens; only the return value changes. That “almost nothing changes” answer is the goal of good structure choice.</p>'
  }
})}
`
      },

      /* ------------------------------------------------ 2.3 ------ */
      {
        type: 'read',
        title: 'Exercise 2.2 — Transaction totals',
        minutes: 5,
        html: `
<p>Aggregation: the most common shape in business-flavored interviews. The follow-up is where the points are.</p>

${widget('exercise', {
  id: 'ex-2-2',
  title: 'totalsByAccount(transactions)',
  time: 5,
  fn: 'totalsByAccount',
  prompt: `<p>Given transactions <code>{ account, amount }</code>, return the total amount per account as a plain object (a <code>Map</code> is also accepted). Amounts may be negative (refunds).</p>
${code('js', 'example', `totalsByAccount([
  { account: "A", amount: 10 },
  { account: "B", amount: 5 },
  { account: "A", amount: 12 }
])
// { A: 22, B: 5 }`)}`,
  reasoning: [
    { cat: 'abstraction', q: 'Which pattern is this?', choices: ['Membership (Set)', 'Group / aggregate by key (Map)', 'Sort then scan', 'Graph traversal'], answer: 1,
      explain: '<p>“Total per account” = key → running sum. One Map, one pass.</p>' },
    { cat: 'edge', q: 'The first time you see account <code>"A"</code>, <code>totals.get("A")</code> is <code>undefined</code>. What does <code>undefined + 10</code> give?', choices: ['10', '<code>NaN</code>', '<code>"undefined10"</code>', 'A TypeError'], answer: 1,
      explain: '<p><code>NaN</code>, silently. Which then poisons every later addition for that key. This is <em>the</em> aggregation bug; default the missing key with <code>?? 0</code>.</p>' },
    { cat: 'complexity', q: 'Complexity for n transactions across m distinct accounts?', choices: ['O(n·m) time', 'O(n) time, O(m) space', 'O(n log n) time', 'O(m) time'], answer: 1,
      explain: '<p>Each transaction does O(1) map work → O(n). The map holds one entry per distinct account → O(m) space.</p>' },
    { type: 'text', cat: 'explanation', q: 'Say the approach and complexity in two sentences.', min: 40,
      model: '<p>“One pass over the transactions, accumulating into a Map from account to running total — reading the current total with a default of 0 so the first sight of an account doesn’t produce NaN. O(n) time for n transactions, O(m) space for m distinct accounts, which is also the size of the output.”</p>' }
  ],
  starter: `
function totalsByAccount(transactions) {
  // TODO
}`,
  tests: [
    { name: 'example', args: [[{ account: 'A', amount: 10 }, { account: 'B', amount: 5 }, { account: 'A', amount: 12 }]], expect: { A: 22, B: 5 } },
    { name: 'empty input → empty result', args: [[]], expect: {} },
    { name: 'single transaction', args: [[{ account: 'Z', amount: 3 }]], expect: { Z: 3 } },
    { name: 'negative amounts (refunds) net out', args: [[{ account: 'A', amount: 50 }, { account: 'A', amount: -20 }, { account: 'A', amount: -30 }]], expect: { A: 0 } },
    { name: 'many accounts, interleaved', args: [[{ account: 'C', amount: 1 }, { account: 'A', amount: 2 }, { account: 'B', amount: 3 }, { account: 'A', amount: 4 }, { account: 'C', amount: 5 }]], expect: { A: 6, B: 3, C: 6 } },
    { name: 'input is not mutated', args: [[{ account: 'A', amount: 1 }, { account: 'A', amount: 1 }]], expect: { A: 2 }, noMutate: 'fail' }
  ],
  antiSolutions: [
    { name: 'overwrites instead of accumulating', code: 'function totalsByAccount(t) { const o = {}; for (const x of t) o[x.account] = x.amount; return o; }' },
    { name: 'NaN on first sight', code: 'function totalsByAccount(t) { const m = new Map(); for (const x of t) m.set(x.account, m.get(x.account) + x.amount); return m; }' }
  ],
  ownTests: true,
  ownTemplate: `
[
  { name: 'two accounts', args: [[{ account: 'A', amount: 1 }, { account: 'B', amount: 2 }]], expect: { A: 1, B: 2 } },
  // add at least two more
]`,
  coverage: [
    { label: 'empty input', hit: args => Array.isArray(args[0]) && args[0].length === 0 },
    { label: 'repeated account', hit: args => Array.isArray(args[0]) && new Set(args[0].map(t => t && t.account)).size < args[0].length },
    { label: 'negative amount', hit: args => Array.isArray(args[0]) && args[0].some(t => t && t.amount < 0) },
    { label: 'total lands on 0', hit: args => { if (!Array.isArray(args[0])) return false; const m = {}; for (const t of args[0]) m[t.account] = (m[t.account] || 0) + t.amount; return Object.values(m).some(v => v === 0); } }
  ],
  hints: [
    '<p>One Map (or object) keyed by account, holding a running total.</p>',
    '<p>The accumulate idiom: <code>totals.set(tx.account, (totals.get(tx.account) ?? 0) + tx.amount)</code>.</p>',
    '<p>If you used a Map and need a plain object: <code>return Object.fromEntries(totals)</code>.</p>'
  ],
  solution: `
function totalsByAccount(transactions) {
  const totals = new Map();
  for (const tx of transactions) {
    totals.set(tx.account, (totals.get(tx.account) ?? 0) + tx.amount);
  }
  return Object.fromEntries(totals);
}`,
  solutionExplain: '<p>A plain object with <code>totals[tx.account] = (totals[tx.account] ?? 0) + tx.amount</code> is equally acceptable. Using <code>Map</code> signals you know the difference (any key type, insertion order, no prototype keys like <code>"constructor"</code> colliding).</p>',
  complexity: '<p>“O(n) time for n transactions, O(m) space for m distinct accounts.” Note that the output itself is O(m), so you can’t beat that space.</p>',
  followUp: {
    q: 'Follow-up: “Return only the accounts whose total exceeds 100.” Best adaptation?',
    choices: ['Add an <code>if (tx.amount > 100)</code> inside the loop', 'Keep the aggregation exactly as is; afterwards filter the entries: <code>[...totals].filter(([, t]) => t > 100)</code>', 'Sort transactions by amount and stop at 100', 'Start over with a different structure'],
    answer: 1,
    explain: '<p>Filtering <em>transactions</em> by 100 is a different (wrong) question — a total can exceed 100 via many small amounts. Aggregate first, then filter the totals. The follow-up is testing whether you keep the layers separate.</p>'
  }
})}
`
      },

      /* ------------------------------------------------ 2.4 ------ */
      {
        type: 'read',
        title: 'Exercise 2.3 — Pair sum',
        minutes: 5,
        html: `
<p>The classic. Interviewers use it to see whether you reach for the nested loop or the map — and whether you can explain <em>why</em> the map version works in one pass.</p>

${diagram(`
brute force:   for i         for j > i      if nums[i] + nums[j] === target   → O(n²)
one pass:      for i:  need = target - nums[i]
                       if seen has need → done          (seen = Map value → index)
                       seen.set(nums[i], i)             → O(n)`)}

${widget('exercise', {
  id: 'ex-2-3',
  title: 'findPair(nums, target)',
  time: 6,
  fn: 'findPair',
  prompt: `<p>Return the indices <code>[i, j]</code> of two <em>different</em> elements whose values sum to <code>target</code>, or <code>null</code> if no such pair exists. Any valid pair, in any order, is accepted.</p>
${code('js', 'example', `findPair([2, 7, 11, 15], 9)   // [0, 1]  (2 + 7)
findPair([1, 2, 3], 100)      // null`)}`,
  reasoning: [
    { cat: 'algorithm', q: 'The one-pass idea: for each number <code>x</code>, what do you look up?', choices: ['Whether <code>x</code> itself was seen', 'Whether <code>target - x</code> was seen already', 'Whether <code>target</code> was seen', 'The largest number seen so far'], answer: 1,
      explain: '<p>The complement. If <code>target - x</code> is already in the map, its index plus the current index is the answer. Otherwise record <code>x → i</code> and move on.</p>' },
    { cat: 'abstraction', q: 'Why a Map rather than a Set here?', choices: ['Sets can’t hold numbers', 'Because you need the <em>index</em> of the earlier element, not just its presence', 'Maps are faster', 'No reason — Set would be identical'], answer: 1,
      explain: '<p>The output is indices, so you must remember <em>where</em> each value was seen: value → index. If the output were the values, a Set would do.</p>' },
    { cat: 'edge', q: '<code>findPair([3, 2, 4], 6)</code> — what’s the trap?', choices: ['There is no answer', 'Returning <code>[0, 0]</code> by pairing the 3 with itself', 'Integer overflow', 'Negative numbers'], answer: 1,
      explain: '<p>3 + 3 = 6, but there’s only one 3. Checking the map <em>before</em> inserting the current element prevents self-pairing naturally. The right answer is <code>[1, 2]</code> (2 + 4).</p>' },
    { cat: 'complexity', q: 'Time complexity of the one-pass version vs brute force?', choices: ['O(n) vs O(n²)', 'O(n log n) vs O(n²)', 'O(n) vs O(n log n)', 'Both O(n)'], answer: 0,
      explain: '<p>Say the contrast explicitly: “the nested loop is O(n²); indexing complements in a map makes it O(n) with O(n) extra space.”</p>' },
    { type: 'text', cat: 'explanation', q: 'Explain the one-pass idea, including why an element can’t pair with itself.', min: 40,
      model: '<p>“For each element I look up its complement, target minus the value, in a Map of values seen so far mapped to their index. If it’s there I return both indices; otherwise I record the current value. Because I check before inserting, the map only ever holds earlier elements, so nothing pairs with itself. O(n) time and space instead of the O(n²) nested loop.”</p>' }
  ],
  starter: `
function findPair(nums, target) {
  // return [i, j] or null
}`,
  harness: () => ({
    validPair(nums, target, out) {
      if (!Array.isArray(out) || out.length !== 2) return false;
      const [i, j] = out;
      return Number.isInteger(i) && Number.isInteger(j) && i !== j && i >= 0 && j >= 0 && i < nums.length && j < nums.length && nums[i] + nums[j] === target;
    },
    anyPair(nums, target) {
      for (let i = 0; i < nums.length; i++) for (let j = i + 1; j < nums.length; j++) if (nums[i] + nums[j] === target) return [i, j];
      return null;
    }
  }),
  check: (out, args, H) => {
    const [nums, target] = args;
    const exists = H.anyPair(nums, target);
    if (!exists) return { ok: out === null, expected: 'null — no pair sums to ' + target };
    return { ok: H.validPair(nums, target, out), expected: 'two distinct indices i, j with nums[i] + nums[j] === ' + target + ' (e.g. [' + exists + '])' };
  },
  tests: [
    { name: 'example', args: [[2, 7, 11, 15], 9] },
    { name: 'no pair → null', args: [[1, 2, 3], 100] },
    { name: 'must not pair an element with itself', args: [[3, 2, 4], 6] },
    { name: 'duplicate values form the pair', args: [[3, 3], 6] },
    { name: 'negative numbers', args: [[-5, 10, 3, -3], 0] },
    { name: 'empty input', args: [[], 5] },
    { name: 'single element', args: [[5], 5] },
    { name: 'pair is the last two elements', args: [[1, 4, 9, 20, 11], 31] },
    { name: 'zero target with zeros', args: [[0, 4, 0], 0] }
  ],
  antiSolutions: [
    { name: 'pairs element with itself', code: 'function findPair(nums, target) { const m = new Map(); nums.forEach((x, i) => m.set(x, i)); for (let i = 0; i < nums.length; i++) { if (m.has(target - nums[i])) return [i, m.get(target - nums[i])]; } return null; }' },
    { name: 'returns values instead of indices', code: 'function findPair(nums, target) { const s = new Set(); for (const x of nums) { if (s.has(target - x)) return [target - x, x]; s.add(x); } return null; }' }
  ],
  ownTests: true,
  ownTemplate: `
[
  { name: 'simple pair', args: [[1, 5, 3], 8], expect: [1, 2] },
  // add at least two more: no pair, a self-pair trap, negatives…
]`,
  coverage: [
    { label: 'no pair exists', hit: args => { const [n, t] = args; if (!Array.isArray(n)) return false; for (let i = 0; i < n.length; i++) for (let j = i + 1; j < n.length; j++) if (n[i] + n[j] === t) return false; return true; } },
    { label: 'self-pair trap (x + x = target, single x)', hit: args => { const [n, t] = args; return Array.isArray(n) && n.some(x => x * 2 === t && n.filter(y => y === x).length === 1); } },
    { label: 'negative numbers', hit: args => Array.isArray(args[0]) && args[0].some(x => x < 0) },
    { label: 'empty or single element', hit: args => Array.isArray(args[0]) && args[0].length < 2 }
  ],
  hints: [
    '<p>For each element, the question is “have I already seen the number that would complete the sum?”</p>',
    '<p>Keep a <code>Map</code> from value → index. Check <code>map.has(target - nums[i])</code> <em>before</em> inserting <code>nums[i]</code>.</p>',
    '<p><code>for (let i…) { const need = target - nums[i]; if (seen.has(need)) return [seen.get(need), i]; seen.set(nums[i], i); } return null;</code></p>'
  ],
  solution: `
function findPair(nums, target) {
  const seen = new Map();            // value → index
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need), i];
    seen.set(nums[i], i);            // insert AFTER checking → no self-pairing
  }
  return null;
}`,
  solutionExplain: '<p>Check-then-insert ordering is the whole correctness argument: when you look up the complement, the map only contains <em>earlier</em> indices, so <code>i</code> can never pair with itself, and every earlier candidate has been recorded.</p>',
  complexity: '<p>“O(n) time, O(n) space, versus O(n²) time / O(1) space for the nested loop. If the array were sorted I could do two pointers in O(n) time and O(1) space — but sorting an unsorted input would cost O(n log n) and lose the original indices.”</p>',
  followUp: {
    q: 'Follow-up: “Return <em>all</em> pairs of indices that sum to the target.” What changes?',
    choices: ['Nothing — return on the first match', 'Map value → <em>list</em> of indices (or keep scanning and collect); for each element, pair it with every earlier index of the complement', 'Use a Set instead of a Map', 'You need to sort'],
    answer: 1,
    explain: '<p>The complement lookup stays; only the bookkeeping grows: each value may have several earlier indices, so store an array per value and collect instead of returning. Output can be O(n²) pairs in the worst case — say so.</p>'
  }
})}
`
      },

      /* ------------------------------------------------ 2.5 ------ */
      {
        type: 'quiz',
        title: 'Quiz: maps & sets',
        questions: [
          { q: 'Which is the correct way to increment a count for key <code>k</code> in a <code>Map</code> that may not contain it yet?',
            choices: ['<code>m.set(k, m.get(k) + 1)</code>', '<code>m.set(k, (m.get(k) ?? 0) + 1)</code>', '<code>m[k]++</code>', '<code>m.add(k)</code>'], answer: 1,
            explain: '<p><code>undefined + 1</code> is <code>NaN</code>. <code>m[k]</code> sets a property on the Map object, not an entry. <code>add</code> is a Set method.</p>' },
          { q: 'A map stores each account’s balance, and new accounts start at 0. Which check correctly detects “account exists”?',
            choices: ['<code>if (balances.get(id))</code>', '<code>if (balances.get(id) !== undefined)</code> or <code>balances.has(id)</code>', '<code>if (balances[id])</code>', '<code>if (balances.get(id) != null && balances.get(id) > 0)</code>'], answer: 1,
            explain: '<p>A balance of 0 is falsy — <code>if (get())</code> would call an existing account missing. Presence ≠ truthiness.</p>' },
          { q: 'You need to check, for 50,000 transactions, whether each one’s account is in a list of 10,000 frozen accounts. Best approach?',
            choices: ['<code>frozen.includes(tx.account)</code> in the loop', 'Build a <code>Set</code> from the frozen list once, then <code>set.has()</code> per transaction', 'Sort both lists and merge', 'Nested loops but break early'], answer: 1,
            explain: '<p>O(10k + 50k) instead of O(10k × 50k) = 500M comparisons. “Index one side, scan the other” is the reflex.</p>' },
          { q: 'When does a <code>Set</code> beat a <code>Map</code>?',
            choices: ['When keys are numbers', 'When you only need presence, not an associated value — it states intent and avoids storing dummies', 'Never — Map is a superset', 'When there are fewer than 100 items'], answer: 1,
            explain: '<p>Both are O(1) average. Set says “membership only”; Map says “I need to get something back”. Choosing the narrower one is a readability signal.</p>' },
          { q: 'Group transactions by account into arrays. Which line prevents the “push to undefined” crash?',
            choices: ['<code>groups.get(k).push(tx)</code>', '<code>if (!groups.has(k)) groups.set(k, []); groups.get(k).push(tx);</code>', '<code>groups.set(k, [tx])</code>', '<code>groups.push(k, tx)</code>'], answer: 1,
            explain: '<p>Initialize-if-missing, then push. <code>groups.set(k, [tx])</code> would overwrite earlier transactions for that key.</p>' },
          { q: 'In the one-pass pair-sum, why must you insert the current element into the map <em>after</em> checking for its complement?',
            choices: ['Performance', 'So an element can’t be paired with itself when <code>x + x === target</code>', 'Because Map insertion order matters', 'It doesn’t matter'], answer: 1,
            explain: '<p>Insert-first would make <code>[3], target 6</code> return <code>[0, 0]</code>. Check-then-insert keeps the map strictly “earlier elements”.</p>' }
        ]
      }
    ]
  });
})();
