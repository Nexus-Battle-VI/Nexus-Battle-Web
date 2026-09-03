import { formatMagnitude } from './equipment/magnitude'
import type { AvailableHero } from './heroSelectionApi'

export interface HeroInfoPanelProps {
  readonly hero: AvailableHero | null
}

/** Valor que el contrato canónico no publica. Se dice, no se inventa. */
const PENDIENTE = 'PENDIENTE'

/**
 * Ficha del héroe elegido: estadísticas base y habilidades (HU-07, CA-01).
 *
 * LAS ESTADÍSTICAS SON LAS **BASE**, y el rótulo lo dice. Las efectivas —las
 * que ya incorporan el equipamiento— las calcula HU-28 y viven en la pantalla
 * de equipar; enseñarlas aquí como si fueran las mismas confundiría dos números
 * distintos.
 *
 * LO QUE EL CATÁLOGO NO PUBLICA SE MARCA `PENDIENTE`. El nivel no forma parte
 * del contrato canónico del héroe, y el ataque, el daño y la sanación son
 * opcionales. Escribir un «1» de relleno donde el dominio no dice nada sería
 * mostrar una estadística que nadie calculó, que es justo el riesgo que la
 * TASK HU-07.3 enumera. El prototipo usa esa misma palabra para los huecos.
 *
 * EL DAÑO NO SE COLAPSA A UN NÚMERO: un dado sigue siendo «1d4». HU-07 no
 * ejecuta combate.
 */
export const HeroInfoPanel = ({ hero }: HeroInfoPanelProps): React.JSX.Element => {
  if (hero === null) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted">Sin héroe elegido todavía.</p>
      </div>
    )
  }

  const stats: readonly { readonly label: string; readonly value: string }[] = [
    { label: 'Nivel', value: PENDIENTE },
    { label: 'Poder', value: String(hero.baseStats.power) },
    { label: 'Vida', value: String(hero.baseStats.health) },
    { label: 'Defensa', value: String(hero.baseStats.defense) },
    {
      label: 'Ataque',
      value: hero.baseStats.attack === null ? PENDIENTE : String(hero.baseStats.attack),
    },
    {
      label: 'Daño',
      value: hero.baseStats.damage === null ? PENDIENTE : formatMagnitude(hero.baseStats.damage),
    },
  ]

  const named = hero.abilities.filter((ability) => ability.name !== null)

  return (
    <div className="flex flex-col gap-5 p-6">
      <section>
        <h2 className="text-sm font-semibold text-ink">Estadísticas base</h2>
        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-3">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt className="text-[11px] font-medium text-muted">{stat.label}</dt>
              <dd className="text-xs font-semibold text-ink tabular-nums">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <hr className="border-border" />

      <section>
        <h2 className="text-sm font-semibold text-ink">Habilidades</h2>
        {named.length === 0 ? (
          <p className="mt-2 text-[13px] text-muted">
            {PENDIENTE} — este héroe no declara habilidades documentadas en el catálogo vigente.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1 text-[13px] text-muted">
            {named.map((ability) => (
              <li key={ability.reference}>{ability.name}</li>
            ))}
          </ul>
        )}
      </section>

      <p className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-ink">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-brand" />
        Catálogo inicial · extensible por administración
      </p>
    </div>
  )
}
