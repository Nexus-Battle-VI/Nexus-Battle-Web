import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

import { Button } from '@/components/ui/Button'
import { confirmTotp, enrollTotp, type TotpAssociation } from './api'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '@/shared/i18n/language'
import { describeFailure } from '@/shared/i18n/errors'

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
  // Texto ya localizado del fallo (describeFailure o clave traducida).
  const [failure, setFailure] = useState<string | null>(null)
  const { t } = useTranslation()
  const language = useLanguage((state) => state.language)

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
      setFailure(
        error instanceof Error
          ? describeFailure(error, t, language)
          : t('account:totp.enrollFailed'),
      )
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
      setFailure(t('account:totp.codeFormat'))
      return
    }

    setConfirming(true)

    try {
      await onConfirm(code.trim())
      setConfirmed(true)
    } catch (error: unknown) {
      setFailure(
        error instanceof Error
          ? describeFailure(error, t, language)
          : t('account:totp.confirmFailed'),
      )
    } finally {
      setConfirming(false)
    }
  }

  if (confirmed) {
    return (
      <p role="status" className="rounded-lg border border-brand bg-brand/10 p-4 text-sm text-ink">
        {t('account:totp.confirmed')}
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
          <p className="text-sm text-muted">{t('account:totp.intro')}</p>
          <Button onClick={() => void handleEnroll()} loading={associating}>
            {t('account:totp.setup')}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted">{t('account:totp.scan')}</p>

          {qrDataUrl !== null && (
            <img
              src={qrDataUrl}
              alt={t('account:totp.qrAlt')}
              width={208}
              height={208}
              className="rounded-md border border-border bg-white p-2"
            />
          )}

          <div>
            <p className="text-xs text-muted">{t('account:totp.manualKey')}</p>
            <code className="mt-1 inline-block rounded bg-surface px-2 py-1 text-sm tracking-widest text-ink">
              {association.secret}
            </code>
          </div>

          <div className="space-y-2">
            <label htmlFor="totp-code" className="block text-sm font-medium text-ink">
              {t('account:totp.code')}
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
            {t('account:totp.confirm')}
          </Button>
        </div>
      )}
    </div>
  )
}
