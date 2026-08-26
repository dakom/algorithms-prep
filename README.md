# Algo Prep — pattern-recognition coding interview training

**▶ Use it live: <https://dakom.github.io/algorithms-prep/>**

A self-contained, interactive training site for pattern-recognition-first
coding interviews: hash maps/sets, graph traversal, trees, intervals, heaps,
and stateful implementation, ending in a timed mock interview. Built for an
experienced developer who needs the interview *reflexes* — see the abstraction,
name the structure, explain, estimate complexity, implement, test, adapt —
rather than a full data-structures course.

## Run it locally

No build, no server — open `index.html` in Chrome:

```
open index.html
```

(Serving it — `python3 -m http.server` — works too.) Progress, code, timers and
scores persist in `localStorage` under `algo-prep-v1`.

## What's inside

- **10 modules · 36 sections**, ~3 hours on the recommended path (Modules 0–7),
  plus optional bonus topics (Module 8) and cheat sheets (Module 9).
- **17 staged exercises**. Each one gates the editor behind reasoning questions
  (abstraction, algorithm, complexity, edge cases, a free-text "say it out loud"
  compared against a model answer), then runs your code against hidden tests
  with progressive hints, then has you write your **own** tests (validated
  against a reference solution, with edge-case coverage chips), then scores you
  on a 100-point rubric and poses a follow-up requirement change.
- **A 5-stage project** (in-memory ledger: balances → transfers → history →
  idempotency → design discussion) in one editor, including a seeded 2,000-op
  simulation that checks money conservation and non-negative balances.
- **A 4-part timed mock interview** (suspicious transfer network) where the
  pattern is not announced.
- **BFS/DFS trace visualizers** (predict the next node on an SVG graph), live
  REPLs, fill-in-the-blank, spot-the-bug, ordering puzzles, quizzes, and a
  20-second-per-prompt pattern-recognition drill.
- Light/dark theme, ← / → keyboard navigation, dashboard with an exercise
  board.

## How the checking works

Learner code runs inside a **Web Worker** with a 2.5 s per-test timeout, so a
forgotten `visited` set on a cyclic graph produces a "timed out — probably an
infinite loop" lesson instead of a frozen tab. If Workers are unavailable the
runner falls back to the main thread with loop guards injected.

Tests are data (`{ name, args, expect }`), or a `run(Class, helpers)` scenario
for stateful exercises, or a `check(actual, args, helpers)` validator when many
answers are valid (any shortest path, any valid pair, tie order in top-K). Deep
equality is lenient across `Map`/object and `Set`/array so a learner who returns
a `Map` where the prompt showed an object still passes. Tests can flag input
mutation (`noMutate: 'fail'`).

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`: it syntax-checks every
script, runs `tools/selfcheck.js`, and publishes the repo root to GitHub Pages.
One-time setup in the repo: **Settings → Pages → Source: GitHub Actions**.

## Self-check

```
node tools/selfcheck.js
```

Loads every content module under a browser shim and verifies that every
reference solution passes its own hidden tests (and all earlier stages' tests
for multi-stage exercises), that starter code does *not* pass, that each
`antiSolution` (a deliberately wrong approach — no visited set, lexicographic
sort, off-by-one…) fails at least one test, that the own-tests validator accepts
the reference's expectations, and that every widget/quiz is answerable. Run it
after editing any content file.

## Layout

```
index.html            shell
css/style.css
js/highlight.js       syntax highlighter + T.* template helpers
js/runner-core.js     environment-agnostic test runner (worker + node)
js/runner.js          worker host, timeouts, fallback
js/editor.js          lightweight code editor
js/exercise.js        staged exercise widget, rubric scoring
js/widgets.js         mcq / multi / order / blanks / spotbug / repl / drill / trace
js/app.js             routing, sidebar, dashboard, quizzes, persistence
js/content/m0..m9.js  content modules
tools/selfcheck.js    offline verification of all exercises and widgets
```

## License

MIT — see [LICENSE](LICENSE).
