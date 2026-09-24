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
