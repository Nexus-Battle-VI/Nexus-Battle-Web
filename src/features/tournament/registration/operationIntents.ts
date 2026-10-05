import { HttpError } from '@/lib/http'

export interface OperationIntent {
  readonly operationId: string
  readonly fingerprint: string
  readonly phase: 'UNCERTAIN' | 'REJECTED'
}
const prefix = 'nexus:tournament:intent:v2:'
// Only IDs and non-sensitive business fingerprints. Never cards or credentials.
const memory = new Map<string, OperationIntent>()
const memoryOnly = new Set<string>()
export const readIntent = (scope: string): OperationIntent | null => {
  if (memoryOnly.has(scope)) return memory.get(scope) ?? null
  try {
    const raw = sessionStorage.getItem(prefix + scope)
    if (raw === null) return null
    {
      const value: unknown = JSON.parse(raw)
      if (
        typeof value === 'object' &&
        value !== null &&
        'operationId' in value &&
        typeof value.operationId === 'string' &&
        'fingerprint' in value &&
        typeof value.fingerprint === 'string' &&
        'phase' in value &&
        (value.phase === 'UNCERTAIN' || value.phase === 'REJECTED')
      ) {
        const intent: OperationIntent = {
          operationId: value.operationId,
          fingerprint: value.fingerprint,
          phase: value.phase,
        }
        memory.set(scope, intent)
        return intent
      }
    }
  } catch {
    /* Storage unavailable: preserve intent for this page lifetime. */
  }
  return memory.get(scope) ?? null
}
export const saveIntent = (scope: string, intent: OperationIntent): void => {
  memory.set(scope, intent)
  try {
    sessionStorage.setItem(prefix + scope, JSON.stringify(intent))
    memoryOnly.delete(scope)
  } catch {
    memoryOnly.add(scope)
  }
}
export const clearIntent = (scope: string): void => {
  memory.delete(scope)
  try {
    sessionStorage.removeItem(prefix + scope)
    memoryOnly.delete(scope)
  } catch {
    memoryOnly.add(scope)
  }
}
export const isDefinitiveRejection = (error: unknown): boolean => {
  if (!(error instanceof HttpError) || !error.isClientError) return false
  const code =
    typeof error.body === 'object' && error.body !== null && 'code' in error.body
      ? error.body.code
      : null
  // Only documented definitive rejections permit correction with a new ID.
  // Conflicts, request timeouts, rate limits and auth failures retain the intention.
  return [400, 404, 422].includes(error.status) && code !== 'OPERATION_CONFLICT'
}
