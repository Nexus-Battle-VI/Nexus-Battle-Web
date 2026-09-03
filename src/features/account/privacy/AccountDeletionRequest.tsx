import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'

import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatDateTime } from '@/lib/format'
import { HttpError } from '@/lib/http'
import { requestOwnAccountDeletion, type AccountDeletionRequest as DeletionReceipt } from './api'

export type AccountDeletionRequestTransport = () => Promise<DeletionReceipt>

export interface AccountDeletionRequestProps {
  /** Transporte inyectable para ejercitar la pantalla sin red (mismo patron que `TotpEnrollment`). */
  readonly requestDeletion?: AccountDeletionRequestTransport
}

type Step = 'idle' | 'confirming'

const DELETION_FAILED_DEFAULT =
  'No se pudo enviar tu solicitud de eliminación. Intenta nuevamente más tarde.'

const deletionErrorMessage = (error: unknown): string => {
  if (error instanceof HttpError && error.isUnauthorized) {
    return 'Tu sesión ha caducado. Vuelve a iniciar sesión para solicitar la eliminación de tu cuenta.'
  }

  return DELETION_FAILED_DEFAULT
}

/**
 * Solicitud de eliminacion de la cuenta propia (HU-43.5), integrada en el
 * portal de privacidad (HU-45.4).
 *
 * Consume EXACTAMENTE el contrato de HU-43.2 (`POST /api/accounts/me/deletion-requests`,
 * sin cuerpo): la identidad del titular la resuelve Account desde el
 * testimonio de la sesion -adjunto por `httpClient`-, nunca un identificador
 * que esta pantalla envie o construya.
 *
 * La respuesta del backend es idempotente: repetir la solicitud mientras ya
 * hay una activa devuelve la MISMA solicitud (200), no un error. Por eso esta
 * pantalla no distingue "creada ahora" de "ya existente": ambos casos son,
 * para el titular, "tu solicitud fue recibida", con la fecha real que Account
 * devuelve -nunca una fecha inventada en el cliente-.
 *
 * Confirma RECEPCION, nunca eliminacion: HU-43 admite hasta 30 dias de plazo
 * (Politica de Privacidad y Datos Personales, EN-011/ADR-014) y el
 * tratamiento ocurre despues, fuera de esta peticion.
 */
export const AccountDeletionRequest = ({
  requestDeletion = requestOwnAccountDeletion,
}: AccountDeletionRequestProps = {}): React.JSX.Element => {
  const [step, setStep] = useState<Step>('idle')
  const mutation = useMutation({ mutationFn: requestDeletion })

  const handleConfirm = (): void => {
    // Refuerzo de UX contra el doble clic: la mutacion en curso ya deshabilita
    // el boton, pero un envio de formulario o un evento repetido antes del
    // repintado no debe disparar una segunda peticion. La idempotencia REAL
    // sigue siendo responsabilidad de Account (HU-43.1), no de esta guarda.
    if (mutation.isPending) {
      return
    }

    mutation.mutate()
  }

  const handleCancel = (): void => {
    mutation.reset()
    setStep('idle')
  }

  if (mutation.isSuccess) {
    const { status, receivedAt } = mutation.data

    return (
      <section className="space-y-3" aria-labelledby="account-deletion-title">
        <h3 id="account-deletion-title" className="text-sm font-semibold text-ink">
          Eliminar mi cuenta
        </h3>
        <div
          role="status"
          className="space-y-2 rounded-lg border border-brand bg-brand/10 p-4 text-sm text-ink"
        >
          <p className="font-medium">Solicitud recibida.</p>
          <p className="text-xs text-muted">
            La procesaremos dentro de un plazo máximo de 30 días. La recepción de tu solicitud no
            significa que tu cuenta ya fue eliminada; cuando el tratamiento finalice recibirás una
            notificación de cierre.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <StatusBadge status={status} />
            <span className="text-xs text-muted">Recibida el {formatDateTime(receivedAt)}</span>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-3" aria-labelledby="account-deletion-title">
      <div>
        <h3 id="account-deletion-title" className="text-sm font-semibold text-ink">
          Eliminar mi cuenta
        </h3>
        <p className="mt-2 text-xs text-muted">
          Solicita la eliminación de tu cuenta. La solicitud se procesa dentro de un plazo máximo de
          30 días: recibirla no significa que tu cuenta ya fue eliminada. Cuando el proceso
          finalice, recibirás una notificación de cierre.
        </p>
      </div>

      {mutation.isError && (
        <p
          role="alert"
          className="rounded-lg border border-danger bg-danger/10 p-3 text-xs text-danger"
        >
          {deletionErrorMessage(mutation.error)}
        </p>
      )}

      {step === 'idle' ? (
        <Button
          type="button"
          variant="danger"
          onClick={() => {
            setStep('confirming')
          }}
        >
          Solicitar eliminación de cuenta
        </Button>
      ) : (
        <div
          role="group"
          aria-labelledby="account-deletion-confirm-title"
          className="space-y-3 rounded-lg border border-danger bg-danger/5 p-4"
        >
          <p id="account-deletion-confirm-title" className="text-sm font-medium text-ink">
            ¿Confirmas que quieres solicitar la eliminación de tu cuenta?
          </p>
          <p className="text-xs text-muted">Esta solicitud aplica únicamente a tu propia cuenta.</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="danger"
              loading={mutation.isPending}
              onClick={handleConfirm}
            >
              Sí, solicitar eliminación
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={mutation.isPending}
              onClick={handleCancel}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
