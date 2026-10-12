import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import { playSfx, useSfxSettings } from '@/shared/sound'

import { NavPixelIcon } from './NavPixelIcon'

/**
 * Interruptor de los efectos de sonido (EN-031) en la cabecera. Un solo
 * boton con `aria-pressed`: el nombre accesible no cambia, el estado lo da
 * `aria-pressed`. Escribe el MISMO store que Preferencias.
 *
 * Al activarlo suena un clic de confirmacion: la pulsacion es el gesto que
 * el navegador exige para permitir audio.
 */
export const SoundToggle = ({
  className,
}: {
  readonly className?: string | undefined
}): React.JSX.Element => {
  const { t } = useTranslation()
  const enabled = useSfxSettings((state) => state.enabled)
  const setEnabled = useSfxSettings((state) => state.setEnabled)
  const label = t('common:sound.toggle')

  return (
    <button
      type="button"
      aria-pressed={enabled}
      aria-label={label}
      title={enabled ? t('common:sound.on') : t('common:sound.off')}
      onClick={() => {
        setEnabled(!enabled)
        if (!enabled) playSfx('click')
      }}
      className={clsx(
        'nb-hud-pill inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        className,
      )}
    >
      <NavPixelIcon icon={enabled ? 'sound-on' : 'sound-off'} size="md" />
    </button>
  )
}
