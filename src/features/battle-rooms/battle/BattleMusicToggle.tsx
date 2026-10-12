import { Music } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useMusicSettings, useSfxSettings } from '@/shared/sound'

/**
 * EN-031: silencia o enciende la musica de batalla sin salir de la pelea. Con
 * el sonido general apagado, pulsarlo enciende los dos (es la forma rapida de
 * oir la batalla); encendido, solo apaga la musica y los golpes siguen sonando.
 */
export const BattleMusicToggle = (): React.JSX.Element => {
  const { t } = useTranslation()
  const soundOn = useSfxSettings((state) => state.enabled)
  const setSound = useSfxSettings((state) => state.setEnabled)
  const musicOn = useMusicSettings((state) => state.enabled)
  const setMusic = useMusicSettings((state) => state.setEnabled)
  const playing = soundOn && musicOn

  return (
    <button
      type="button"
      aria-pressed={playing}
      aria-label={t('battle:music.toggle')}
      title={playing ? t('battle:music.on') : t('battle:music.off')}
      className="br-stage-tool"
      onClick={() => {
        if (playing) {
          setMusic(false)
          return
        }
        setSound(true)
        setMusic(true)
      }}
    >
      <Music aria-hidden="true" className="h-5 w-5" />
    </button>
  )
}
