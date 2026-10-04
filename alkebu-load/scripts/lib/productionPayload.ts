// Boots Payload for an owner-run script against the production Postgres database
// (normally through an SSH tunnel, see CLAUDE.md). Refuses non-Postgres URLs and forces
// production mode so Payload's dev-mode schema push can never run: a tunnel makes
// production look like localhost, where dev push is otherwise allowed.
import dotenv from 'dotenv'

export async function getProductionPayload(tag: string) {
  dotenv.config({ path: './.env' })
  const uri = (process.env.DATABASE_URI ?? '').trim().replace(/^(['"])(.*)\1$/, '$2')
  if (!uri.startsWith('postgres')) {
    const seen = uri === '' ? 'empty' : `scheme "${uri.split(':')[0]}"`
    console.error(`[${tag}] DATABASE_URI is not a Postgres URL (got: ${seen}). Point it at the production database.`)
    process.exit(1)
  }
  process.env.DATABASE_URI = uri
  ;(process.env as Record<string, string>).NODE_ENV = 'production'
  // Dynamic: payload.config reads DATABASE_URI / PAYLOAD_SECRET at module load.
  const { getPayload } = await import('payload')
  const { default: config } = await import('../../src/payload.config.js')
  return getPayload({ config })
}

export function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  return i === -1 ? undefined : process.argv[i + 1]
}

export const csvCell = (value: unknown) => {
  const s = value === undefined || value === null ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
