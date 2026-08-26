/* Module 7 — Stateful Implementation: the in-memory ledger project */
(function () {
  const { code, callout, diagram, widget } = window.T;

  const ledgerHarness = () => ({
    rng(seed) {   // deterministic PRNG so the simulation is reproducible
      let s = seed >>> 0;
      return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
    },
    hist(l, id) {  // normalize history entries to the fields we compare
      return (l.getTransactions(id) || []).map(t => {
        const o = { type: t.type, amount: t.amount };
        if (t.counterparty !== undefined) o.counterparty = t.counterparty;
        return o;
      });
    }
  });

  window.MODULES.push({
    title: 'Stateful Implementation',
    blurb: 'Implement a small service whose requirements keep changing — the interview style that feels least like a puzzle site',
    minutes: 30,
    sections: [

      /* ------------------------------------------------ 7.1 ------ */
      {
        type: 'read',
        title: 'Evolving a stateful model without rewriting it',
        minutes: 5,
        html: `
<p>A large share of practical interviews look like this: “implement a class with three methods” … “now add transfers” … “now add history” … “now make it idempotent” … “what breaks under concurrency?”. Nobody is checking Big-O here. They're checking whether you:</p>
<ul>
<li>define <strong>error behavior</strong> before it's asked (“withdrawing more than the balance returns false and changes nothing”),</li>
<li>keep <strong>invariants</strong> explicit (“no balance is ever negative”; “a transfer never creates or destroys money”),</li>
<li>avoid <strong>partial application</strong> of failed operations (check everything, <em>then</em> mutate),</li>
<li>evolve the <strong>data model</strong> without breaking the earlier methods,</li>
<li>keep side effects <strong>single</strong> (idempotency keys) and can reason about persistence and concurrency out loud.</li>
</ul>

${diagram(`
state:     Map<accountId, balance>              ← stage 1
        +  Map<accountId, transaction[]>         ← stage 3   (or one global log, filtered)
        +  Map<idempotencyKey, result>           ← stage 4

rule:      validate → check funds → THEN mutate all → record history      (never mutate then discover a failure)`)}

${callout('key', 'The three sentences that make this interview go well', `
<ul>
<li>“New accounts start at zero, so <code>getBalance</code> of an unknown account is 0, not undefined.”</li>
<li>“Every mutating method validates first and returns a boolean; nothing changes on false.”</li>
<li>“Invariant: the sum of all balances only changes by successful deposits and withdrawals — transfers move money, they never create it.”</li>
</ul>`)}

${widget('mcq', {
  label: 'Partial application',
  q: '<code>transfer(from, to, amount)</code> is implemented as <code>withdraw(from, amount); deposit(to, amount);</code>. What’s wrong?',
  choices: [
    'Nothing — that’s the correct decomposition',
    'If the withdraw fails (insufficient funds) but the code doesn’t check its result, the deposit still happens: money is created. Even if it checks, the two-step shape invites a partially-applied state on any future error between them',
    'Deposits should come before withdrawals',
    'It’s too slow'
  ],
  answer: 1,
  explain: '<p>Reusing <code>withdraw</code>/<code>deposit</code> is fine <em>if</em> you check the withdraw result and return before depositing — and note that the history log would then record a “withdraw” and a “deposit” rather than a transfer. The cleanest version validates funds, then mutates both balances directly. Either way: say “nothing changes on failure”.</p>'
})}
`
      },

      /* ------------------------------------------------ 7.2 ------ */
      {
        type: 'project',
        title: 'Project: the in-memory wallet ledger',
        minutes: 25,
        checklist: [
          'Stage 1: validation before mutation; unknown accounts read as 0',
          'Stage 2: transfer is all-or-nothing; the money-conservation simulation passes',
          'Stage 3: history added <em>without</em> changing the stage-1/2 methods’ behavior',
          'Stage 4: an idempotency key replays the prior result without re-executing',
          'Stage 5: can explain concurrency, atomicity, persistence and key-reuse out loud'
        ],
        html: `
<p>One editor, five requirement changes. Each stage's hidden tests include <strong>all earlier stages' behavior</strong>, so a change that breaks something old shows up immediately — exactly like the interviewer saying “wait, deposits used to work”.</p>

${widget('exercise', {
  id: 'ex-7-1',
  title: 'class Ledger',
  time: 25,
  fn: 'Ledger',
  isClass: true,
  harness: ledgerHarness,
  prompt: `<p>Implement an in-memory ledger. Rules that hold for <em>every</em> stage:</p>
<ul>
<li>New accounts start at 0; <code>getBalance(id)</code> of an unknown account is <code>0</code>.</li>
<li>Amounts must be positive finite numbers; anything else (0, negative, <code>NaN</code>, strings) makes the operation fail.</li>
<li>Every mutating method returns <code>true</code> on success and <code>false</code> on failure, and <strong>nothing changes on failure</strong>.</li>
<li>No balance may ever go negative.</li>
</ul>`,
  starter: `
class Ledger {
  constructor() {
    this.balances = new Map();
  }

  deposit(accountId, amount) {
    // TODO
  }

  withdraw(accountId, amount) {
    // TODO
  }

  getBalance(accountId) {
    // TODO
  }
}`,
  stages: [
    /* ---------------- stage 1 ---------------- */
    {
      title: 'Balances',
      prompt: `<p>Implement <code>deposit(accountId, amount)</code>, <code>withdraw(accountId, amount)</code> and <code>getBalance(accountId)</code>. A withdrawal that would make the balance negative fails (returns <code>false</code>) and leaves the balance unchanged.</p>`,
      reasoning: [
        { cat: 'abstraction', q: 'Core state?', choices: ['An array of accounts, searched linearly', 'A <code>Map&lt;accountId, balance&gt;</code>', 'A Set of account IDs', 'A sorted array of balances'], answer: 1,
          explain: '<p>Find-by-ID → Map. O(1) per operation.</p>' },
        { cat: 'edge', q: 'Which inputs must <code>deposit</code> reject?', type: 'multi', choices: ['<code>amount = 0</code>', '<code>amount = -5</code>', '<code>amount = NaN</code>', '<code>amount = "10"</code> (a string)', 'An account ID that has never been seen'], answers: [0, 1, 2, 3],
          explain: '<p>Amount validation: positive, finite, a number. A never-seen account is <em>fine</em> — accounts start at zero on first touch. Define these before coding and you avoid three follow-up bugs.</p>' },
        { type: 'text', cat: 'explanation', q: 'State the invariant that <code>withdraw</code> must protect, and how you enforce it.', min: 30,
          model: '<p>“No balance is ever negative. <code>withdraw</code> validates the amount, reads the current balance (0 if unknown), and if <code>amount &gt; balance</code> returns false without touching anything; otherwise it subtracts and returns true.”</p>' }
      ],
      tests: [
        { name: 'deposit then getBalance', run: (Ledger) => { const l = new Ledger(); const r = l.deposit('A', 10); return [r, l.getBalance('A')]; }, expect: [true, 10] },
        { name: 'unknown account reads 0', run: (Ledger) => { const l = new Ledger(); return l.getBalance('nobody'); }, expect: 0 },
        { name: 'deposits accumulate', run: (Ledger) => { const l = new Ledger(); l.deposit('A', 10); l.deposit('A', 15); return l.getBalance('A'); }, expect: 25 },
        { name: 'withdraw within balance', run: (Ledger) => { const l = new Ledger(); l.deposit('A', 50); const r = l.withdraw('A', 20); return [r, l.getBalance('A')]; }, expect: [true, 30] },
        { name: 'withdraw exactly the balance → 0', run: (Ledger) => { const l = new Ledger(); l.deposit('A', 50); return [l.withdraw('A', 50), l.getBalance('A')]; }, expect: [true, 0] },
        { name: 'overdraft rejected, balance unchanged', run: (Ledger) => { const l = new Ledger(); l.deposit('A', 50); const r = l.withdraw('A', 51); return [r, l.getBalance('A')]; }, expect: [false, 50] },
        { name: 'withdraw from unknown account fails', run: (Ledger) => { const l = new Ledger(); return [l.withdraw('Q', 1), l.getBalance('Q')]; }, expect: [false, 0] },
        { name: 'invalid amounts rejected (0, negative, NaN, string)', run: (Ledger) => { const l = new Ledger(); l.deposit('A', 10); return [l.deposit('A', 0), l.deposit('A', -1), l.deposit('A', NaN), l.deposit('A', '5'), l.withdraw('A', -1), l.withdraw('A', 0), l.getBalance('A')]; }, expect: [false, false, false, false, false, false, 10] },
        { name: 'accounts are independent', run: (Ledger) => { const l = new Ledger(); l.deposit('A', 10); l.deposit('B', 20); l.withdraw('A', 5); return [l.getBalance('A'), l.getBalance('B')]; }, expect: [5, 20] },
        { name: 'instances are independent', run: (Ledger) => { const a = new Ledger(), b = new Ledger(); a.deposit('X', 7); return [a.getBalance('X'), b.getBalance('X')]; }, expect: [7, 0] },
        { name: 'decimal amounts', run: (Ledger) => { const l = new Ledger(); l.deposit('A', 0.5); l.deposit('A', 0.25); return l.getBalance('A'); }, expect: 0.75 }
      ],
      antiSolutions: [
        { name: 'no amount validation', code: 'class Ledger { constructor() { this.b = new Map(); } deposit(id, a) { this.b.set(id, (this.b.get(id) ?? 0) + a); return true; } withdraw(id, a) { const cur = this.b.get(id) ?? 0; if (a > cur) return false; this.b.set(id, cur - a); return true; } getBalance(id) { return this.b.get(id) ?? 0; } }' },
        { name: 'unknown account returns undefined', code: 'class Ledger { constructor() { this.b = new Map(); } deposit(id, a) { if (!(a > 0) || typeof a !== "number") return false; this.b.set(id, (this.b.get(id) ?? 0) + a); return true; } withdraw(id, a) { if (!(a > 0) || typeof a !== "number") return false; const cur = this.b.get(id) ?? 0; if (a > cur) return false; this.b.set(id, cur - a); return true; } getBalance(id) { return this.b.get(id); } }' }
      ],
      hints: [
        '<p>Write one private helper: <code>_validAmount(a) { return typeof a === "number" &amp;&amp; Number.isFinite(a) &amp;&amp; a &gt; 0; }</code> and use it everywhere.</p>',
        '<p><code>getBalance(id) { return this.balances.get(id) ?? 0; }</code> — then <code>deposit</code> and <code>withdraw</code> can both read through it.</p>',
        '<p><code>withdraw</code>: validate → <code>const cur = this.getBalance(id)</code> → if <code>amount &gt; cur</code> return false → set <code>cur - amount</code> → return true.</p>'
      ],
      solution: `
class Ledger {
  constructor() {
    this.balances = new Map();          // accountId → balance
  }
  _validAmount(amount) {
    return typeof amount === 'number' && Number.isFinite(amount) && amount > 0;
  }
  getBalance(accountId) {
    return this.balances.get(accountId) ?? 0;
  }
  deposit(accountId, amount) {
    if (!this._validAmount(amount)) return false;
    this.balances.set(accountId, this.getBalance(accountId) + amount);
    return true;
  }
  withdraw(accountId, amount) {
    if (!this._validAmount(amount)) return false;
    const current = this.getBalance(accountId);
    if (amount > current) return false;   // invariant: never negative
    this.balances.set(accountId, current - amount);
    return true;
  }
}`,
      solutionExplain: '<p>Small, boring, correct. The validation helper is the piece that pays off in every later stage.</p>',
      complexity: '<p>“Every operation is O(1) average — a Map lookup and a write. Space O(number of accounts).”</p>'
    },

    /* ---------------- stage 2 ---------------- */
    {
      title: 'Transfers',
      prompt: `<p>Add <code>transfer(from, to, amount)</code>. It must be atomic from the caller's perspective: if the source lacks funds (or the amount is invalid, or <code>from === to</code>), return <code>false</code> and leave <em>both</em> balances unchanged. On success both balances change and it returns <code>true</code>.</p>
<p>One hidden test is a <strong>simulation</strong>: 2,000 random deposits, withdrawals and transfers across 8 accounts, checking after every step that no balance is negative and that transfers never create or destroy money.</p>`,
      reasoning: [
        { type: 'text', cat: 'explanation', q: 'What invariant should always hold across transfers, and what does “atomic from the caller’s perspective” mean for your implementation?', min: 40,
          model: '<p>“A successful transfer preserves the total system balance — the source loses exactly what the destination gains — and no account goes negative. Atomic means I validate everything (amount, distinct accounts, sufficient funds) <em>before</em> mutating anything, so a failure returns false with zero side effects; there is never a state where one side has changed and the other hasn’t.”</p>' },
        { cat: 'algorithm', q: 'Which implementation order is correct?', choices: ['debit source → check funds → credit destination', 'validate amount → check <code>from !== to</code> → check funds → debit and credit together → return true', 'credit destination → debit source', 'check funds → credit destination → debit source if still possible'], answer: 1,
          explain: '<p>All checks, then all mutations. The two balance writes are synchronous JS, so nothing can interleave between them — say that, and say what changes with a database (stage 5).</p>' }
      ],
      tests: [
        { name: 'successful transfer moves money', run: (Ledger) => { const l = new Ledger(); l.deposit('A', 100); const r = l.transfer('A', 'B', 40); return [r, l.getBalance('A'), l.getBalance('B')]; }, expect: [true, 60, 40] },
        { name: 'insufficient funds: rejected, both unchanged', run: (Ledger) => { const l = new Ledger(); l.deposit('A', 30); l.deposit('B', 5); const r = l.transfer('A', 'B', 31); return [r, l.getBalance('A'), l.getBalance('B')]; }, expect: [false, 30, 5] },
        { name: 'transfer entire balance', run: (Ledger) => { const l = new Ledger(); l.deposit('A', 30); return [l.transfer('A', 'B', 30), l.getBalance('A'), l.getBalance('B')]; }, expect: [true, 0, 30] },
        { name: 'transfer to a brand-new account', run: (Ledger) => { const l = new Ledger(); l.deposit('A', 10); l.transfer('A', 'NEW', 10); return l.getBalance('NEW'); }, expect: 10 },
        { name: 'from === to is rejected, nothing changes', run: (Ledger) => { const l = new Ledger(); l.deposit('A', 10); return [l.transfer('A', 'A', 5), l.getBalance('A')]; }, expect: [false, 10] },
        { name: 'invalid amount rejected', run: (Ledger) => { const l = new Ledger(); l.deposit('A', 10); return [l.transfer('A', 'B', 0), l.transfer('A', 'B', -3), l.transfer('A', 'B', NaN), l.getBalance('A'), l.getBalance('B')]; }, expect: [false, false, false, 10, 0] },
        { name: 'from an unknown (zero) account fails', run: (Ledger) => { const l = new Ledger(); return [l.transfer('ghost', 'B', 1), l.getBalance('B')]; }, expect: [false, 0] },
        { name: 'stage 1 still works (deposit/withdraw/getBalance)', run: (Ledger) => { const l = new Ledger(); l.deposit('A', 50); l.withdraw('A', 20); return [l.getBalance('A'), l.withdraw('A', 31), l.deposit('A', -1)]; }, expect: [30, false, false] },
        { name: 'simulation: 2,000 random ops — no negative balances, money conserved', desc: 'Seeded random deposits/withdrawals/transfers over 8 accounts; after each op we recompute the expected total from successful deposits and withdrawals and compare to the sum of balances.',
          run: (Ledger, H) => {
            const l = new Ledger(); const rand = H.rng(42); const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
            let expectedTotal = 0;
            const sum = () => ids.reduce((s, id) => s + l.getBalance(id), 0);
            for (let step = 0; step < 2000; step++) {
              const op = rand(), from = ids[Math.floor(rand() * ids.length)], to = ids[Math.floor(rand() * ids.length)];
              const amount = Math.floor(rand() * 100) + 1;
              if (op < 0.3) { if (l.deposit(from, amount)) expectedTotal += amount; }
              else if (op < 0.5) { const before = l.getBalance(from); const ok = l.withdraw(from, amount); if (ok) expectedTotal -= amount; if (ok !== (amount <= before)) return { step, problem: 'withdraw of ' + amount + ' with balance ' + before + ' returned ' + ok }; }
              else {
                const bf = l.getBalance(from), bt = l.getBalance(to);
                const ok = l.transfer(from, to, amount);
                const shouldOk = from !== to && amount <= bf;
                if (ok !== shouldOk) return { step, problem: 'transfer ' + from + '→' + to + ' of ' + amount + ' (balance ' + bf + ') returned ' + ok + ', expected ' + shouldOk };
                if (!ok && (l.getBalance(from) !== bf || l.getBalance(to) !== bt)) return { step, problem: 'failed transfer changed a balance' };
              }
              for (const id of ids) if (l.getBalance(id) < 0) return { step, problem: id + ' went negative: ' + l.getBalance(id) };
              if (sum() !== expectedTotal) return { step, problem: 'money not conserved: balances sum to ' + sum() + ' but should be ' + expectedTotal };
            }
            return 'ok';
          },
          expect: 'ok' }
      ],
      antiSolutions: [
        { name: 'credits destination even when debit fails', code: 'class Ledger { constructor() { this.b = new Map(); } _v(a) { return typeof a === "number" && Number.isFinite(a) && a > 0; } getBalance(id) { return this.b.get(id) ?? 0; } deposit(id, a) { if (!this._v(a)) return false; this.b.set(id, this.getBalance(id) + a); return true; } withdraw(id, a) { if (!this._v(a)) return false; const c = this.getBalance(id); if (a > c) return false; this.b.set(id, c - a); return true; } transfer(f, t, a) { if (f === t) return false; const ok = this.withdraw(f, a); this.deposit(t, a); return ok; } }' },
        { name: 'allows self-transfer', code: 'class Ledger { constructor() { this.b = new Map(); } _v(a) { return typeof a === "number" && Number.isFinite(a) && a > 0; } getBalance(id) { return this.b.get(id) ?? 0; } deposit(id, a) { if (!this._v(a)) return false; this.b.set(id, this.getBalance(id) + a); return true; } withdraw(id, a) { if (!this._v(a)) return false; const c = this.getBalance(id); if (a > c) return false; this.b.set(id, c - a); return true; } transfer(f, t, a) { if (!this._v(a) || a > this.getBalance(f)) return false; this.b.set(f, this.getBalance(f) - a); this.b.set(t, this.getBalance(t) + a); return true; } }' }
      ],
      hints: [
        '<p>Checks first: valid amount, <code>from !== to</code>, <code>amount &lt;= getBalance(from)</code>. Only then write both balances.</p>',
        '<p>You can reuse <code>withdraw</code> then <code>deposit</code> — but only if you <code>return false</code> when withdraw fails, <em>before</em> depositing.</p>'
      ],
      solution: `
class Ledger {
  constructor() {
    this.balances = new Map();
  }
  _validAmount(amount) {
    return typeof amount === 'number' && Number.isFinite(amount) && amount > 0;
  }
  getBalance(accountId) {
    return this.balances.get(accountId) ?? 0;
  }
  deposit(accountId, amount) {
    if (!this._validAmount(amount)) return false;
    this.balances.set(accountId, this.getBalance(accountId) + amount);
    return true;
  }
  withdraw(accountId, amount) {
    if (!this._validAmount(amount)) return false;
    const current = this.getBalance(accountId);
    if (amount > current) return false;
    this.balances.set(accountId, current - amount);
    return true;
  }
  transfer(from, to, amount) {
    if (!this._validAmount(amount) || from === to) return false;
    if (amount > this.getBalance(from)) return false;        // all checks first…
    this.balances.set(from, this.getBalance(from) - amount); // …then all mutations
    this.balances.set(to, this.getBalance(to) + amount);
    return true;
  }
}`,
      solutionExplain: '<p>The simulation is what a good interviewer does in their head: “what if I hammer this with random operations — does any invariant break?” Being able to <em>name</em> the invariants (non-negative, conservation) is the skill.</p>',
      complexity: '<p>“Still O(1) per operation.”</p>'
    },

    /* ---------------- stage 3 ---------------- */
    {
      title: 'History',
      prompt: `<p>Add <code>getTransactions(accountId)</code> returning that account's successful operations in chronological order. Each entry: <code>{ type, amount, counterparty? }</code> where <code>type</code> is one of <code>'deposit'</code>, <code>'withdraw'</code>, <code>'transfer_in'</code>, <code>'transfer_out'</code>; <code>counterparty</code> is the other account for transfers (omit it, or leave it undefined, otherwise). Failed operations are <strong>not</strong> recorded. Unknown account → <code>[]</code>. You may add extra fields such as a timestamp.</p>`,
      reasoning: [
        { cat: 'abstraction', q: 'Where does history live?', choices: ['Recompute it from balances', 'A <code>Map&lt;accountId, entry[]&gt;</code> appended on every <em>successful</em> mutation (or a single global log filtered on read)', 'Inside each balance number', 'A Set of amounts'], answer: 1,
          explain: '<p>Per-account arrays give O(1) append and O(k) read. A single global log is simpler to write and makes “all transactions in a time range” easy later — mention the trade-off.</p>' },
        { cat: 'edge', q: 'A transfer from A to B succeeds. What gets recorded?', choices: ['One entry on A only', 'Two entries: <code>transfer_out</code> on A with counterparty B, and <code>transfer_in</code> on B with counterparty A', 'A deposit on B', 'Nothing until <code>getTransactions</code> is called'], answer: 1,
          explain: '<p>Each account sees its own side of the transfer. And a <em>failed</em> transfer records nothing — that follows from “validate, then mutate, then record”.</p>' },
        { type: 'text', cat: 'explanation', q: 'How do you add history without changing the behavior of the stage-1/2 methods?', min: 30,
          model: '<p>“Add one private <code>_record(accountId, entry)</code> helper and call it at the end of each successful path — after the boolean-returning checks, so failures still return false with no side effects. The public signatures and return values don’t change, so all earlier tests still pass.”</p>' }
      ],
      tests: [
        { name: 'deposits and withdrawals are recorded in order', run: (Ledger, H) => { const l = new Ledger(); l.deposit('A', 10); l.withdraw('A', 4); l.deposit('A', 1); return H.hist(l, 'A'); }, expect: [{ type: 'deposit', amount: 10 }, { type: 'withdraw', amount: 4 }, { type: 'deposit', amount: 1 }] },
        { name: 'transfer records both sides with counterparty', run: (Ledger, H) => { const l = new Ledger(); l.deposit('A', 10); l.transfer('A', 'B', 7); return [H.hist(l, 'A'), H.hist(l, 'B')]; }, expect: [[{ type: 'deposit', amount: 10 }, { type: 'transfer_out', amount: 7, counterparty: 'B' }], [{ type: 'transfer_in', amount: 7, counterparty: 'A' }]] },
        { name: 'failed operations are not recorded', run: (Ledger, H) => { const l = new Ledger(); l.deposit('A', 5); l.withdraw('A', 50); l.transfer('A', 'B', 50); l.deposit('A', -1); return [H.hist(l, 'A'), H.hist(l, 'B')]; }, expect: [[{ type: 'deposit', amount: 5 }], []] },
        { name: 'unknown account → []', run: (Ledger) => { const l = new Ledger(); return l.getTransactions('nobody'); }, expect: [] },
        { name: 'history is per account', run: (Ledger, H) => { const l = new Ledger(); l.deposit('A', 1); l.deposit('B', 2); return [H.hist(l, 'A').length, H.hist(l, 'B').length]; }, expect: [1, 1] },
        { name: 'balances still correct after history added', run: (Ledger) => { const l = new Ledger(); l.deposit('A', 10); l.transfer('A', 'B', 3); return [l.getBalance('A'), l.getBalance('B')]; }, expect: [7, 3] },
        { name: 'returned history is not a live reference you can corrupt (copy or immutable)', desc: 'Mutating the returned array must not alter the ledger’s own record.', run: (Ledger, H) => { const l = new Ledger(); l.deposit('A', 1); const h = l.getTransactions('A'); h.length = 0; h.push({ type: 'hack' }); return H.hist(l, 'A'); }, expect: [{ type: 'deposit', amount: 1 }] }
      ],
      antiSolutions: [
        { name: 'records before validating', code: 'class Ledger { constructor() { this.b = new Map(); this.h = new Map(); } _v(a) { return typeof a === "number" && Number.isFinite(a) && a > 0; } _r(id, e) { if (!this.h.has(id)) this.h.set(id, []); this.h.get(id).push(e); } getBalance(id) { return this.b.get(id) ?? 0; } getTransactions(id) { return (this.h.get(id) ?? []).slice(); } deposit(id, a) { this._r(id, { type: "deposit", amount: a }); if (!this._v(a)) return false; this.b.set(id, this.getBalance(id) + a); return true; } withdraw(id, a) { this._r(id, { type: "withdraw", amount: a }); if (!this._v(a)) return false; const c = this.getBalance(id); if (a > c) return false; this.b.set(id, c - a); return true; } transfer(f, t, a) { if (!this._v(a) || f === t || a > this.getBalance(f)) return false; this.b.set(f, this.getBalance(f) - a); this.b.set(t, this.getBalance(t) + a); this._r(f, { type: "transfer_out", amount: a, counterparty: t }); this._r(t, { type: "transfer_in", amount: a, counterparty: f }); return true; } }' }
      ],
      hints: [
        '<p>Add <code>this.history = new Map()</code> and a <code>_record(accountId, entry)</code> helper that initializes the array if missing and pushes.</p>',
        '<p>Call <code>_record</code> only on the success path, after the mutation. For transfers call it twice.</p>',
        '<p>Return a copy from <code>getTransactions</code>: <code>(this.history.get(id) ?? []).map(e => ({ ...e }))</code>.</p>'
      ],
      solution: `
class Ledger {
  constructor() {
    this.balances = new Map();
    this.history = new Map();           // accountId → entry[]
  }
  _validAmount(amount) {
    return typeof amount === 'number' && Number.isFinite(amount) && amount > 0;
  }
  _record(accountId, entry) {
    if (!this.history.has(accountId)) this.history.set(accountId, []);
    this.history.get(accountId).push({ ...entry, timestamp: Date.now() });
  }
  getBalance(accountId) {
    return this.balances.get(accountId) ?? 0;
  }
  getTransactions(accountId) {
    return (this.history.get(accountId) ?? []).map(e => ({ ...e }));   // defensive copy
  }
  deposit(accountId, amount) {
    if (!this._validAmount(amount)) return false;
    this.balances.set(accountId, this.getBalance(accountId) + amount);
    this._record(accountId, { type: 'deposit', amount });
    return true;
  }
  withdraw(accountId, amount) {
    if (!this._validAmount(amount)) return false;
    const current = this.getBalance(accountId);
    if (amount > current) return false;
    this.balances.set(accountId, current - amount);
    this._record(accountId, { type: 'withdraw', amount });
    return true;
  }
  transfer(from, to, amount) {
    if (!this._validAmount(amount) || from === to) return false;
    if (amount > this.getBalance(from)) return false;
    this.balances.set(from, this.getBalance(from) - amount);
    this.balances.set(to, this.getBalance(to) + amount);
    this._record(from, { type: 'transfer_out', amount, counterparty: to });
    this._record(to, { type: 'transfer_in', amount, counterparty: from });
    return true;
  }
}`,
      solutionExplain: '<p>Data-model evolution done right: one new Map, one helper, four call sites, zero changes to existing behavior. The defensive copy in <code>getTransactions</code> is the detail that separates “works” from “can’t be corrupted by a caller”.</p>',
      complexity: '<p>“Recording is O(1) per operation; <code>getTransactions</code> is O(k) for k entries because of the copy. Memory grows with total operations — persistence is the stage-5 conversation.”</p>'
    },

    /* ---------------- stage 4 ---------------- */
    {
      title: 'Idempotency',
      prompt: `<p>Clients retry on network errors, so the same transfer request can arrive twice. Extend <code>transfer(from, to, amount, idempotencyKey)</code> with an optional 4th argument. If a key has been seen before, <strong>return the prior result without executing anything again</strong> (no balance change, no new history entries). Calls without a key behave as before.</p>`,
      reasoning: [
        { cat: 'abstraction', q: 'New state?', choices: ['A Set of keys', 'A <code>Map&lt;idempotencyKey, result&gt;</code> — you must return the <em>same result</em>, so you need the value, not just presence', 'A counter', 'A queue of pending transfers'], answer: 1,
          explain: '<p>A Set would tell you “seen” but not what to answer. Store the result (here a boolean; in a real API, the whole response).</p>' },
        { cat: 'edge', q: 'The first attempt with key K <em>failed</em> (insufficient funds). The client retries with K after depositing more. What should happen?', choices: ['Execute it now — funds are available', 'Return the stored <code>false</code>: the key is bound to the first outcome. The client must use a new key for a new attempt', 'Throw', 'Execute and store true'], answer: 1,
          explain: '<p>Idempotency means “same request, same answer”. Replaying a failure as a success would make retries non-deterministic. Store the result whether it succeeded or failed.</p>' },
        { type: 'text', cat: 'explanation', q: 'Why do financial APIs need idempotency keys? One or two sentences.', min: 30,
          model: '<p>“A client that times out doesn’t know whether the server executed the request. Without a key, retrying risks a double transfer; with a key, the server can recognize the retry and return the original result, so retries are safe and exactly-once semantics hold from the client’s point of view.”</p>' }
      ],
      tests: [
        { name: 'same key twice executes once', run: (Ledger) => { const l = new Ledger(); l.deposit('A', 100); const r1 = l.transfer('A', 'B', 30, 'k1'); const r2 = l.transfer('A', 'B', 30, 'k1'); return [r1, r2, l.getBalance('A'), l.getBalance('B')]; }, expect: [true, true, 70, 30] },
        { name: 'replay adds no history entries', run: (Ledger) => { const l = new Ledger(); l.deposit('A', 100); l.transfer('A', 'B', 30, 'k1'); l.transfer('A', 'B', 30, 'k1'); return [l.getTransactions('A').length, l.getTransactions('B').length]; }, expect: [2, 1] },
        { name: 'different keys both execute', run: (Ledger) => { const l = new Ledger(); l.deposit('A', 100); return [l.transfer('A', 'B', 30, 'k1'), l.transfer('A', 'B', 30, 'k2'), l.getBalance('A')]; }, expect: [true, true, 40] },
        { name: 'a failed result is replayed as false even after funds arrive', run: (Ledger) => { const l = new Ledger(); l.deposit('A', 10); const r1 = l.transfer('A', 'B', 50, 'k1'); l.deposit('A', 100); const r2 = l.transfer('A', 'B', 50, 'k1'); return [r1, r2, l.getBalance('A'), l.getBalance('B')]; }, expect: [false, false, 110, 0] },
        { name: 'no key → not idempotent (both execute)', run: (Ledger) => { const l = new Ledger(); l.deposit('A', 100); l.transfer('A', 'B', 30); l.transfer('A', 'B', 30); return l.getBalance('A'); }, expect: 40 },
        { name: 'keys are per ledger instance', run: (Ledger) => { const a = new Ledger(), b = new Ledger(); a.deposit('A', 10); b.deposit('A', 10); a.transfer('A', 'B', 5, 'k'); return [b.transfer('A', 'B', 5, 'k'), b.getBalance('B')]; }, expect: [true, 5] },
        { name: 'stages 1–3 still intact', run: (Ledger, H) => { const l = new Ledger(); l.deposit('A', 20); l.withdraw('A', 5); l.transfer('A', 'B', 5); return [l.getBalance('A'), l.getBalance('B'), H.hist(l, 'B'), l.withdraw('A', 100)]; }, expect: [10, 5, [{ type: 'transfer_in', amount: 5, counterparty: 'A' }], false] }
      ],
      antiSolutions: [
        { name: 'only stores successful results', code: 'class Ledger { constructor() { this.b = new Map(); this.h = new Map(); this.k = new Map(); } _v(a) { return typeof a === "number" && Number.isFinite(a) && a > 0; } _r(id, e) { if (!this.h.has(id)) this.h.set(id, []); this.h.get(id).push(e); } getBalance(id) { return this.b.get(id) ?? 0; } getTransactions(id) { return (this.h.get(id) ?? []).map(e => ({ ...e })); } deposit(id, a) { if (!this._v(a)) return false; this.b.set(id, this.getBalance(id) + a); this._r(id, { type: "deposit", amount: a }); return true; } withdraw(id, a) { if (!this._v(a)) return false; const c = this.getBalance(id); if (a > c) return false; this.b.set(id, c - a); this._r(id, { type: "withdraw", amount: a }); return true; } transfer(f, t, a, key) { if (key !== undefined && this.k.has(key)) return this.k.get(key); if (!this._v(a) || f === t || a > this.getBalance(f)) return false; this.b.set(f, this.getBalance(f) - a); this.b.set(t, this.getBalance(t) + a); this._r(f, { type: "transfer_out", amount: a, counterparty: t }); this._r(t, { type: "transfer_in", amount: a, counterparty: f }); if (key !== undefined) this.k.set(key, true); return true; } }' }
      ],
      hints: [
        '<p><code>this.results = new Map()</code>. At the top of <code>transfer</code>: if the key is defined and known, return the stored result immediately.</p>',
        '<p>Compute the result exactly as before, then — if a key was given — store it (true <em>or</em> false) before returning. Easiest: wrap the old body in a private <code>_transfer</code> and store its result.</p>'
      ],
      solution: `
class Ledger {
  constructor() {
    this.balances = new Map();
    this.history = new Map();
    this.results = new Map();           // idempotencyKey → result of the first attempt
  }
  _validAmount(amount) {
    return typeof amount === 'number' && Number.isFinite(amount) && amount > 0;
  }
  _record(accountId, entry) {
    if (!this.history.has(accountId)) this.history.set(accountId, []);
    this.history.get(accountId).push({ ...entry, timestamp: Date.now() });
  }
  getBalance(accountId) {
    return this.balances.get(accountId) ?? 0;
  }
  getTransactions(accountId) {
    return (this.history.get(accountId) ?? []).map(e => ({ ...e }));
  }
  deposit(accountId, amount) {
    if (!this._validAmount(amount)) return false;
    this.balances.set(accountId, this.getBalance(accountId) + amount);
    this._record(accountId, { type: 'deposit', amount });
    return true;
  }
  withdraw(accountId, amount) {
    if (!this._validAmount(amount)) return false;
    const current = this.getBalance(accountId);
    if (amount > current) return false;
    this.balances.set(accountId, current - amount);
    this._record(accountId, { type: 'withdraw', amount });
    return true;
  }
  transfer(from, to, amount, idempotencyKey) {
    if (idempotencyKey !== undefined && this.results.has(idempotencyKey)) {
      return this.results.get(idempotencyKey);         // replay: no side effects
    }
    const result = this._transfer(from, to, amount);
    if (idempotencyKey !== undefined) this.results.set(idempotencyKey, result);   // store failures too
    return result;
  }
  _transfer(from, to, amount) {
    if (!this._validAmount(amount) || from === to) return false;
    if (amount > this.getBalance(from)) return false;
    this.balances.set(from, this.getBalance(from) - amount);
    this.balances.set(to, this.getBalance(to) + amount);
    this._record(from, { type: 'transfer_out', amount, counterparty: to });
    this._record(to, { type: 'transfer_in', amount, counterparty: from });
    return true;
  }
}`,
      solutionExplain: '<p>Extracting <code>_transfer</code> keeps the idempotency concern in one place. In a real system the stored value would be the full response and would need a TTL; and you’d store <code>{ key, paramsHash, result }</code> so a key reused with <em>different</em> parameters can be rejected (stage 5).</p>',
      complexity: '<p>“O(1) per call; the results map grows with the number of keyed requests — in production you’d expire old keys.”</p>'
    },

    /* ---------------- stage 5 ---------------- */
    {
      title: 'Follow-ups',
      prompt: `<p>No code. The interviewer leans back and asks the questions that separate “can code” from “can own a payments service”. Answer as you would out loud.</p>`,
      reasoning: [
        { cat: 'algorithm', q: '1. Two <code>transfer("A","B",80)</code> calls run concurrently against a balance of 100. What breaks in a multi-process / database-backed version of this design?', choices: ['Nothing — JavaScript is single-threaded', 'Check-then-act across a network round-trip: both read 100, both pass the check, both debit → balance −60 (a lost-update / TOCTOU race). In-process JS is safe only because check and mutate happen in one synchronous block', 'The history gets out of order', 'The Map throws'], answer: 1,
          explain: '<p>Name the race precisely: <em>time-of-check to time-of-use</em>. Then name fixes: an atomic conditional update (<code>UPDATE … SET balance = balance − 80 WHERE id = ? AND balance ≥ 80</code>, check rows affected), row locks (<code>SELECT … FOR UPDATE</code>) inside a transaction, or serializing per account.</p>' },
        { cat: 'algorithm', q: '2. How would this change with a database?', type: 'multi', choices: ['Balances become rows; each method becomes a transaction', 'Use conditional updates / row locks so the funds check and the debit are atomic', 'History becomes an append-only table; balances could even be derived from it (event sourcing) or kept as a cached materialized value', 'The idempotency map becomes a table with a unique constraint on the key', 'Nothing changes — Maps are fine'], answers: [0, 1, 2, 3],
          explain: '<p>All four. The unique constraint on the idempotency key is a nice detail: two concurrent retries can’t both insert, so the loser reads the winner’s result.</p>' },
        { type: 'text', cat: 'explanation', q: '3. How would you make a transfer atomic across two accounts in a database?', min: 40,
          model: '<p>“Wrap both updates in one transaction. Debit with a conditional update that only succeeds if the balance is sufficient; if zero rows change, roll back and return false. Lock rows in a consistent order (e.g., by account ID) to avoid deadlocks when two transfers cross. Commit only when both writes succeed, so a reader never observes money that has left one account but not arrived in the other.”</p>' },
        { type: 'text', cat: 'explanation', q: '4. How would you persist transaction history, and what would you optimize for?', min: 40,
          model: '<p>“An append-only ledger table: (id, account_id, type, amount, counterparty, created_at, idempotency_key), indexed on (account_id, created_at) for per-account history reads. Never update or delete rows — corrections are new compensating entries. Balances can be a materialized column updated in the same transaction, or derived by summing entries if audit-ability matters more than read speed.”</p>' },
        { cat: 'edge', q: '5. An idempotency key is reused with <em>different</em> parameters (same key, different amount). What should the API do?', choices: ['Execute the new request', 'Return the old result silently', 'Reject it as a client error (e.g. 422 “idempotency key reuse with different parameters”) — store a hash of the parameters alongside the key so the mismatch is detectable', 'Merge the two amounts'], answer: 2,
          explain: '<p>Silently returning the old result would hide a client bug; executing would break the exactly-once promise. Well-designed payment APIs reject with a specific error. This answer shows you have thought about the failure modes of your own design.</p>' }
      ],
      tests: [],
      solution: '// discussion stage — no code',
      solutionExplain: '<p>If you can say those five answers fluently, the stateful-implementation interview is yours. The pattern underneath every one: <strong>name the invariant, name the race, name the mechanism that restores atomicity.</strong></p>'
    }
  ]
})}
`
      }
    ]
  });
})();
