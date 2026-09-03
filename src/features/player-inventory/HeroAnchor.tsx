import { useId, useState } from 'react'

import {
  Hero3D,
  HERO_IDS,
  HERO_VISUAL_SPECS_BY_ID,
  type HeroId,
} from '@/shared/visual-library/heroes'

/** Ranuras de equipamiento de la línea base (solo estructura visual). */
const EQUIP_SLOTS = [
  'Casco',
  'Pecho',
  'Guantes',
  'Brazaletes',
  'Pantalón',
  'Zapatos',
  'Arma',
  'Ítem',
]

/**
 * Ancla visual del personaje para "Mi Inventario".
 *
 * HU-27 es de CONSULTA: no vincula objetos a un héroe ni equipa nada. El
 * selector deja elegir qué héroe se muestra como referencia visual mientras se
 * revisan los objetos, reutilizando la biblioteca visual 3D existente
 * (EN-026.3). Las ranuras de equipamiento se dibujan vacías y deshabilitadas:
 * son la estructura que HU-28 rellenará, sin comportamiento aquí.
 */
export const HeroAnchor = (): React.JSX.Element => {
  const selectId = useId()
  const [heroId, setHeroId] = useState<HeroId>(HERO_IDS[0])

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-raised p-4">
      <label htmlFor={selectId} className="text-xs text-muted">
        Personaje de referencia
      </label>
      <select
        id={selectId}
        value={heroId}
        onChange={(event) => {
          setHeroId(event.target.value as HeroId)
        }}
        className="rounded border border-border bg-surface px-2 py-1.5 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {HERO_IDS.map((id) => (
          <option key={id} value={id}>
            {HERO_VISUAL_SPECS_BY_ID.get(id)?.displayName ?? id}
          </option>
        ))}
      </select>

      <Hero3D heroId={heroId} className="mx-auto w-full max-w-44" />

      <div>
        <p className="text-xs text-muted">Equipamiento</p>
        <ul className="mt-1 grid grid-cols-4 gap-1" aria-label="Ranuras de equipamiento (HU-28)">
          {EQUIP_SLOTS.map((slot) => (
            <li
              key={slot}
              aria-disabled="true"
              title="Se habilitará en HU-28"
              className="flex aspect-square items-center justify-center rounded border border-dashed border-border p-1 text-center text-[10px] leading-tight text-muted"
            >
              {slot}
            </li>
          ))}
        </ul>
        <p className="mt-1 text-[11px] text-muted">Equipar y desequipar se implementan en HU-28.</p>
      </div>
    </div>
  )
}
