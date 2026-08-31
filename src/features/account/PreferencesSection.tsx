import clsx from 'clsx'

import { Card } from '@/components/ui/Card'
import { useTheme, type Theme } from '@/shared/theme'

/**
 * Preferencias de la cuenta (HU-05.4).
 *
 * TEMA: unico control de tema dentro de "Mi cuenta" -por eso `AppHeader` oculta
 * el conmutador global aqui-. Lee y escribe EXACTAMENTE el mismo store
 * (`@/shared/theme`): no hay un segundo estado ni una segunda persistencia. Es
 * el mismo `setTheme` que usa `ThemeToggle`, presentado de forma mas integrada.
 *
 * IDIOMA: Account no expone hoy ningun contrato para persistir el idioma
 * (revisado en `accounts.controller.ts` / `AccountDto`). No se inventa
 * almacenamiento: se declara como pendiente, igual que Suscripciones y Pagos.
 */

const THEME_OPTIONS: readonly {
  readonly value: Theme
  readonly label: string
  readonly hint: string
}[] = [
  { value: 'light', label: 'Claro', hint: 'Fondo mineral claro con acento azul Nexus.' },
  { value: 'dark', label: 'Oscuro', hint: 'Fondo profundo con acento violeta Nexus.' },
]

export const PreferencesSection = (): React.JSX.Element => {
  const theme = useTheme((state) => state.theme)
  const setTheme = useTheme((state) => state.setTheme)

  return (
    <div className="space-y-4">
      <Card
        title="Tema de la interfaz"
        description="Se aplica de inmediato a toda la aplicacion y se recuerda en este navegador."
      >
        <div role="group" aria-label="Tema de la interfaz" className="grid gap-3 sm:grid-cols-2">
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
                  'flex flex-col gap-1 rounded-lg border p-4 text-left transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                  selected ? 'border-brand bg-brand/10' : 'border-border hover:bg-surface',
                )}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink">
                    {option.label}
                    {selected && <span className="ml-2 text-xs text-brand">Activo</span>}
                  </span>
                  <span className="block text-xs text-muted">{option.hint}</span>
                </span>
              </button>
            )
          })}
        </div>
      </Card>

      <Card title="Idioma" description="Preferencia de idioma de la interfaz.">
        <p className="text-sm text-muted">
          <span className="font-medium text-ink">Todavia no disponible.</span> La interfaz esta en
          espanol. Cuando el servicio de cuenta permita guardar el idioma preferido, se podra elegir
          aqui.
        </p>
      </Card>
    </div>
  )
}
