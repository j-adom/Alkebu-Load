// Next.js calls register() once when the server starts.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { startMemoryLogger } = await import('./app/utils/memoryLogger')
  startMemoryLogger()
}
