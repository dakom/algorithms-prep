/* Module 1 — The Interview Loop */
(function () {
  const { code, callout, diagram, widget } = window.T;

  window.MODULES.push({
    title: 'The Interview Loop',
    blurb: 'How to attack any unfamiliar problem before touching syntax',
    minutes: 10,
    sections: [

      /* ------------------------------------------------ 1.1 ------ */
      {
        type: 'read',
        title: 'How this site works & the 8-step loop',
        minutes: 4,
        html: `
<p>You build things for a living; what you're missing is not programming ability, it's a <strong>reflex</strong>: seeing a prompt about accounts and transfers and instantly thinking "graph, BFS, visited set, O(V+E)". This site drills that reflex — and the habit of <em>saying it out loud before coding</em>, which is what an online coding assessment or live interview actually grades.</p>

<div class="big-quote">Explain → Implement → Test → Complexity → Follow-up. Every exercise here forces that order.</div>

<h2>What you'll be doing</h2>
<div class="two-col">
<div class="card"><h4>🧪 Exercises (the core)</h4><p>Each one is a small interview. You must answer reasoning questions to <strong>unlock the editor</strong>, then code against hidden tests (with progressive hints), then write your <strong>own</strong> tests — which are validated against a reference solution — then review the reference and handle a follow-up. You get a rubric score out of 100 that weights reasoning over syntax.</p></div>
<div class="card"><h4>🏗 Projects & 🎤 mock interview</h4><p>Module 7 evolves an in-memory ledger through five requirement changes in one editor — the "implement a small service" style interview. Module 8 is a timed, multi-part problem where the pattern is <em>not</em> announced.</p></div>
<div class="card"><h4>🔍 Visual traces & ⚡ drills</h4><p>Step through BFS/DFS on a real graph by predicting the next node. Finish with a timed pattern-recognition drill: read a prompt, name the approach in 20 seconds.</p></div>
<div class="card"><h4>💾 Progress</h4><p>Everything persists in this browser (localStorage): code, answers, scores, timers. The dashboard (⌂) shows the exercise board. ← / → keys move between sections.</p></div>
</div>

${callout('tip', 'Infinite loops are handled', `<p>Your code runs in a sandboxed worker with a 2.5s timeout. If you forget a <code>visited</code> set on a cyclic graph, the test reports <em>“timed out — probably an infinite loop”</em> instead of freezing the tab. That's a lesson, not a crash.</p>`)}

<h2>The loop</h2>
<p>Every problem, every time. Interviewers are grading whether you <em>have</em> a process at least as much as whether you finish.</p>
<ol class="loop-steps">
<li><strong>Restate the problem</strong> in one sentence. <span class="say-it">"So I need to determine whether there's any sequence of transfers from the source account to the destination."</span></li>
<li><strong>Identify entities and relationships.</strong> Accounts + transfers → graph. IDs + records → map. Timestamps + ranges → intervals. Hierarchy → tree. Top values → heap.</li>
<li><strong>Pin down the exact output.</strong> Existence? A count? The shortest path? The <em>actual</em> path? Top K? Grouped results? This decides the algorithm.</li>
<li><strong>Choose the data structures</strong> — <code>Map</code>, <code>Set</code>, queue, stack, adjacency list, heap, sorted array — and say <em>why</em>.</li>
<li><strong>Estimate complexity</strong> in terms of the real entities: "O(V + E), where V is accounts and E is transfers."</li>
<li><strong>Implement</strong> — the simplest correct version, narrating as you go.</li>
<li><strong>Test intentionally:</strong> empty input, one item, duplicates, missing target, cycles, disconnected pieces, malformed references, deep/large input.</li>
<li><strong>Respond to the follow-up.</strong> Requirements will change. The goal is to adapt what you have, not rewrite it.</li>
</ol>

${widget('order', {
  label: 'Put the loop in order',
  q: 'A prompt lands in the shared editor. Arrange a strong performance:',
  items: [
    'Restate the problem in your own words; ask one clarifying question about input shape or size',
    'Name the entities and relationships, and what exactly must be returned',
    'Say which data structures and algorithm you’ll use — and why',
    'State the expected time and space complexity',
    'Write the straightforward solution, narrating',
    'Walk through it with a concrete example, then name and test the edge cases',
    'Ask “what would you like to change?” — and adapt rather than rewrite'
  ],
  explain: '<p>Notice that code is step 5 of 7. Jumping to typing is the most common intermediate-level tell. Steps 1–4 cost about ninety seconds and are the cheapest way to look senior.</p>'
})}

<h2>The internal checklist to memorize</h2>
${diagram(`
What are the entities?
What relationships exist between them?
What output is actually required?
Is this reachability, shortest path, grouping, ordering, top-K, overlap, or state management?
What state must I remember?
What invariant makes this algorithm correct?`)}
`
      },

      /* ------------------------------------------------ 1.2 ------ */
      {
        type: 'read',
        title: 'Recognition: prompt → structure',
        minutes: 4,
        html: `
<p>Most interview problems are one of about a dozen shapes wearing a business costume. The whole game is mapping the costume to the shape fast. Here's the table; the rest of the site makes each row a reflex.</p>

<table>
<tr><th>Prompt contains…</th><th>Think…</th></tr>
${window.T.patternRow('“Have we seen this?”, “any duplicates?”', 'Set')}
${window.T.patternRow('“Find by ID”, “look up”', 'Map')}
${window.T.patternRow('“Count / group / total by…”', 'Map (aggregate)')}
${window.T.patternRow('“Connected to…”, “A transfers to B”, “depends on”', 'Graph')}
${window.T.patternRow('“Can A reach B?”, “is there a path?”', 'DFS / BFS + visited')}
${window.T.patternRow('“Fewest hops / shortest number of steps”', 'BFS')}
${window.T.patternRow('“Circular dependency”, “cycle”', 'Directed cycle detection (DFS)')}
${window.T.patternRow('“Hierarchy”, “org chart”, “nested”', 'Tree traversal')}
${window.T.patternRow('“Overlapping time ranges”, “schedules”, “windows”', 'Sort + scan')}
${window.T.patternRow('“Top K”, “K largest”, “repeatedly extract min/max”', 'Heap')}
${window.T.patternRow('“Sorted input”, “find first index where…”', 'Binary search / two pointers')}
${window.T.patternRow('“Contiguous subarray / window of size k”', 'Sliding window')}
${window.T.patternRow('“Implement X with methods… now add Y”', 'Stateful model: Maps + invariants + clean API')}
</table>

<h2>The output question is the fork in the road</h2>
<p>Two prompts can share entities and differ only in output — and that changes everything:</p>
<table>
<tr><th>Output required</th><th>Consequence</th></tr>
<tr><td><strong>existence</strong> (“can A reach B?”)</td><td>DFS or BFS; stop early; return boolean</td></tr>
<tr><td><strong>count</strong> (“how many reachable?”)</td><td>same traversal; count visited</td></tr>
<tr><td><strong>shortest path length</strong></td><td>BFS specifically; track distance</td></tr>
<tr><td><strong>the actual path</strong></td><td>BFS + <code>parent</code> map + reconstruct backwards</td></tr>
<tr><td><strong>top K</strong></td><td>aggregate first, then heap or sort</td></tr>
<tr><td><strong>grouped results</strong></td><td>Map of key → array</td></tr>
</table>

${widget('multi', {
  label: 'Which of these are graph problems in disguise?',
  q: 'Select every prompt where the right first move is “build an adjacency list”:',
  choices: [
    'Given service-to-service dependencies, detect a circular dependency',
    'Given a list of transaction IDs, find whether any ID repeats',
    'Given referral records (who invited whom), find how many users were ultimately brought in by user X',
    'Given meetings with start/end times, find whether a person can attend all of them',
    'Given a grid map with walls, decide whether the exit is reachable',
    'Given transactions, find the 5 accounts with the highest volume'
  ],
  answers: [0, 2, 4],
  explain: '<p>Dependencies, referrals, and grid cells are all <em>entities connected to entities</em> — graphs. Duplicates → Set. Meetings → sort + scan. Top-5 → Map + heap/sort. The grid is the sneaky one: “not every graph looks like <code>{A: [B]}</code>” (Module 3 makes that concrete).</p>'
})}

${widget('mcq', {
  label: 'The output fork',
  q: '“Return the chain of accounts money passed through from A to D, using as few hops as possible.” What does the word <em>chain</em> add to the requirements versus “can A reach D?”',
  choices: [
    'Nothing — same traversal, return true instead of the path',
    'You must use DFS because it naturally follows a chain',
    'You need BFS (for fewest hops) <em>and</em> a parent map so the path can be reconstructed backwards from D',
    'You need to sort the transfers by amount first'
  ],
  answer: 2,
  explain: '<p>“Fewest hops” → BFS. “Return the chain” → you need to remember how each node was discovered: <code>parent.set(child, node)</code>, then walk back from D to A and reverse. Existence problems need neither.</p>'
})}
`
      },

      /* ------------------------------------------------ 1.3 ------ */
      {
        type: 'read',
        title: 'Micro-exercise: duplicate user IDs (no code)',
        minutes: 2,
        html: `
<p>Run the loop on the smallest possible problem. No editor — the point is the <em>talk</em>.</p>

<div class="big-quote">“Given a list of user IDs, return whether any ID appears twice.”</div>

<p class="say-it">Restate: “I need to return a boolean — true if any ID occurs more than once in the list.” Entities: IDs. Relationship: equality. Output: existence.</p>

${widget('mcq', {
  label: 'Step 4 — data structure',
  q: 'Which structure makes “have I seen this before?” an O(1) question?',
  choices: [
    'An array, checking <code>includes()</code> for each ID',
    'A <code>Set</code> of IDs seen so far',
    'A sorted array with binary search',
    'A <code>Map</code> from ID to its index, checked with <code>Object.keys</code>'
  ],
  answer: 1,
  explain: '<p><code>Set.has</code> is O(1) average. <code>includes()</code> is O(n) per check, so the whole thing becomes O(n²). Sorting works but costs O(n log n) and is more code. A Map works too but stores values you don’t need — Set signals intent.</p>'
})}

${widget('mcq', {
  label: 'Step 5 — complexity',
  q: 'With a Set, what are the time and space complexities for n IDs?',
  choices: [
    'O(n) time, O(1) space',
    'O(n log n) time, O(n) space',
    'O(n) time, O(n) space',
    'O(n²) time, O(n) space'
  ],
  answer: 2,
  explain: '<p>One pass over n IDs with O(1) work each → O(n) time. The Set can grow to n entries → O(n) space. Say the space part unprompted; it’s a cheap signal that you think about it.</p>'
})}

${widget('multi', {
  label: 'Step 7 — edge cases',
  q: 'Which inputs would you name as tests before saying “done”?',
  choices: [
    'An empty list → false',
    'A single ID → false',
    'The duplicate is the very last element',
    'IDs that differ only by case, e.g. <code>"abc"</code> vs <code>"ABC"</code> — ask whether they count as the same',
    'A list of one million IDs — confirms O(n) matters'
  ],
  answers: [0, 1, 2, 3, 4],
  explain: '<p>All of them. The case-sensitivity one is the kind of clarifying question that costs five seconds and earns real credit: it shows you know that “equal” is a business decision, not a language default.</p>'
})}

${callout('say', 'Say it out loud — the whole answer in 20 seconds', `<p>“IDs are the entities and I need existence of a repeat. I'll walk the list once with a Set of seen IDs; if an ID is already in the set I return true, otherwise add it; return false at the end. O(n) time, O(n) space for the set. Edge cases: empty list, single element, duplicate at the very end. Should case differences count as the same ID?”</p>`)}

<p>That paragraph is the template for every exercise from here on. Module 2 makes you type it.</p>
`
      },

      /* ------------------------------------------------ 1.4 ------ */
      {
        type: 'quiz',
        title: 'Quiz: the loop',
        intro: '<p>Five quick questions on process and recognition. 70%+ and move on — Module 2 starts the real work.</p>',
        questions: [
          {
            q: 'The interviewer says: “Given a list of accounts and transfers between them, return true if money could have moved from A to B.” What’s your <em>first</em> sentence?',
            choices: [
              '“I’ll write a nested loop over the transfers.”',
              '“So the accounts are nodes and transfers are directed edges, and I need reachability from A to B — a DFS or BFS with a visited set.”',
              '“What language should I use?”',
              '“I’ll sort the transfers by amount first.”'
            ],
            answer: 1,
            explain: '<p>Restate + entities + output + approach in one breath. It also invites the interviewer to correct a wrong assumption (are transfers directed?) before you’ve spent time coding.</p>'
          },
          {
            q: 'Which complexity statement would an interviewer rate highest for a graph traversal?',
            choices: [
              '“It’s linear.”',
              '“O(n).”',
              '“O(V + E), where V is the number of accounts and E the number of transfers — we touch each once.”',
              '“Pretty fast, it’s just one loop.”'
            ],
            answer: 2,
            explain: '<p>Complexity should be expressed in the problem’s own entities, with the reason (“touch each once”). “O(n)” is ambiguous when there are two input sizes.</p>'
          },
          {
            q: '“Group transactions by account and total them” — what should the output-shape question in your head resolve to?',
            choices: [
              'Existence → boolean',
              'Grouped/aggregated results → a Map from account to total',
              'Shortest path → BFS',
              'Top K → heap'
            ],
            answer: 1,
            explain: '<p>“Group by” / “total by” is aggregation: one Map, one pass, accumulate. Module 2 drills the <code>(map.get(k) ?? 0) + amount</code> idiom.</p>'
          },
          {
            q: 'You finished coding. The interviewer is silent. What’s the best next move?',
            choices: [
              'Wait for them to say something',
              'Start optimizing the constant factors',
              'Walk through one concrete example by hand, then list the edge cases you’d test — empty input, one element, cycle, no path',
              'Ask if you got the job'
            ],
            answer: 2,
            explain: '<p>Testing is step 7 of the loop and is graded. Silence after coding is an invitation to demonstrate it. Three tests minimum: normal, edge, adversarial.</p>'
          },
          {
            q: 'The follow-up: “now ignore transfers under $10.” The strongest response is to…',
            choices: [
              'Rewrite the solution from scratch with the new rule',
              'Say it can’t be done with the current approach',
              'Add a filter when building the adjacency list (or when iterating neighbors) and note that the traversal itself is unchanged',
              'Sort transfers by amount and binary-search for $10'
            ],
            answer: 2,
            explain: '<p>Follow-ups test whether your structure was sound. A good design absorbs the change at one point — the edge-building step — and everything else stays as is. Saying “the traversal is unchanged” shows you see the layers.</p>'
          }
        ]
      }
    ]
  });
})();
