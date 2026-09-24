# Payload Job Runner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the four registered Payload scheduled tasks actually execute in production, without firing historical customer email and without ever running from a developer's machine.

**Architecture:** Payload 3.79's `jobs.autoRun` cron does two things per tick — calls `handleSchedules()` to *queue* any task whose `schedule` cron is due, then calls `runJobs()` to *execute* queued jobs. Neither happens today because `autoRun` is absent. We add it, gated behind an env flag resolved by a pure, tested function so the default is off everywhere except production.

**Tech Stack:** Payload CMS 3.79.0, Next.js 15.3.0, PostgreSQL (prod) / SQLite (dev), `node:test` runner, pnpm.

**Spec:** [`docs/superpowers/specs/2026-09-23-square-catalog-staging-design.md`](../specs/2026-09-23-square-catalog-staging-design.md) — section "Blocking dependency: no job runner". This plan implements that section only; the catalog staging work is a separate plan written after this one is verified in production.

## Global Constraints

- Package manager is **pnpm** in `alkebu-load/`. Never `npm`.
- `pnpm test` runs `node:test` against `tests/**/*.test.ts` and already injects
  `STRIPE_SECRET_KEY=sk_test_dummy`. Standalone `tsx` runs do not.
- Production builds enforce type and lint errors. `pnpm build` fails on warnings.
- Never `source` the `.env` file. A password fragment leaked to a transcript that way in July
  and the rotation is still pending.
- Pushing `main` triggers a Coolify auto-deploy. The push **is** the deploy.
- The prod database is not reachable over Tailscale from WSL. Any DDL goes through the Coolify
  Postgres terminal.
- Shell in this environment runs as root. `chown -R jadom:jadom` any file created or modified
  before handing back, or the user's git breaks.

## Background: what is actually broken

`src/payload.config.ts:238` registers four tasks, each with a `schedule` entry on the `default`
queue:

| Task | Cron | Effect when it runs |
|---|---|---|
| `cleanup-abandoned-carts` | `0 */2 * * *` | **emails customers** about carts idle >1h |
| `daily-order-digest` | `0 12 * * *` | emails staff a digest |
| `quote-followups` | `0 15 * * *` | **emails customers** about quotes idle >7d |
| `recover-stripe-orders` | `15 * * * *` | recreates orders for paid-but-orderless Stripe sessions; staff alert only |

There is no `autoRun` in the repo, no worker process (`Dockerfile` ends at
`CMD ["node", "server.js"]`), and nothing calls `/api/payload-jobs/run`. So none of them have
ever run.

### Two safety facts established before writing this plan

**Enabling the runner does not immediately fire all four backlogged crons.**
`checkQueueableTimeConstraints` computes `new Cron(cron).nextRun(lastScheduledRun ?? undefined)`.
With no `lastScheduledRun` in the `payload-jobs-stats` global, `nextRun(undefined)` returns the
next occurrence *from now*, not a backlog replay. Each task fires at its next natural cron time.

**But the next natural run still processes all historical rows.** `cleanup-abandoned-carts`
would reach its next tick within two hours and email every cart ever abandoned. This is why the
suppression below is a prerequisite, not a nicety.

### Prerequisite already completed by the user (2026-09-23)

- All carts set to `abandonedEmailSent: true`, which fully excludes them — the selection query
  at `src/app/utils/cartOperations.ts:901-908` ANDs `abandonedEmailSent: { not_equals: true }`.
- `bookQuotes` collection is **empty** (zero rows), so `quote-followups` has nothing to send.

Do not re-verify these by writing to production. Confirm by reading only, if at all.

## File Structure

| File | Responsibility |
|---|---|
| `src/app/utils/jobRunnerConfig.ts` (create) | Pure resolver: env → `AutorunCronConfig[]`. No I/O. Single source of the on/off decision. |
| `tests/config/jobRunnerConfig.test.ts` (create) | Unit tests for the resolver, following the `withEnv` pattern in `tests/config/emailConfig.test.ts`. |
| `src/payload.config.ts` (modify, `jobs:` block at :238) | Wire `autoRun` to the resolver. One line plus an import. |
| `.env.example` (modify) | Document `ENABLE_JOB_AUTORUN`. |

The resolver is its own file rather than an inline ternary in the config because
`payload.config.ts` cannot be imported by a unit test without booting Payload, and the on/off
decision is the part that most needs a test.

---

### Task 1: Pure autoRun resolver

**Files:**
- Create: `alkebu-load/src/app/utils/jobRunnerConfig.ts`
- Test: `alkebu-load/tests/config/jobRunnerConfig.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `resolveJobAutoRunConfig(env?: NodeJS.ProcessEnv): AutorunCronConfig[]` — returns
  `[]` when disabled, or exactly one entry `{ cron: '* * * * *', queue: 'default', limit: 10 }`
  when `ENABLE_JOB_AUTORUN === 'true'`. Task 2 calls this.

- [ ] **Step 1: Write the failing test**

Create `alkebu-load/tests/config/jobRunnerConfig.test.ts`:

```ts
import assert from 'node:assert';
import test from 'node:test';

import { resolveJobAutoRunConfig } from '../../src/app/utils/jobRunnerConfig';

test('is disabled by default so a developer machine never runs production crons', () => {
  assert.deepStrictEqual(resolveJobAutoRunConfig({}), []);
});

test('stays disabled for any value other than the exact string "true"', () => {
  for (const value of ['false', 'TRUE', '1', 'yes', '']) {
    assert.deepStrictEqual(
      resolveJobAutoRunConfig({ ENABLE_JOB_AUTORUN: value }),
      [],
      `expected ENABLE_JOB_AUTORUN=${JSON.stringify(value)} to leave autoRun disabled`,
    );
  }
});

test('returns a single default-queue entry when explicitly enabled', () => {
  const config = resolveJobAutoRunConfig({ ENABLE_JOB_AUTORUN: 'true' });

  assert.strictEqual(config.length, 1);
  assert.strictEqual(config[0].queue, 'default');
  assert.strictEqual(config[0].cron, '* * * * *');
  assert.strictEqual(config[0].limit, 10);
});

test('does not disable scheduling — autoRun must both queue and run', () => {
  const [entry] = resolveJobAutoRunConfig({ ENABLE_JOB_AUTORUN: 'true' });

  // Payload only calls handleSchedules() when disableScheduling is falsy.
  // Setting it would leave scheduled tasks permanently unqueued.
  assert.notStrictEqual(entry.disableScheduling, true);
});

test('reads process.env when no environment is passed', () => {
  const previous = process.env.ENABLE_JOB_AUTORUN;
  process.env.ENABLE_JOB_AUTORUN = 'true';
  try {
    assert.strictEqual(resolveJobAutoRunConfig().length, 1);
  } finally {
    if (previous === undefined) {
      delete process.env.ENABLE_JOB_AUTORUN;
    } else {
      process.env.ENABLE_JOB_AUTORUN = previous;
    }
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd alkebu-load && pnpm test
```

Expected: FAIL — `Cannot find module '../../src/app/utils/jobRunnerConfig'`.

- [ ] **Step 3: Write minimal implementation**

Create `alkebu-load/src/app/utils/jobRunnerConfig.ts`:

```ts
import type { JobsConfig } from 'payload';

// Payload does NOT export AutorunCronConfig from its package root -- only
// JobsConfig, RunJobAccess and RunJobAccessArgs come from that module
// (payload/dist/index.d.ts:597). Importing it directly fails the build, and
// this repo enforces type errors in production builds. Derive it instead.
type AutorunCronConfig = Extract<NonNullable<JobsConfig['autoRun']>, unknown[]>[number];

/**
 * Resolves whether this process should run Payload's job queue.
 *
 * Payload's `autoRun` cron does BOTH halves of the job system on each tick:
 * `handleSchedules()` queues any task whose `schedule` cron is due, then
 * `runJobs()` executes what is queued. Without it, tasks registered with a
 * `schedule` are inert — which is the state production was in until 2026-09-23.
 *
 * Off unless `ENABLE_JOB_AUTORUN` is exactly "true". The default matters: two of
 * the four scheduled tasks email customers, and a developer running `pnpm dev`
 * against a local database with real SES credentials would send real mail.
 * Opt-in, never opt-out.
 */
export function resolveJobAutoRunConfig(
  env: NodeJS.ProcessEnv = process.env,
): AutorunCronConfig[] {
  if (env.ENABLE_JOB_AUTORUN !== 'true') {
    return [];
  }

  return [
    {
      // Every minute. Cheap: a tick with nothing due is one global read.
      cron: '* * * * *',
      // All four registered tasks schedule onto `default`. A task added to
      // another queue needs its own entry here or it will never run.
      queue: 'default',
      limit: 10,
    },
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd alkebu-load && pnpm test
```

Expected: PASS, and the pre-existing suite still green.

- [ ] **Step 5: Commit**

```bash
cd /home/jadom/Coding/alkebulanimages2.0
chown -R jadom:jadom alkebu-load/src/app/utils/jobRunnerConfig.ts alkebu-load/tests/config/jobRunnerConfig.test.ts
git add alkebu-load/src/app/utils/jobRunnerConfig.ts alkebu-load/tests/config/jobRunnerConfig.test.ts
git commit -m "feat(jobs): add opt-in autoRun resolver

Payload's autoRun cron both queues scheduled tasks and runs them. It was
never configured, so the four registered tasks have never executed.
Resolver is opt-in via ENABLE_JOB_AUTORUN so dev machines never send the
customer email two of those tasks produce."
```

---

### Task 2: Wire the resolver into the Payload config

**Files:**
- Modify: `alkebu-load/src/payload.config.ts` (the `jobs:` block beginning at line 238)
- Modify: `alkebu-load/.env.example`

**Interfaces:**
- Consumes: `resolveJobAutoRunConfig()` from Task 1.
- Produces: nothing importable. The observable effect is that `payload.config.jobs.autoRun` is
  populated when the env flag is set.

- [ ] **Step 1: Add the import**

At the top of `alkebu-load/src/payload.config.ts`, alongside the existing imports:

```ts
import { resolveJobAutoRunConfig } from './app/utils/jobRunnerConfig'
```

- [ ] **Step 2: Add autoRun to the jobs block**

In `src/payload.config.ts`, change the opening of the `jobs:` block from:

```ts
  jobs: {
    tasks: [
```

to:

```ts
  jobs: {
    // Runs the queue. Without this, the `schedule` entries on the tasks below
    // are inert -- Payload registers them but nothing ever queues or executes
    // them. Opt-in per environment; see jobRunnerConfig.ts for why.
    autoRun: resolveJobAutoRunConfig(),
    tasks: [
```

Leave the four task definitions exactly as they are. Their `schedule` entries are already
correct; they were simply never consumed.

- [ ] **Step 3: Document the flag**

Append to `alkebu-load/.env.example`:

```
# Set to exactly "true" in production only. Enables Payload's job queue runner,
# which queues and executes the scheduled tasks in payload.config.ts. Two of
# those tasks send customer email -- never enable this on a dev machine.
ENABLE_JOB_AUTORUN=
```

- [ ] **Step 4: Verify types and build**

```bash
cd alkebu-load && pnpm generate:types && pnpm lint && pnpm build
```

Expected: all three succeed. `generate:types` should produce no diff — this change adds no
collection fields.

If `generate:types` *does* produce a diff touching `payload-jobs` or `payload-jobs-stats`,
stop and report it. That would mean the jobs schema is not yet materialized and Task 4's
deployment needs DDL, which this plan currently assumes it does not.

- [ ] **Step 5: Run the full suite**

```bash
cd alkebu-load && pnpm test
```

Expected: PASS, including the 5 new tests from Task 1.

- [ ] **Step 6: Commit**

```bash
cd /home/jadom/Coding/alkebulanimages2.0
chown -R jadom:jadom alkebu-load/src/payload.config.ts alkebu-load/.env.example
git add alkebu-load/src/payload.config.ts alkebu-load/.env.example
git commit -m "feat(jobs): wire autoRun into payload config

Activates the four scheduled tasks that have been registered but never
run: cleanup-abandoned-carts, daily-order-digest, quote-followups, and
recover-stripe-orders."
```

---

### Task 3: Verify locally before it can touch production

**Files:** none modified. This task is verification only.

**Interfaces:**
- Consumes: the wiring from Task 2.
- Produces: evidence that a job transitions to complete. Task 4 does not start without it.

- [ ] **Step 1: Confirm the default is genuinely off**

```bash
cd alkebu-load && pnpm dev
```

Watch startup output. Expected: **no** job-runner cron logging, because `ENABLE_JOB_AUTORUN` is
unset in the local `.env`. If crons start, the resolver is wired wrong — stop and fix before
going further. This is the guard that keeps customer email off a dev machine.

Stop the dev server.

- [ ] **Step 2: Prove the runner works when enabled, without sending mail**

Temporarily add a scratch task that does nothing observable but complete. In
`src/payload.config.ts`, add to the `tasks` array:

```ts
      {
        slug: 'job-runner-smoke-test',
        handler: async () => {
          console.log('✅ job-runner-smoke-test executed at', new Date().toISOString())
          return { output: {} }
        },
        schedule: [{ cron: '* * * * *', queue: 'default' }],
      },
```

Then run with the flag on, against the **local SQLite** database:

```bash
cd alkebu-load && ENABLE_JOB_AUTORUN=true pnpm dev
```

Expected within ~2 minutes: the `✅ job-runner-smoke-test executed at ...` line appears, and
repeats roughly once a minute.

The other four tasks may also fire against local data. That is safe here only because the local
database is a throwaway SQLite snapshot — but **confirm `.env` does not carry live SES
credentials** before running this step. If it does, unset `SES_SMTP_USER` for the duration.

- [ ] **Step 3: Confirm a job row reached completion**

With the dev server still running, open `http://localhost:3000/admin`, log in, and find the
`payload-jobs` collection. Confirm at least one `job-runner-smoke-test` row exists with
`completedAt` populated and no `error`.

This is the actual acceptance signal: registration plus execution plus completion, which is
exactly the chain that was broken.

- [ ] **Step 4: Remove the scratch task**

Delete the `job-runner-smoke-test` block added in Step 2. Re-run:

```bash
cd alkebu-load && pnpm test && pnpm lint && pnpm build
```

Expected: PASS. Confirm `git diff src/payload.config.ts` shows only the Task 2 changes —
the scratch task must not reach production.

- [ ] **Step 5: Commit (only if Step 4 produced changes)**

If the scratch task was committed at any point, commit its removal. If it was never committed,
there is nothing to do here.

---

### Task 4: Production deployment and verification

**Files:** none. This is an operational task requiring Coolify and Square dashboard access, so
it is performed by the user, not an agent.

**Interfaces:**
- Consumes: a green Task 3.
- Produces: the go/no-go signal for the catalog staging plan, which cannot proceed until a
  queued job is observed completing in production.

- [ ] **Step 1: Re-confirm the email suppression still holds**

In `/admin`, confirm no cart has `abandonedEmailSent` unset or false, and that `bookQuotes` is
still empty. If new carts have accumulated since the suppression pass, flag them too. A cart
created in the last hour is fine — the job only selects carts idle more than an hour.

- [ ] **Step 2: Set the environment variable in Coolify**

Add `ENABLE_JOB_AUTORUN=true` to the `alkebu-load` service environment in Coolify. Do not add it
to any other environment.

- [ ] **Step 3: Deploy**

```bash
git push origin main
```

This fires the Coolify auto-deploy webhook. Watch the build to completion, then:

```bash
curl -s https://payload.alkebulanimages.com/api/health
```

Expected: healthy.

- [ ] **Step 4: Observe the first real job**

The soonest scheduled task is `recover-stripe-orders` at `:15` past the hour. Within the hour,
check Coolify logs for its execution, and check the `payload-jobs` collection in `/admin` for a
row with `taskSlug: recover-stripe-orders` and `completedAt` populated.

Expected behavior on this first run: it lists the **40 most recent** Stripe Checkout sessions
(`src/app/utils/stripeRecovery.ts:311-316`), skips any younger than 30 minutes, and compares
against the 200 newest orders. It will not sweep months of history. If it recovers anything, it
emails staff only — customer emails are skipped by design.

- [ ] **Step 5: Confirm the two-hourly cart job is harmless**

Within two hours, confirm `cleanup-abandoned-carts` ran and that **no abandoned-cart email was
sent**. The suppression from Step 1 should make it a no-op over history. If any customer email
went out, disable `ENABLE_JOB_AUTORUN` in Coolify immediately and report before continuing.

- [ ] **Step 6: Confirm the daily digest**

At 12:00 UTC (7 AM CDT), a digest email should arrive at `STAFF_NOTIFICATION_EMAIL`. This is the
clearest end-to-end proof, and it is the signal whose absence originally indicated the runner was
dead.

- [ ] **Step 7: Record the outcome**

Once a job is observed completing in production, the blocking dependency in the catalog staging
spec is cleared. Update
`docs/superpowers/specs/2026-09-23-square-catalog-staging-design.md` — mark the "Job runner
confirmed executing in production" acceptance gate as met, and note the date.

---

## Follow-up, deliberately out of scope

- **Historical Stripe sweep.** The recovery job's lookback is depth-bounded (40 sessions), not
  time-bounded, so it can never catch up on the window when it was dormant. A one-off run with a
  much larger `limit` would reveal whether any paid orders were lost. Read-only until it finds
  something. Worth doing once, separately.
- **Multi-instance safety.** If Coolify is ever scaled past one replica, each would run its own
  `autoRun` cron. Payload's `defaultBeforeSchedule` caps scheduled jobs at one runnable per
  task per queue, which limits the damage, but this has not been tested under replication.
  Single instance is assumed throughout.
- **`isActive` backfill** and the **catalog staging work** — separate plans.

## Self-review notes

- Spec coverage: this plan implements the spec's "Blocking dependency" section and its
  "Job runner confirmed executing in production" acceptance gate. All other spec sections belong
  to the catalog staging plan and are intentionally absent.
- Type consistency: `resolveJobAutoRunConfig` is named identically in Tasks 1 and 2 and returns
  `AutorunCronConfig[]` in both. That type is **not** exported from the `payload` root, so it is
  derived from the exported `JobsConfig`. The derivation was compiled against the installed
  payload 3.79.0 with `tsc --noEmit` before this plan was written; it resolves cleanly and the
  object literal `{ cron, queue, limit }` satisfies it.
- No placeholders: every step carries the literal file content or command to run.
