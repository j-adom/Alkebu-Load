import { monitorEventLoopDelay } from 'node:perf_hooks'
import { getHeapStatistics } from 'node:v8'

/**
 * Periodic one-line resource log, so that when the server hangs (it froze after ~45h of uptime
 * on 2026-11-07 and 2026-11-09, with no OOM kill) the container log shows what was growing
 * before it stopped answering: heap, RSS, open handles, or event-loop stalls.
 *
 * Started once from `src/instrumentation.ts`. Production only; `MEMORY_LOG_INTERVAL_MS=0`
 * turns it off, any other positive number overrides the 10-minute default.
 */

export const DEFAULT_MEMORY_LOG_INTERVAL_MS = 10 * 60 * 1000

export type ResourceSample = {
  rss: number
  heapUsed: number
  heapTotal: number
  heapLimit: number
  external: number
  arrayBuffers: number
  activeResources: number
  loopDelayP99Ms: number
  loopDelayMaxMs: number
  uptimeSeconds: number
}

const mib = (bytes: number) => Math.round(bytes / 1048576)

export function formatResourceLine(s: ResourceSample): string {
  const heapPct = s.heapLimit > 0 ? Math.round((s.heapUsed / s.heapLimit) * 100) : 0
  return [
    '[resources]',
    `uptime=${(s.uptimeSeconds / 3600).toFixed(1)}h`,
    `rss=${mib(s.rss)}MiB`,
    `heapUsed=${mib(s.heapUsed)}MiB`,
    `heapTotal=${mib(s.heapTotal)}MiB`,
    `heapLimit=${mib(s.heapLimit)}MiB`,
    `heapPct=${heapPct}%`,
    `external=${mib(s.external)}MiB`,
    `arrayBuffers=${mib(s.arrayBuffers)}MiB`,
    `handles=${s.activeResources}`,
    `loopP99=${Math.round(s.loopDelayP99Ms)}ms`,
    `loopMax=${Math.round(s.loopDelayMaxMs)}ms`,
  ].join(' ')
}

export function resolveMemoryLogInterval(env: NodeJS.ProcessEnv = process.env): number | null {
  if (env.NODE_ENV !== 'production') return null
  const raw = env.MEMORY_LOG_INTERVAL_MS
  if (raw === undefined || raw.trim() === '') return DEFAULT_MEMORY_LOG_INTERVAL_MS
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return parsed
}

const STARTED = Symbol.for('alkebu.memoryLogger.started')

export function startMemoryLogger(env: NodeJS.ProcessEnv = process.env): void {
  const interval = resolveMemoryLogInterval(env)
  const g = globalThis as typeof globalThis & { [STARTED]?: boolean }
  if (interval === null || g[STARTED]) return
  g[STARTED] = true

  const loopDelay = monitorEventLoopDelay({ resolution: 20 })
  loopDelay.enable()

  const log = () => {
    const mem = process.memoryUsage()
    // Not console.log: the production build strips it (next.config `compiler.removeConsole`
    // keeps only error/warn/info), and a direct write can't be caught by that config.
    process.stdout.write(
      formatResourceLine({
        rss: mem.rss,
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
        heapLimit: getHeapStatistics().heap_size_limit,
        external: mem.external,
        arrayBuffers: mem.arrayBuffers,
        activeResources: process.getActiveResourcesInfo().length,
        // Histogram values are nanoseconds; reset so each line covers one interval.
        loopDelayP99Ms: loopDelay.percentile(99) / 1e6,
        loopDelayMaxMs: loopDelay.max / 1e6,
        uptimeSeconds: process.uptime(),
      }) + '\n',
    )
    loopDelay.reset()
  }

  log()
  setInterval(log, interval).unref()
}
