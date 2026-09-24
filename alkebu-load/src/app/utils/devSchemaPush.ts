/**
 * Decides whether Payload's Postgres adapter may run drizzle's dev schema push.
 *
 * `@payloadcms/db-postgres/dist/connect.js` calls `pushDevSchema()` whenever
 * `NODE_ENV !== 'production' && PAYLOAD_MIGRATING !== 'true' && push !== false`.
 * That is a genuine convenience for a throwaway local database and a live hazard
 * for anything else: a dev server started against a remote URI silently reconciles
 * that database's schema against whatever the current branch happens to define.
 *
 * On 2026-09-23 this repo's `.env` pointed `DATABASE_URI` at the production
 * database over Tailscale, with no `push: false` set. It did not fire only because
 * the host was unreachable from that shell -- luck, not a safeguard.
 *
 * Keying on the target rather than disabling push outright keeps local development
 * exactly as it was while closing the remote case. Fails closed: anything we cannot
 * confidently identify as local returns false.
 */

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'host.docker.internal']);

export function shouldEnableDevSchemaPush(databaseURI: string | undefined): boolean {
  if (!databaseURI) return false;

  let hostname: string;
  try {
    // WHATWG URL keeps the last '@' as the userinfo delimiter, so an '@' inside a
    // password cannot shift which token is read as the host.
    hostname = new URL(databaseURI).hostname;
  } catch {
    return false;
  }

  if (!hostname) return false;

  // IPv6 hosts arrive bracketed ('[::1]'); compare the bare address.
  const bare = hostname.startsWith('[') && hostname.endsWith(']')
    ? hostname.slice(1, -1)
    : hostname;

  return LOCAL_HOSTS.has(bare.toLowerCase());
}
