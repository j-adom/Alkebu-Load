import assert from 'node:assert';
import test from 'node:test';

import { customerEmailJobSchedule, customerEmailJobsEnabled, resolveJobAutoRunConfig } from '../../src/app/utils/jobRunnerConfig';

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
  // Assert the exact entry object, not just a few fields individually — this
  // closes the gap where a future edit adds e.g. `allQueues: true` and
  // silently widens execution to every queue while still passing.
  assert.deepStrictEqual(config[0], {
    cron: '* * * * *',
    queue: 'default',
    limit: 10,
  });
});

test('does not disable scheduling — autoRun must both queue and run', () => {
  const [entry] = resolveJobAutoRunConfig({ ENABLE_JOB_AUTORUN: 'true' });

  // Payload only calls handleSchedules() when disableScheduling is falsy.
  // Setting it would leave scheduled tasks permanently unqueued. Assert the
  // field is actually undefined, not merely "not === true" — notStrictEqual
  // against `true` would also pass for 1, 'true', or {}, none of which are
  // falsy the way Payload's check requires.
  assert.strictEqual(entry.disableScheduling, undefined);
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

test('customer-emailing tasks are never scheduled without ENABLE_CUSTOMER_EMAIL_JOBS', () => {
  const schedule = [{ cron: '0 15 * * *', queue: 'default' }];
  assert.deepStrictEqual(customerEmailJobSchedule(schedule, {}), []);
  assert.deepStrictEqual(customerEmailJobSchedule(schedule, { ENABLE_JOB_AUTORUN: 'true' }), []);
  assert.deepStrictEqual(customerEmailJobSchedule(schedule, { ENABLE_CUSTOMER_EMAIL_JOBS: '1' }), []);
  assert.deepStrictEqual(customerEmailJobSchedule(schedule, { ENABLE_CUSTOMER_EMAIL_JOBS: 'true' }), schedule);
});

test('customer-email handlers skip already-queued runs unless the flag is exactly "true"', () => {
  assert.strictEqual(customerEmailJobsEnabled({}), false);
  assert.strictEqual(customerEmailJobsEnabled({ ENABLE_CUSTOMER_EMAIL_JOBS: 'TRUE' }), false);
  assert.strictEqual(customerEmailJobsEnabled({ ENABLE_CUSTOMER_EMAIL_JOBS: 'true' }), true);
});
