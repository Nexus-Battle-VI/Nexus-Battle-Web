import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

import { Button } from '@/components/ui/Button'
import { confirmTotp, enrollTotp, type TotpAssociation } from './api'

const ENROLL_FAILED = 'No se pudo iniciar la configuracion del autenticador.'
const CONFIRM_FAILED = 'No se pudo confirmar el autenticador.'

const CODE_INPUT_CLASS =
  'block w-40 rounded-md border border-border bg-[var(--nb-field)] px-3 py-2 text-sm tracking-widest text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand'

export interface TotpEnrollmentProps {
  /** Transportes inyectables para ejercitar la pantalla sin red. */
  readonly onEnroll?: () => Promise<TotpAssociation>
  readonly onConfirm?: (code: string) => Promise<void>
}

/**
 * Inscripcion del autenticador (TOTP) por la UI, en dos pasos: asociar (muestra
 * el QR y la clave) y confirmar el primer codigo.
 *
 * El QR se genera EN EL CLIENTE a partir del `otpauth://` que devuelve Account;
 * ni el secreto ni el QR salen a ningun servicio de terceros. Se ofrece ademas
 * la clave en texto porque no todo autenticador escanea, y porque un QR sin
 * alternativa deja fuera a quien usa lector de pantalla.
 */
export const TotpEnrollment = ({
  onEnroll = enrollTotp,
  onConfirm = confirmTotp,
}: TotpEnrollmentProps = {}): React.JSX.Element => {
  const [association, setAssociation] = useState<TotpAssociation | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [associating, setAssociating] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  useEffect(() => {
    // Una vez asociado, no se vuelve a `null` en este flujo, asi que no hace
    // falta limpiar el QR de forma sincrona aqui (y hacerlo dispararia la regla
    // de estado-en-efecto). El pintado ocurre en la promesa, fuera del render.
    if (association === null) {
      return
    }

    let cancelled = false

    QRCode.toDataURL(association.otpauthUri, { margin: 1, width: 208 })
      .then((url) => {
        if (!cancelled) {
          setQrDataUrl(url)
        }
      })
      .catch(() => {
        // El QR es una comodidad: si no se puede pintar, la clave manual sigue
        // permitiendo inscribir el autenticador. No se rompe la pantalla.
        if (!cancelled) {
          setQrDataUrl(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [association])

  const handleEnroll = async (): Promise<void> => {
    if (associating) {
      return
    }

    setFailure(null)
    setAssociating(true)

    try {
      setAssociation(await onEnroll())
    } catch (error: unknown) {
      setFailure(error instanceof Error ? error.message : ENROLL_FAILED)
    } finally {
      setAssociating(false)
    }
  }

  const handleConfirm = async (): Promise<void> => {
    if (confirming) {
      return
    }

    setFailure(null)

    if (!/^\d{6}$/u.test(code.trim())) {
      setFailure('El codigo debe tener seis digitos.')
      return
    }

    setConfirming(true)

    try {
      await onConfirm(code.trim())
      setConfirmed(true)
    } catch (error: unknown) {
      setFailure(error instanceof Error ? error.message : CONFIRM_FAILED)
    } finally {
      setConfirming(false)
    }
  }

  if (confirmed) {
    return (
      <p role="status" className="rounded-lg border border-brand bg-brand/10 p-4 text-sm text-ink">
        Autenticador confirmado. A partir del proximo inicio de sesion se te pedira el codigo de tu
        aplicacion.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {failure !== null && (
        <p
          role="alert"
          className="rounded-lg border border-danger bg-danger/10 p-3 text-sm text-danger"
        >
          {failure}
        </p>
      )}

      {association === null ? (
        <div className="space-y-3">
          <p className="text-sm text-muted">
            Anade una aplicacion autenticadora (Google Authenticator, Authy, etc.) como segundo
            factor. Es obligatorio antes de recibir un rol administrativo.
          </p>
          <Button onClick={() => void handleEnroll()} loading={associating}>
            Configurar autenticador
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Escanea el codigo QR con tu aplicacion, o introduce la clave a mano. Despues escribe el
            codigo de seis digitos que muestre para confirmar.
          </p>

          {qrDataUrl !== null && (
            <img
              src={qrDataUrl}
              alt="Codigo QR para configurar tu aplicacion autenticadora"
              width={208}
              height={208}
              className="rounded-md border border-border bg-white p-2"
            />
          )}

          <div>
            <p className="text-xs text-muted">Clave para introducir a mano:</p>
            <code className="mt-1 inline-block rounded bg-surface px-2 py-1 text-sm tracking-widest text-ink">
              {association.secret}
            </code>
          </div>

          <div className="space-y-2">
            <label htmlFor="totp-code" className="block text-sm font-medium text-ink">
              Codigo del autenticador
            </label>
            <input
              id="totp-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(event) => {
                setCode(event.target.value)
              }}
              className={CODE_INPUT_CLASS}
            />
          </div>

          <Button onClick={() => void handleConfirm()} loading={confirming}>
            Confirmar autenticador
          </Button>
        </div>
      )}
    </div>
  )
}
