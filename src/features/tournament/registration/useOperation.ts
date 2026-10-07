import { useRef, useState } from 'react'
import { useTournamentRequestScope } from '../requestScope'
import {
  clearIntent,
  isDefinitiveRejection,
  readIntent,
  saveIntent,
  type OperationIntent,
} from './operationIntents'

export const useOperation = (
  scope: string,
  isSettled: (intent: OperationIntent) => boolean = () => false,
) => {
  const isCurrent = useTournamentRequestScope(scope)
  const [storedIntent, setIntent] = useState<OperationIntent | null>(() => readIntent(scope))
  const intent = storedIntent !== null && isSettled(storedIntent) ? null : storedIntent
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [error, setError] = useState<{ message: string; state: string } | null>(null)
  const run = async <T>(
    fingerprint: string,
    state: string,
    command: (operationId: string) => Promise<T>,
    isPending: (result: T) => boolean = () => false,
  ): Promise<T | null> => {
    if (busyRef.current) return null
    const cached = readIntent(scope)
    const previous = cached !== null && isSettled(cached) ? null : cached
    if (cached !== null && previous === null) clearIntent(scope)
    if (previous !== null && previous.fingerprint !== fingerprint) {
      setError({
        state,
        message: 'Primero comprueba el intento pendiente antes de cambiar la operación.',
      })
      return null
    }
    const next: OperationIntent = previous ?? {
      operationId: crypto.randomUUID(),
      fingerprint,
      phase: 'UNCERTAIN',
    }
    saveIntent(scope, next)
    setIntent(next)
    busyRef.current = true
    setBusy(true)
    setError(null)
    try {
      const result = await command(next.operationId)
      if (!isCurrent()) return null
      if (isPending(result)) {
        const pending = { ...next, phase: 'UNCERTAIN' } as const
        saveIntent(scope, pending)
        setIntent(pending)
      } else {
        clearIntent(scope)
        setIntent(null)
      }
      return result
    } catch (failure: unknown) {
      if (!isCurrent()) return null
      if (isDefinitiveRejection(failure)) {
        const rejected = { ...next, phase: 'REJECTED' } as const
        saveIntent(scope, rejected)
        setIntent(rejected)
      }
      setError({
        state,
        message:
          failure instanceof Error
            ? failure.message
            : 'No se pudo comprobar el resultado. Reintenta la misma operación.',
      })
      return null
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }
  const resetRejected = (): void => {
    if (intent?.phase !== 'REJECTED' || busyRef.current) return
    clearIntent(scope)
    setIntent(null)
    setError(null)
  }
  return { intent, busy, error, run, resetRejected }
}
