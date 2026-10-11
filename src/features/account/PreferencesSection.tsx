import { useState } from 'react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import { NavPixelIcon } from '@/components/shell/NavPixelIcon'
import { Card } from '@/components/ui/Card'
import { setLanguage, useLanguage } from '@/shared/i18n/language'
import { LANGUAGE_NATIVE_NAMES, SUPPORTED_LANGUAGES, type Language } from '@/shared/i18n/languages'
import { playSfx, useSfxSettings } from '@/shared/sound'
import { useTheme, type Theme } from '@/shared/theme'

import type { OwnAccount } from './api'
import { AccountPixelIcon } from './AccountPixelIcon'
import { accountPreferences } from './accountRemasterAssets'
import { useUpdatePreferredLanguage } from './useOwnAccount'

const LANGUAGE_FLAG: Readonly<Record<Language, keyof typeof accountPreferences.flags>> = {
  es: 'es',
  en: 'en',
  fr: 'fr',
  pt: 'pt',
}

/**
 * Preferencias de la cuenta (HU-05.4, HU-05 CA-04).
 *
 * TEMA: unico control de tema dentro de "Mi cuenta" -por eso `AppHeader` oculta
 * el conmutador global aqui-. Lee y escribe EXACTAMENTE el mismo store
 * (`@/shared/theme`): no hay un segundo estado ni una segunda persistencia.
 * Sigue siendo una preferencia local del navegador.
 *
 * SONIDO (EN-031): mismo store que el interruptor de la cabecera
 * (`@/shared/sound`), apagado por defecto y guardado solo en este navegador.
 *
 * IDIOMA: se guarda en Account (`preferredLanguage`). Tema e idioma son
 * preferencias independientes: cambiar una no toca la otra.
 */

const THEME_OPTIONS: readonly {
  readonly value: Theme
  readonly labelKey: string
  readonly hintKey: string
}[] = [
  {
    value: 'light',
    labelKey: 'account:preferences.theme.light',
    hintKey: 'account:preferences.theme.lightHint',
  },
  {
    value: 'dark',
    labelKey: 'account:preferences.theme.dark',
    hintKey: 'account:preferences.theme.darkHint',
  },
]

const OPTION_CLASS =
  'account-option-card flex min-h-11 flex-col gap-1 rounded-lg border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait'

/**
 * Ronda 2 (brief seccion 32/33): el SVG inline de la ronda 1 se reemplaza por
 * los medallones de sol/luna REALES del kit (`accountPreferences.themeOptionIcon`,
 * derivados de `Fantasy Gothic UI Sprite Sheet.png` en Dark y de
 * `account-preferences-kit-light-v01.png` en Light -no es un recolor
 * mecanico del mismo recorte-). Decorativos (`aria-hidden`/`alt=""`): el
 * texto real "Claro"/"Oscuro" sigue siendo quien comunica el significado
 * (brief seccion 81).
 */
const ThemeOptionIcon = ({ option }: { readonly option: Theme }): React.JSX.Element => {
  const theme = useTheme((state) => state.theme)
  return (
    <img
      src={accountPreferences.themeOptionIcon[option][theme]}
      alt=""
      aria-hidden
      className="h-7 w-auto"
    />
  )
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed'

/**
 * Selector de idioma.
 *
 * El cambio se ve AL INSTANTE (sin F5 ni cerrar sesion) y despues se guarda en
 * Account. Si Account rechaza o no responde, se vuelve al idioma anterior y se
 * avisa: la interfaz nunca queda afirmando una preferencia que no se guardo.
 */
interface LanguagePreferenceProps {
  /**
   * Transporte inyectable (vista previa DEV), mismo patron que
   * `changePassword`/`exportPersonalData`. Sin valor: `useUpdatePreferredLanguage`
   * usa `updateOwnPreferredLanguage` real -produccion no cambia-.
   */
  readonly savePreferredLanguage?: (language: Language) => Promise<OwnAccount>
}

const LanguagePreference = ({
  savePreferredLanguage,
}: LanguagePreferenceProps): React.JSX.Element => {
  const { t } = useTranslation()
  const language = useLanguage((state) => state.language)
  const save = useUpdatePreferredLanguage(savePreferredLanguage)
  const [status, setStatus] = useState<SaveStatus>('idle')

  const choose = async (next: Language): Promise<void> => {
    if (next === language || status === 'saving') {
      return
    }

    const previous = language
    setStatus('saving')

    try {
      await setLanguage(next)
    } catch {
      // Ni siquiera se pudo descargar el idioma: la interfaz no cambio.
      setStatus('failed')
      return
    }

    save.mutate(next, {
      onSuccess: () => {
        setStatus('saved')
      },
      onError: () => {
        setLanguage(previous).catch(() => undefined)
        setStatus('failed')
      },
    })
  }

  const theme = useTheme((state) => state.theme)

  return (
    <Card
      className="account-panel"
      title={t('account:preferences.language.title')}
      description={t('account:preferences.language.description')}
    >
      <div
        role="group"
        aria-label={t('account:preferences.language.group')}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        {SUPPORTED_LANGUAGES.map((option) => {
          const selected = language === option

          return (
            <button
              key={option}
              type="button"
              lang={option}
              aria-pressed={selected}
              disabled={status === 'saving'}
              onClick={() => {
                void choose(option)
              }}
              className={clsx(OPTION_CLASS, selected && 'is-selected')}
            >
              <span className="flex items-center gap-2">
                <img
                  aria-hidden
                  alt=""
                  className="account-flag"
                  src={accountPreferences.flags[LANGUAGE_FLAG[option]][theme]}
                />
                <span className="block text-sm font-medium text-ink">
                  {LANGUAGE_NATIVE_NAMES[option]}
                  {selected && (
                    <span className="ml-2 text-xs text-brand">
                      {t('account:preferences.active')}
                    </span>
                  )}
                </span>
              </span>
              <span className="block text-xs uppercase text-muted">{option}</span>
            </button>
          )
        })}
      </div>

      <p role="status" className="mt-3 min-h-5 text-xs text-muted">
        {status === 'saving' && t('account:preferences.language.saving')}
        {status === 'saved' && t('account:preferences.language.saved')}
      </p>
      {status === 'failed' && (
        <p role="alert" className="text-sm text-danger">
          {t('account:preferences.language.failed')}
        </p>
      )}

      <p className="mt-2 text-xs text-muted">{t('account:preferences.language.contentNote')}</p>
    </Card>
  )
}

const SOUND_OPTIONS = [
  { enabled: true, icon: 'sound-on', key: 'on' },
  { enabled: false, icon: 'sound-off', key: 'off' },
] as const

/** Efectos de sonido 8-bit (EN-031): activados o desactivados. */
const SoundPreference = (): React.JSX.Element => {
  const { t } = useTranslation()
  const enabled = useSfxSettings((state) => state.enabled)
  const setEnabled = useSfxSettings((state) => state.setEnabled)

  return (
    <Card
      className="account-panel"
      title={t('account:preferences.sound.title')}
      description={t('account:preferences.sound.description')}
    >
      <div
        role="group"
        aria-label={t('account:preferences.sound.title')}
        className="grid gap-3 sm:grid-cols-2"
      >
        {SOUND_OPTIONS.map((option) => {
          const selected = enabled === option.enabled
          return (
            <button
              key={option.key}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                setEnabled(option.enabled)
                if (option.enabled) playSfx('click')
              }}
              className={clsx(
                OPTION_CLASS,
                'flex-row items-center gap-3',
                selected && 'is-selected',
              )}
            >
              <span className="account-option-card__icon flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
                <NavPixelIcon icon={option.icon} size="lg" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-ink">
                  {t(`account:preferences.sound.${option.key}`)}
                  {selected && (
                    <span className="ml-2 text-xs text-brand">
                      {t('account:preferences.active')}
                    </span>
                  )}
                </span>
                <span className="block text-xs text-muted">
                  {t(`account:preferences.sound.${option.key}Hint`)}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}

export interface PreferencesSectionProps {
  /** Reenviado a `LanguagePreference` (vease su prop homonima). */
  readonly savePreferredLanguage?: LanguagePreferenceProps['savePreferredLanguage']
}

export const PreferencesSection = ({
  savePreferredLanguage,
}: PreferencesSectionProps = {}): React.JSX.Element => {
  const { t } = useTranslation()
  const theme = useTheme((state) => state.theme)
  const setTheme = useTheme((state) => state.setTheme)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <AccountPixelIcon icon="preferences" size="md" />
        <h2 className="account-title text-lg font-semibold">{t('account:sections.preferences')}</h2>
      </div>

      <Card
        className="account-panel"
        title={t('account:preferences.theme.title')}
        description={t('account:preferences.theme.description')}
      >
        <div
          role="group"
          aria-label={t('account:preferences.theme.title')}
          className="grid gap-3 sm:grid-cols-2"
        >
          {THEME_OPTIONS.map((option) => {
            const selected = theme === option.value

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setTheme(option.value)
                }}
                className={clsx(
                  OPTION_CLASS,
                  'flex-row items-center gap-3',
                  selected && 'is-selected',
                )}
              >
                <span
                  aria-hidden
                  className="account-option-card__icon flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                >
                  <ThemeOptionIcon option={option.value} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink">
                    {t(option.labelKey)}
                    {selected && (
                      <span className="ml-2 text-xs text-brand">
                        {t('account:preferences.active')}
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-muted">{t(option.hintKey)}</span>
                </span>
              </button>
            )
          })}
        </div>
      </Card>

      <SoundPreference />

      <LanguagePreference
        {...(savePreferredLanguage === undefined ? {} : { savePreferredLanguage })}
      />
    </div>
  )
}
