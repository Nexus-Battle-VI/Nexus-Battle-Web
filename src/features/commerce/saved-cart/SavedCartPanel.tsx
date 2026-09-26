import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { formatMoney } from '@/lib/format'
import { useLanguage } from '@/shared/i18n/language'
import { describeFailure } from '@/shared/i18n/errors'
import type { SavedCart } from './api'

export interface SavedCartPanelProps {
  readonly saved: SavedCart | null
  /** `true` cuando la sesion no permite guardar entre sesiones. */
  readonly unavailable: boolean
  /** `true` si el carrito vigente tiene algo que guardar. */
  readonly canSave: boolean
  readonly onSave: () => void
  readonly onRestore: () => void
  readonly onDiscard: () => void
  readonly isBusy?: boolean
  readonly error?: unknown
}

/**
 * Carrito guardado entre sesiones (HU-61).
 *
 * Se distingue de la conservacion de HU-58: aquella mantiene el carrito
 * mientras se navega; esta lo conserva **despues de cerrar la sesion**. Por
 * eso guardar es una accion explicita y no algo que ocurra solo, y por eso el
 * texto lo dice con esas palabras.
 */
export const SavedCartPanel = ({
  saved,
  unavailable,
  canSave,
  onSave,
  onRestore,
  onDiscard,
  isBusy = false,
  error,
}: SavedCartPanelProps): React.JSX.Element => {
  const { t } = useTranslation()
  const language = useLanguage((state) => state.language)

  if (unavailable) {
    return (
      <section
        aria-label={t('commerce:saved.label')}
        className="rounded-lg border border-border bg-surface-raised p-4"
      >
        <h2 className="text-base font-semibold text-ink">{t('commerce:saved.title')}</h2>
        {/*
          No es un error: es una condicion de la funcionalidad. HU-61 exige
          identidad verificada, porque un carrito guardado sin saber de quien
          es no se puede devolver a nadie. Se explica en lugar de mostrar un
          fallo generico que haria pensar que la pantalla esta rota.
        */}
        <p className="mt-2 text-sm text-muted">{t('commerce:saved.unavailable')}</p>
      </section>
    )
  }

  return (
    <section
      aria-label={t('commerce:saved.label')}
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface-raised p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">{t('commerce:saved.title')}</h2>
        <Button onClick={onSave} disabled={!canSave || isBusy}>
          {t('commerce:saved.save')}
        </Button>
      </div>

      {!canSave && saved === null && (
        <p className="text-sm text-muted">{t('commerce:saved.addFirst')}</p>
      )}

      {saved === null ? (
        canSave && <p className="text-sm text-muted">{t('commerce:saved.none')}</p>
      ) : (
        <>
          <p className="text-sm text-muted">
            {t('commerce:saved.summaryBefore')}{' '}
            <span data-testid="guardado-item-count" className="font-medium text-ink">
              {saved.itemCount}
            </span>{' '}
            {t('commerce:saved.summaryProducts', { count: saved.itemCount })}{' '}
            <span data-testid="guardado-total" className="font-medium text-ink tabular-nums">
              {formatMoney(saved.total, saved.currency)}
            </span>
            .
          </p>

          <ul className="flex flex-col gap-1">
            {saved.items.map((item) => (
              <li key={item.sku} className="flex justify-between gap-3 text-xs text-muted">
                <span>
                  {item.name ?? item.sku} <span aria-hidden="true">x{item.quantity}</span>
                </span>
                <span data-testid={`guardado-subtotal-${item.sku}`} className="tabular-nums">
                  {formatMoney(item.subtotal, saved.currency)}
                </span>
              </li>
            ))}
          </ul>

          {/*
            Recuperar REEMPLAZA el contenido del carrito vigente, y se avisa
            antes de pulsar: descubrirlo despues seria una sorpresa desagradable.
          */}
          <p className="text-xs text-muted">{t('commerce:saved.replaceWarning')}</p>

          <div className="flex flex-wrap gap-3">
            <Button onClick={onRestore} disabled={isBusy}>
              {t('commerce:saved.restore')}
            </Button>
            <Button variant="secondary" onClick={onDiscard} disabled={isBusy}>
              {t('commerce:saved.discard')}
            </Button>
          </div>
        </>
      )}

      {error !== undefined && error !== null && (
        <p role="alert" className="text-sm text-danger">
          {error instanceof Error
            ? describeFailure(error, t, language)
            : t('commerce:saved.failed')}
        </p>
      )}
    </section>
  )
}
