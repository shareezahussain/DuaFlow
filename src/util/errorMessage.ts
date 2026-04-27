/**
 * Extracts a human-readable message from any thrown value.
 * Handles Error objects, strings, FFmpeg exit codes (numbers),
 * and completely unknown shapes.
 */
export function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string' && err.trim()) return err
  if (typeof err === 'number') return `Process exited with code ${err}`
  if (err && typeof err === 'object' && 'message' in err && typeof (err as Record<string, unknown>).message === 'string') {
    return (err as { message: string }).message
  }
  return 'An unexpected error occurred'
}
