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
