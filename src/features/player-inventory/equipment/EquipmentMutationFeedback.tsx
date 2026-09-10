import { Lock } from 'lucide-react'

import { HttpError } from '@/lib/http'

export interface EquipmentMutationFeedbackProps {
  readonly error: unknown
}

const hasBattleLockReason = (body: unknown): boolean =>
  typeof body === 'object' && body !== null && 'reason' in body && body.reason === 'battle_lock'

/**
 * Reconoce el contrato estable de HU-29 sin inferir el estado de la batalla en
 * el navegador. Tanto el codigo HTTP como `reason` deben coincidir: un 409 por
 * ranura ocupada sigue siendo un error normal de HU-28.
 */
const isBattleLockError = (error: unknown): error is HttpError =>
  error instanceof HttpError && error.status === 409 && hasBattleLockReason(error.body)

/**
 * Feedback de una mutacion de equipamiento rechazada.
 *
 * El backend es la unica autoridad del bloqueo. Este componente no decide si
 * hay una batalla activa ni bloquea por anticipado: presenta el resultado de
 * la operacion y deja explicito que el loadout visible se conserva. El hook de
 * mutacion no hace actualizaciones optimistas, por lo que un rechazo nunca
 * altera la cache de equipamiento.
 */
export const EquipmentMutationFeedback = ({
  error,
}: EquipmentMutationFeedbackProps): React.JSX.Element | null => {
  if (error === null || error === undefined) {
    return null
  }

  if (isBattleLockError(error)) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="mt-2 rounded-lg border border-danger/40 bg-danger/10 p-3 text-danger"
      >
        <div className="flex items-start gap-2">
          <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="text-xs font-semibold">Equipamiento protegido durante la batalla</p>
            <p className="mt-1 text-xs">{error.message}</p>
            <p className="mt-1 text-[11px] text-muted">
              El arma, la armadura y los ítems visibles se mantienen sin cambios.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const message =
    error instanceof HttpError
      ? error.message
      : 'No se pudo equipar el producto. Inténtalo de nuevo.'

  return (
    <p role="alert" className="mt-1 text-danger">
      {message}
    </p>
  )
}
