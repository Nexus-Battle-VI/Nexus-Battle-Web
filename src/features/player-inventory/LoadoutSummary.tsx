import clsx from 'clsx'

import type { EquippedProduct, HeroEquipment } from './equipment/api'
import { SLOT_META, type SlotMeta } from './equipment/slots'

export interface LoadoutSummaryProps {
  /** `undefined` mientras no hay configuración cargada: todas las ranuras vacías. */
  readonly configuration: HeroEquipment | undefined
}

const equippedInSlot = (
  configuration: HeroEquipment | undefined,
  meta: SlotMeta,
): EquippedProduct | null => {
  if (configuration === undefined) return null
  if (meta.group === 'armor') return configuration.equipment.armor[meta.id] ?? null

  const list =
    meta.group === 'weapons' ? configuration.equipment.weapons : configuration.equipment.items

  return list.find((entry) => entry.slot === meta.id) ?? null
}

/**
 * Resumen de las diez ranuras del héroe preparado (HU-07, CA-03/04/05).
 *
 * ES SOLO LECTURA. Equipar y retirar son de HU-28 y viven en su propia
 * pantalla; este resumen enseña con qué entraría el héroe a una batalla. Hacer
 * clicables estas casillas duplicaría la interacción de HU-28 en un segundo
 * sitio, que es lo que la TASK HU-07.3 pide evitar expresamente.
 *
 * LAS RANURAS SALEN DE `SLOT_META`, la misma fuente que usa la pantalla de
 * equipamiento: 2 armas, 6 piezas de armadura y 2 ítems. Escribir aquí una
 * segunda lista daría dos verdades sobre la configuración conceptual.
 */
export const LoadoutSummary = ({ configuration }: LoadoutSummaryProps): React.JSX.Element => (
  <ul aria-label="Resumen del equipamiento" className="flex flex-wrap gap-2">
    {SLOT_META.map((meta) => {
      const equipped = equippedInSlot(configuration, meta)

      return (
        <li
          key={meta.id}
          className={clsx(
            'flex w-24 flex-col items-center justify-center gap-0.5 rounded-lg border p-2.5 text-center',
            equipped === null
              ? 'border-dashed border-border bg-surface'
              : 'border-brand bg-surface',
          )}
        >
          <span className="text-[11px] font-semibold text-ink">{meta.label}</span>
          <span
            className="w-full truncate text-[10px] text-muted"
            title={equipped?.name ?? undefined}
          >
            {equipped === null ? 'Vacío' : equipped.name}
          </span>
        </li>
      )
    })}
  </ul>
)
