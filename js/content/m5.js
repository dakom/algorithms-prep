/* Module 5 — Sorting and Intervals */
(function () {
  const { code, callout, diagram, widget } = window.T;

  window.MODULES.push({
    title: 'Sorting & Intervals',
    blurb: 'Schedules, windows, overlapping ranges: sort first, then scan once',
    minutes: 20,
    sections: [

      /* ------------------------------------------------ 5.1 ------ */
      {
        type: 'read',
        title: 'Sort first, then scan',
        minutes: 10,
        html: `
<div class="big-quote">If the problem involves schedules, reservations, time ranges, windows, or timestamps — sort, then walk once.</div>

<p>Sorting by start time turns a messy 2-D “does anything overlap anything?” question (O(n²) to check every pair) into a 1-D scan: after sorting, an interval can only overlap the ones right before it. O(n log n) for the sort, O(n) for the scan.</p>

${diagram(`
unsorted:  [8,10] [1,4] [9,12] [2,5]
sorted:    [1,4] [2,5] [8,10] [9,12]
scan:      cur=[1,4]  → [2,5] overlaps (2 ≤ 4) → cur=[1,5]
                      → [8,10] no (8 > 5)      → emit [1,5], cur=[8,10]
                      → [9,12] overlaps        → cur=[8,12]
           end        → emit [8,12]           (don't lose the last one!)`)}

<h2>Two conventions you must state out loud</h2>
<table>
<tr><th>Question</th><th>Convention this site uses</th><th>Say</th></tr>
<tr><td>Do <code>[1,2]</code> and <code>[2,3]</code> overlap for <em>merging</em>?</td><td><strong>Yes</strong> — touching intervals merge into <code>[1,3]</code> (condition: <code>next.start ≤ cur.end</code>)</td><td>“I’ll treat touching ranges as mergeable — shout if you want them separate.”</td></tr>
<tr><td>Is a meeting ending at 10 in <em>conflict</em> with one starting at 10?</td><td><strong>No</strong> — back-to-back is fine (conflict: <code>next.start &lt; prev.end</code>)</td><td>“I’ll assume back-to-back meetings don’t conflict.”</td></tr>
</table>
<p>Different conventions, on purpose: real prompts vary, and the point is that the ≤ vs &lt; choice is a <em>business rule you confirm</em>, not something you guess.</p>

<h2>The JavaScript sort trap</h2>
${widget('repl', {
  label: 'Run it — default sort is lexicographic',
  q: 'Predict, then run.',
  name: 'sort-trap.js',
  code: `
console.log([10, 9, 1, 100].sort());                       // strings!
console.log([10, 9, 1, 100].sort((a, b) => a - b));        // numbers
console.log([[10, 12], [9, 11], [1, 2]].sort());            // arrays → "10,12" < "9,11"
console.log([[10, 12], [9, 11], [1, 2]].sort((a, b) => a[0] - b[0]));

const original = [[3, 4], [1, 2]];
const sorted = original.sort((a, b) => a[0] - b[0]);
console.log(original === sorted, original);                // sort() MUTATES the caller's array
console.log([...original].reverse(), original);            // copy first if you must not`,
  explain: '<p>Three interview-grade facts: (1) <code>sort()</code> without a comparator compares <em>strings</em>; (2) always pass <code>(a, b) => a[0] - b[0]</code>; (3) <code>sort</code> mutates in place — copy with <code>[...arr]</code> or <code>arr.slice()</code> (or use <code>toSorted</code>) when the caller’s input must stay intact. Mutating input is on every interviewer’s mental checklist.</p>'
})}

${widget('mcq', {
  label: 'The overlap condition',
  q: 'Intervals are sorted by start. <code>cur = [1, 5]</code>. Which condition means the next interval <code>[s, e]</code> overlaps (or touches) <code>cur</code>?',
  choices: ['<code>s &lt; 1</code>', '<code>s &lt;= 5</code> — its start is not past the current end', '<code>e &gt; 5</code>', '<code>s &lt; e</code>'],
  answer: 1,
  explain: '<p>Because of the sort, <code>s ≥ 1</code> is guaranteed; the only question is whether it starts before (or at) the current end. When merging, the new end is <code>Math.max(5, e)</code> — not just <code>e</code> — to handle a fully contained interval like <code>[2, 3]</code>.</p>'
})}

${widget('breakit', {
  label: 'Break it — the merge that shrinks',
  q: 'This merge sorts correctly and handles the example. It has one wrong line. Construct an <code>intervals</code> input on which it returns the wrong result.',
  fn: 'mergeIntervals',
  name: 'mergeIntervals.js — passes the example',
  buggy: `
function mergeIntervals(intervals) {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const result = [];
  let cur = [...sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const [start, end] = sorted[i];
    if (start <= cur[1]) cur[1] = end;
    else { result.push(cur); cur = [start, end]; }
  }
  result.push(cur);
  return result;
}`,
  solution: `
function mergeIntervals(intervals) {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const result = [];
  let cur = [...sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const [start, end] = sorted[i];
    if (start <= cur[1]) cur[1] = Math.max(cur[1], end);
    else { result.push(cur); cur = [start, end]; }
  }
  result.push(cur);
  return result;
}`,
  argsTemplate: `
[
  [[1, 4], [2, 5], [8, 10], [9, 12]]   // intervals — this one passes; change it
]`,
  sampleBreak: [[[1, 10], [2, 3]]],
  sampleOk: [[[[1, 4], [2, 5], [8, 10], [9, 12]]], [[[1, 2], [2, 3]]]],
  hint: 'What if the next interval is entirely <em>inside</em> the current one?',
  explain: '<p><code>cur[1] = end</code> shrinks the current interval when the next one is contained in it. The fix is <code>Math.max(cur[1], end)</code>. “Fully contained” is the hidden test on every interval problem — and now it’s the test <em>you</em> reach for first.</p>'
})}

${widget('exercise', {
  id: 'ex-5-1',
  title: 'mergeIntervals(intervals)',
  time: 8,
  fn: 'mergeIntervals',
  prompt: `<p>Given <code>[start, end]</code> pairs in any order, return the merged, non-overlapping intervals sorted by start. Touching intervals (<code>[1,2]</code> and <code>[2,3]</code>) merge. Do not mutate the input.</p>
${code('js', 'example', `mergeIntervals([[1, 4], [2, 5], [8, 10], [9, 12]])   // [[1, 5], [8, 12]]`)}`,
  reasoning: [
    { cat: 'abstraction', q: 'Which pattern?', choices: ['Graph — intervals connected if overlapping, then components', 'Sort by start, then a single scan merging into a “current” interval', 'Heap of end times', 'Two nested loops comparing every pair'], answer: 1,
      explain: '<p>The graph view is technically valid (and O(n²)); sort + scan is the expected O(n log n).</p>' },
    { cat: 'algorithm', q: 'When the next interval overlaps the current one, the new end is…', choices: ['<code>next.end</code>', '<code>Math.max(cur.end, next.end)</code> — the next interval might be entirely inside the current one', '<code>cur.end + next.end</code>', '<code>next.start</code>'], answer: 1,
      explain: '<p><code>[1, 10]</code> then <code>[2, 3]</code>: taking <code>next.end</code> would shrink the current interval to <code>[1, 3]</code>. Fully-contained is the classic hidden test.</p>' },
    { cat: 'edge', q: 'Which of these is the most common bug in this problem?', choices: ['Sorting descending', 'Forgetting to push the final “current” interval after the loop', 'Using a Set', 'Off-by-one in the loop index'], answer: 1,
      explain: '<p>The scan emits an interval only when the <em>next</em> one doesn’t overlap — so the last one is never emitted inside the loop. Push it after.</p>' },
    { cat: 'complexity', q: 'Complexity?', choices: ['O(n) — one scan', 'O(n log n) — the sort dominates; the scan is O(n)', 'O(n²)', 'O(log n)'], answer: 1,
      explain: '<p>Say both parts: “sort is n log n, the merge pass is linear, so n log n overall; O(n) space for the output (or O(1) extra if sorting in place were allowed).”</p>' },
    { type: 'text', cat: 'explanation', q: 'Explain the algorithm in three sentences, including the convention you’re assuming for touching intervals.', min: 50,
      model: '<p>“I’ll sort a copy of the intervals by start so each one can only overlap the current merged interval. Walking through, if the next start is at or before the current end — I’m treating touching intervals as mergeable — I extend the current end to the max of the two; otherwise I emit the current interval and start a new one, remembering to emit the last one after the loop. O(n log n) from the sort, O(n) space.”</p>' }
  ],
  starter: `
function mergeIntervals(intervals) {
  // copy + sort by start, then scan
}`,
  tests: [
    { name: 'example', args: [[[1, 4], [2, 5], [8, 10], [9, 12]]], expect: [[1, 5], [8, 12]] },
    { name: 'empty input', args: [[]], expect: [] },
    { name: 'single interval', args: [[[3, 7]]], expect: [[3, 7]] },
    { name: 'fully contained interval', args: [[[1, 10], [2, 3], [4, 5]]], expect: [[1, 10]] },
    { name: 'touching intervals merge', args: [[[1, 2], [2, 3]]], expect: [[1, 3]] },
    { name: 'unsorted input', args: [[[8, 10], [1, 4], [9, 12], [2, 5]]], expect: [[1, 5], [8, 12]] },
    { name: 'no overlaps at all', args: [[[5, 6], [1, 2], [3, 4]]], expect: [[1, 2], [3, 4], [5, 6]] },
    { name: 'numeric sort required (lexicographic would break)', args: [[[5, 6], [10, 11], [7, 8]]], expect: [[5, 6], [7, 8], [10, 11]] },
    { name: 'chain that merges everything', args: [[[1, 3], [2, 4], [3, 5], [4, 6]]], expect: [[1, 6]] },
    { name: 'last interval is not lost', args: [[[1, 2], [5, 6]]], expect: [[1, 2], [5, 6]] },
    { name: 'input must not be mutated', args: [[[3, 4], [1, 2]]], expect: [[1, 2], [3, 4]], noMutate: 'fail' },
    { name: 'same start, different ends', args: [[[1, 5], [1, 3], [1, 8]]], expect: [[1, 8]] }
  ],
  antiSolutions: [
    { name: 'sorts in place (mutates input)', code: 'function mergeIntervals(iv) { if (!iv.length) return []; iv.sort((a, b) => a[0] - b[0]); const out = [[...iv[0]]]; for (let i = 1; i < iv.length; i++) { const cur = out[out.length - 1]; if (iv[i][0] <= cur[1]) cur[1] = Math.max(cur[1], iv[i][1]); else out.push([...iv[i]]); } return out; }' },
    { name: 'uses next.end instead of max', code: 'function mergeIntervals(iv) { const s = [...iv].sort((a, b) => a[0] - b[0]); const out = []; for (const [a, b] of s) { const cur = out[out.length - 1]; if (cur && a <= cur[1]) cur[1] = b; else out.push([a, b]); } return out; }' },
    { name: 'default (lexicographic) sort', code: 'function mergeIntervals(iv) { const s = [...iv].sort(); const out = []; for (const [a, b] of s) { const cur = out[out.length - 1]; if (cur && a <= cur[1]) cur[1] = Math.max(cur[1], b); else out.push([a, b]); } return out; }' },
    { name: 'loses the last interval', code: 'function mergeIntervals(iv) { if (!iv.length) return []; const s = [...iv].sort((a, b) => a[0] - b[0]); const out = []; let cur = [...s[0]]; for (let i = 1; i < s.length; i++) { if (s[i][0] <= cur[1]) cur[1] = Math.max(cur[1], s[i][1]); else { out.push(cur); cur = [...s[i]]; } } return out; }' }
  ],
  ownTests: true,
  ownTemplate: `
[
  { name: 'two separate', args: [[[1, 2], [4, 5]]], expect: [[1, 2], [4, 5]] },
  // add at least two more — contained, touching, unsorted, empty…
]`,
  coverage: [
    { label: 'empty input', hit: args => Array.isArray(args[0]) && args[0].length === 0 },
    { label: 'unsorted input', hit: args => Array.isArray(args[0]) && args[0].some((iv, i) => i > 0 && iv[0] < args[0][i - 1][0]) },
    { label: 'fully contained interval', hit: args => Array.isArray(args[0]) && args[0].some(a => args[0].some(b => a !== b && a[0] <= b[0] && b[1] <= a[1] && (a[0] < b[0] || b[1] < a[1]))) },
    { label: 'touching intervals', hit: args => Array.isArray(args[0]) && args[0].some(a => args[0].some(b => a !== b && a[1] === b[0])) }
  ],
  hints: [
    '<p>Sort a <em>copy</em> by start: <code>const s = [...intervals].sort((a, b) => a[0] - b[0])</code>.</p>',
    '<p>Keep <code>cur</code> = a copy of the first interval. For each next: overlap if <code>next[0] &lt;= cur[1]</code>.</p>',
    '<p>On overlap: <code>cur[1] = Math.max(cur[1], next[1])</code>. Otherwise push <code>cur</code> and start a new one.</p>',
    '<p>After the loop, push the final <code>cur</code>. Handle the empty input before touching <code>s[0]</code>.</p>'
  ],
  solution: `
function mergeIntervals(intervals) {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);   // copy: don't mutate input
  const result = [];
  let cur = [...sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const [start, end] = sorted[i];
    if (start <= cur[1]) {                    // overlaps or touches
      cur[1] = Math.max(cur[1], end);         // max: handles fully-contained
    } else {
      result.push(cur);
      cur = [start, end];
    }
  }
  result.push(cur);                           // the last interval
  return result;
}`,
  solutionExplain: '<p>If strictly-touching should <em>not</em> merge, the condition becomes <code>start &lt; cur[1]</code>. One character, so say the convention before writing it.</p>',
  complexity: '<p>“O(n log n) time, dominated by the sort; the scan is O(n). O(n) space for the sorted copy and the output.”</p>',
  followUp: {
    q: 'Follow-up: “Given the merged intervals, find the total covered length.” Change?',
    choices: ['Recompute from scratch with nested loops', 'Sum <code>end - start</code> over the merged result — merging already removed the double counting', 'Sort by end instead', 'Use a Set of integers'], answer: 1,
    explain: '<p>Merged intervals are disjoint, so the lengths add. This is why merging is usually step one of any “how much time is covered / free” question.</p>'
  }
})}
`
      },

      /* ------------------------------------------------ 5.2 ------ */
      {
        type: 'read',
        title: 'Exercise 5.2 — Can attend all meetings?',
        minutes: 6,
        html: `
<p>Same pattern, less code: sort by start, then compare each meeting only with the one before it. Back-to-back meetings (<code>[9,10]</code> and <code>[10,11]</code>) do <strong>not</strong> conflict here — note the different convention from merging, and say it.</p>

${widget('exercise', {
  id: 'ex-5-2',
  title: 'hasConflict(intervals)',
  time: 5,
  fn: 'hasConflict',
  prompt: `<p>Given meetings as <code>[start, end]</code> in any order, return <code>true</code> if any two overlap. A meeting that starts exactly when another ends is <em>not</em> a conflict. Do not mutate the input.</p>
${code('js', 'example', `hasConflict([[9, 10], [10, 11]])   // false (back-to-back)
hasConflict([[9, 11], [10, 12]])   // true`)}`,
  reasoning: [
    { cat: 'algorithm', q: 'After sorting by start, which pairs need checking?', choices: ['Every pair', 'Only each interval against the one immediately before it', 'Only the first and last', 'Each interval against all earlier ones'], answer: 1,
      explain: '<p>If interval i doesn’t overlap i−1 (which starts no later than anything before it and — for a conflict-free prefix — ends latest), it overlaps nothing earlier. That’s the argument the sort buys you.</p>' },
    { cat: 'edge', q: 'The conflict condition with sorted intervals is…', choices: ['<code>next.start &lt;= prev.end</code>', '<code>next.start &lt; prev.end</code> — strictly before, so back-to-back is allowed', '<code>next.end &lt; prev.end</code>', '<code>next.start === prev.start</code>'], answer: 1,
      explain: '<p>Strict inequality encodes the “back-to-back is fine” rule. Compare with merging, where ≤ merged touching intervals.</p>' },
    { cat: 'complexity', q: 'Complexity?', choices: ['O(n)', 'O(n log n) for the sort', 'O(n²)', 'O(1)'], answer: 1,
      explain: '<p>Sort dominates. Without sorting you’d need every pair: O(n²).</p>' },
    { type: 'text', cat: 'explanation', q: 'State the convention you’re assuming and the approach, in two sentences.', min: 30,
      model: '<p>“I’ll assume back-to-back meetings don’t conflict — a meeting starting exactly when another ends is fine. Sort a copy by start time and compare each meeting with the one before it: if it starts strictly before the previous one ends, that’s a conflict. O(n log n) from the sort.”</p>' }
  ],
  ownTests: true,
  ownTemplate: `
[
  { name: 'clear overlap', args: [[[1, 5], [3, 6]]], expect: true },
  // add at least two more — back-to-back, unsorted input hiding a conflict, empty…
]`,
  coverage: [
    { label: 'back-to-back (not a conflict)', hit: args => Array.isArray(args[0]) && args[0].some(a => args[0].some(b => a !== b && a[1] === b[0])) },
    { label: 'unsorted input', hit: args => Array.isArray(args[0]) && args[0].some((iv, i) => i > 0 && iv[0] < args[0][i - 1][0]) },
    { label: 'no conflict with 2+ meetings', hit: args => { const iv = args[0]; if (!Array.isArray(iv) || iv.length < 2) return false; const s = [...iv].sort((a, b) => a[0] - b[0]); for (let i = 1; i < s.length; i++) if (s[i][0] < s[i - 1][1]) return false; return true; } },
    { label: 'fully contained meeting', hit: args => Array.isArray(args[0]) && args[0].some(a => args[0].some(b => a !== b && a[0] <= b[0] && b[1] <= a[1] && (a[0] < b[0] || b[1] < a[1]))) }
  ],
  starter: `
function hasConflict(intervals) {
  // sort a copy by start; compare neighbors
}`,
  tests: [
    { name: 'back-to-back is not a conflict', args: [[[9, 10], [10, 11]]], expect: false },
    { name: 'overlap', args: [[[9, 11], [10, 12]]], expect: true },
    { name: 'empty', args: [[]], expect: false },
    { name: 'single meeting', args: [[[1, 2]]], expect: false },
    { name: 'conflict only visible after sorting', args: [[[13, 14], [1, 5], [10, 12], [4, 6]]], expect: true },
    { name: 'sorted, no conflicts', args: [[[1, 2], [3, 4], [5, 6]]], expect: false },
    { name: 'fully contained meeting', args: [[[1, 10], [3, 4]]], expect: true },
    { name: 'same start time', args: [[[5, 6], [5, 7]]], expect: true },
    { name: 'input not mutated', args: [[[3, 4], [1, 2]]], expect: false, noMutate: 'fail' },
    { name: 'numeric sort required', args: [[[10, 11], [9, 12]]], expect: true }
  ],
  antiSolutions: [
    { name: 'no sort, compares input neighbors only', code: 'function hasConflict(iv) { for (let i = 1; i < iv.length; i++) if (iv[i][0] < iv[i - 1][1]) return true; return false; }' },
    { name: 'treats back-to-back as conflict', code: 'function hasConflict(iv) { const s = [...iv].sort((a, b) => a[0] - b[0]); for (let i = 1; i < s.length; i++) if (s[i][0] <= s[i - 1][1]) return true; return false; }' },
    { name: 'sorts the caller’s array', code: 'function hasConflict(iv) { iv.sort((a, b) => a[0] - b[0]); for (let i = 1; i < iv.length; i++) if (iv[i][0] < iv[i - 1][1]) return true; return false; }' }
  ],
  hints: [
    '<p>Sort a copy by start time.</p>',
    '<p><code>for (let i = 1; …) if (s[i][0] &lt; s[i-1][1]) return true;</code> then <code>return false</code>.</p>'
  ],
  solution: `
function hasConflict(intervals) {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i][0] < sorted[i - 1][1]) return true;   // strict: back-to-back is fine
  }
  return false;
}`,
  solutionExplain: '<p>Subtle point worth saying: comparing only with <code>i − 1</code> is enough because we return at the <em>first</em> conflict, so whenever we compare, everything before <code>i − 1</code> ended before <code>i − 1</code> started. For the “how many rooms do I need” variant that no longer holds — that one needs a min-heap of end times (Module 6).</p>',
  complexity: '<p>“O(n log n) time from the sort, O(n) space for the copy.”</p>',
  followUp: {
    q: 'Follow-up: “What is the minimum number of rooms needed to hold all meetings?” Which structure appears?',
    choices: ['Nothing new — count conflicts', 'A min-heap of end times: for each meeting (sorted by start), pop rooms that have ended, push this meeting’s end; the heap’s max size is the answer', 'A graph of overlapping meetings', 'A Set of start times'], answer: 1,
    explain: '<p>The classic escalation from Module 5 to Module 6. The heap tracks “which ongoing meeting ends soonest” in O(log n).</p>'
  }
})}
`
      },

      /* ------------------------------------------------ 5.3 ------ */
      {
        type: 'quiz',
        title: 'Quiz: intervals',
        questions: [
          { q: '<code>[[10,12],[9,11]].sort()</code> puts <code>[10,12]</code> first. Why?', choices: ['Because 10 &lt; 9 is true for arrays', 'The default sort compares string forms — <code>"10,12" &lt; "9,11"</code> lexicographically', 'Because sort is unstable', 'It doesn’t'], answer: 1,
            explain: '<p>Always pass a numeric comparator.</p>' },
          { q: 'Why sort before scanning intervals?', choices: ['To make output pretty', 'So an interval can only overlap the ones just before it, turning O(n²) pair checks into one O(n) pass', 'Sorting removes duplicates', 'JavaScript requires it'], answer: 1,
            explain: '<p>The sort is what makes the single scan correct.</p>' },
          { q: 'When merging, why <code>Math.max(cur.end, next.end)</code> rather than <code>next.end</code>?', choices: ['Performance', 'The next interval may be entirely inside the current one', 'To handle negative numbers', 'No reason'], answer: 1,
            explain: '<p>Fully-contained intervals shrink the result otherwise.</p>' },
          { q: 'The interviewer’s function must not modify its input array. Which is safe?', choices: ['<code>arr.sort(cmp)</code>', '<code>[...arr].sort(cmp)</code> or <code>arr.slice().sort(cmp)</code> or <code>arr.toSorted(cmp)</code>', '<code>arr.reverse().sort(cmp)</code>', '<code>Array.from(arr.sort(cmp))</code>'], answer: 1,
            explain: '<p>Copy first; the last option sorts in place before copying.</p>' },
          { q: 'Which requirement changes the overlap comparison from <code>&lt;=</code> to <code>&lt;</code>?', choices: ['Sorting descending', 'Whether touching ranges count as overlapping — a business rule to confirm, not guess', 'Using a heap', 'Negative intervals'], answer: 1,
            explain: '<p>Say the convention before writing the condition.</p>' }
        ]
      }
    ]
  });
})();
