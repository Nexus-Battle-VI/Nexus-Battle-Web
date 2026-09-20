import clsx from 'clsx'

import { describePower, type HeroPower } from './power'

export interface PowerMeterProps {
  /** Poder del héroe tal como lo envía Combat. La interfaz no lo calcula. */
  readonly power: HeroPower
  /** Nombre visible del héroe: el Poder es del héroe, no del jugador (RF-11). */
  readonly heroName: string
  readonly className?: string
}

/**
 * Medidor del Poder de UN héroe en batalla (HU-11, RF-11): «el nuevo valor debe
 * mostrarse actualizado al jugador durante la batalla o misión».
 *
 * NO CALCULA NADA. Recibe `{ current, max }` y lo dibuja; cuando el padre le pasa
 * un valor nuevo, el texto, la barra y el anuncio para lectores de pantalla
 * cambian en ese mismo renderizado, sin estado propio que pueda quedar atrás. La
 * regla (gastar, +2 por turno, restaurar al final del combate) es de Combat.
 *
 * Un medidor por héroe: cada uno lleva el Poder de un solo héroe y nunca se
 * combina con el de otro, igual que en la regla.
 *
 * Accesibilidad: la barra es un `role="meter"` con su valor y rango. El texto
 * visible `6/10` se oculta a los lectores y en su lugar hay una región `polite`
 * con «Poder de <héroe>: 6 de 10», que anuncia cada cambio sin leer «6 barra 10».
 *
 * Aún no está montado en ninguna pantalla del producto: no existe el inicio de
 * batalla ni un evento de Combat que lleve el Poder. Ver
 * `docs/frontend/hu-11-poder-en-batalla.md` y la vista previa `__dev/hu11/poder`.
 */
export const PowerMeter = ({ power, heroName, className }: PowerMeterProps): React.JSX.Element => {
  const display = describePower(power)

  if (!display.valid) {
    return (
      <div
        data-testid="power-meter"
        className={clsx('flex items-baseline justify-between gap-2 text-xs', className)}
      >
        <span className="text-muted">Poder</span>
        <span className="text-muted">No disponible</span>
      </div>
    )
  }

  return (
    <div data-testid="power-meter" className={clsx('flex flex-col gap-1', className)}>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-muted">Poder</span>
        <span aria-hidden="true" className="tabular-nums text-ink">
          {display.text}
        </span>
      </div>
      <div
        role="meter"
        aria-label={`Poder de ${heroName}`}
        aria-valuemin={0}
        aria-valuemax={display.max}
        aria-valuenow={display.current}
        aria-valuetext={display.spoken}
        className="h-2 w-full overflow-hidden rounded-full bg-border"
      >
        <div
          className="h-full rounded-full bg-brand motion-safe:transition-[width] motion-safe:duration-150"
          style={{ width: `${String(display.percent)}%` }}
        />
      </div>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {`Poder de ${heroName}: ${display.spoken}`}
      </span>
    </div>
  )
}
