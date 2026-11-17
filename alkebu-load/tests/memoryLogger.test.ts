import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEFAULT_MEMORY_LOG_INTERVAL_MS,
  formatResourceLine,
  resolveMemoryLogInterval,
} from '../src/app/utils/memoryLogger'

const MiB = 1048576

test('formatResourceLine renders one greppable line in MiB', () => {
  const line = formatResourceLine({
    rss: 480 * MiB,
    heapUsed: 268 * MiB,
    heapTotal: 300 * MiB,
    heapLimit: 1072 * MiB,
    external: 12 * MiB,
    arrayBuffers: 3 * MiB,
    activeResources: 41,
    loopDelayP99Ms: 21.4,
    loopDelayMaxMs: 812.6,
    uptimeSeconds: 9 * 3600,
  })
  assert.equal(
    line,
    '[resources] uptime=9.0h rss=480MiB heapUsed=268MiB heapTotal=300MiB heapLimit=1072MiB heapPct=25% external=12MiB arrayBuffers=3MiB handles=41 loopP99=21ms loopMax=813ms',
  )
  assert.ok(!line.includes('\n'))
})

test('resolveMemoryLogInterval is production-only with an opt-out', () => {
  assert.equal(resolveMemoryLogInterval({ NODE_ENV: 'development' }), null)
  assert.equal(resolveMemoryLogInterval({ NODE_ENV: 'production' }), DEFAULT_MEMORY_LOG_INTERVAL_MS)
  assert.equal(resolveMemoryLogInterval({ NODE_ENV: 'production', MEMORY_LOG_INTERVAL_MS: '' }), DEFAULT_MEMORY_LOG_INTERVAL_MS)
  assert.equal(resolveMemoryLogInterval({ NODE_ENV: 'production', MEMORY_LOG_INTERVAL_MS: '60000' }), 60000)
  assert.equal(resolveMemoryLogInterval({ NODE_ENV: 'production', MEMORY_LOG_INTERVAL_MS: '0' }), null)
  assert.equal(resolveMemoryLogInterval({ NODE_ENV: 'production', MEMORY_LOG_INTERVAL_MS: 'soon' }), null)
})
