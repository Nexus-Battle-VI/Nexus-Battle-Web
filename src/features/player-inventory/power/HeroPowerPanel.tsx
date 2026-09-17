import { Zap } from 'lucide-react'
import clsx from 'clsx'

export interface HeroPowerView {
  readonly heroId: string
  readonly heroName: string
  readonly current: number
  readonly max: number
}

export type PowerResolutionView =
  | { readonly kind: 'IDLE' }
  | { readonly kind: 'SPENT'; readonly action: string; readonly spent: number }
  | {
      readonly kind: 'INSUFFICIENT'
      readonly action: string
      readonly fallbackAction: 'Ataque básico'
    }
  | {
      readonly kind: 'UNCHANGED'
      readonly action: string
      readonly reason: 'basic_attack' | 'not_executed'
    }
  | { readonly kind: 'REGENERATED'; readonly amount: 2 }
  | { readonly kind: 'RESTORED' }

export interface HeroPowerPanelProps {
  readonly power: HeroPowerView
  readonly resolution: PowerResolutionView
}

const resolutionCopy = (
  resolution: PowerResolutionView,
): {
  readonly title: string
  readonly detail: string
  readonly tone: 'neutral' | 'success' | 'warning'
} => {
  switch (resolution.kind) {
    case 'IDLE':
      return {
        title: 'Poder listo',
        detail: 'El siguiente evento del combate usará este valor como fuente inmediata.',
        tone: 'neutral',
      }
    case 'SPENT':
      return {
        title: `${resolution.action} ejecutada`,
        detail: `Se descontaron ${String(resolution.spent)} puntos de Poder.`,
        tone: 'success',
      }
    case 'INSUFFICIENT':
      return {
        title: 'Poder insuficiente',
        detail: `${resolution.action} no se ejecutó. La acción se degradó a ${resolution.fallbackAction} sin descontar Poder.`,
        tone: 'warning',
      }
    case 'UNCHANGED':
      return resolution.reason === 'basic_attack'
        ? {
            title: 'Ataque básico',
            detail: 'La acción no tiene costo y el Poder permanece intacto.',
            tone: 'neutral',
          }
        : {
            title: 'Acción no ejecutada',
            detail: `${resolution.action} fue cancelada o rechazada; no se descontó Poder.`,
            tone: 'warning',
          }
    case 'REGENERATED':
      return {
        title: 'Turno procesado',
        detail: `El héroe recuperó +${String(resolution.amount)} sin superar su máximo.`,
        tone: 'success',
      }
    case 'RESTORED':
      return {
        title: 'Combate finalizado',
        detail: 'El Poder se restauró por completo al valor máximo del héroe.',
        tone: 'success',
      }
  }
}

/**
 * Lectura presentacional del recurso Poder (HU-11).
 *
 * No ejecuta reglas de dominio: recibe el estado y la resolución ya decididos
 * por Player/Inventory y el contexto de combate. Esto evita que React se
 * convierta en una segunda autoridad para gasto, +2, clamp o fallback.
 */
export const HeroPowerPanel = ({ power, resolution }: HeroPowerPanelProps): React.JSX.Element => {
  const copy = resolutionCopy(resolution)
  const percentage = power.max === 0 ? 0 : Math.round((power.current / power.max) * 100)

  return (
    <section
      aria-labelledby="hero-power-heading"
      className="flex flex-col gap-5 rounded-2xl border border-border bg-surface-raised p-5 shadow-sm"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-brand uppercase">
            Recurso de combate
          </p>
          <h2 id="hero-power-heading" className="mt-1 text-xl font-bold text-ink">
            Poder de {power.heroName}
          </h2>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-sm font-semibold text-brand">
          <Zap aria-hidden="true" className="size-4" />
          <span className="tabular-nums">
            {power.current}/{power.max}
          </span>
        </span>
      </header>

      <div>
        <div className="mb-2 flex items-end justify-between gap-3 text-sm">
          <span className="font-medium text-ink">Poder disponible</span>
          <span className="tabular-nums text-muted">{percentage}%</span>
        </div>
        <div
          role="progressbar"
          aria-label={`Poder de ${power.heroName}`}
          aria-valuemin={0}
          aria-valuemax={power.max}
          aria-valuenow={power.current}
          aria-valuetext={`${String(power.current)} de ${String(power.max)} puntos de Poder`}
          className="h-3 overflow-hidden rounded-full border border-border bg-surface"
        >
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${String(percentage)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted">
          El máximo pertenece a este héroe; nunca se comparte con otro del jugador.
        </p>
      </div>

      <div
        role={copy.tone === 'warning' ? 'alert' : 'status'}
        className={clsx(
          'rounded-lg border px-4 py-3',
          copy.tone === 'warning' && 'border-danger/35 bg-danger/10',
          copy.tone === 'success' && 'border-success/35 bg-success/10',
          copy.tone === 'neutral' && 'border-border bg-surface',
        )}
      >
        <p
          className={clsx(
            'text-sm font-semibold',
            copy.tone === 'warning' ? 'text-danger' : 'text-ink',
          )}
        >
          {copy.title}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted">{copy.detail}</p>
      </div>
    </section>
  )
}
