export type PublicHealthDatabaseStatus = 'connected' | 'disconnected'

export interface PublicHealthResponseInput {
  database: PublicHealthDatabaseStatus
  timestamp?: string
}

export function buildPublicHealthResponse({
  database,
  timestamp = new Date().toISOString(),
}: PublicHealthResponseInput) {
  return {
    status: database === 'connected' ? 'healthy' : 'unhealthy',
    timestamp,
    database,
  }
}
