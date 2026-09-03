import { useState } from 'react'

import type { AvailableHero, HeroEquipment, HeroSelection } from '../heroSelectionApi'
import { HeroSelectionView } from '../HeroSelectionView'

/**
 * Vista previa de desarrollo de «Selecciona tu héroe» (HU-07).
 *
 * NO ES UNA PANTALLA DEL PRODUCTO. Existe para revisar el diseño y los tres
 * estados del prototipo sin sesión ni servicios: el entorno local no puede
 * establecer una sesión real, y sin esto la única forma de mirar la pantalla
 * sería desplegarla.
 *
 * MONTA EL COMPONENTE DE PRODUCCIÓN, no una copia. Si `HeroSelectionView`
 * cambia, esta vista previa cambia con él; una maqueta paralela se habría
 * desviado a la primera corrección y habría dejado de demostrar nada.
 *
 * Solo se alcanza con `import.meta.env.DEV` (ver `src/routes/dev-routes.tsx`).
 */
const heroe = (
  reference: string,
  subtype: string,
  name: string,
  stats: { power: number; health: number; defense: number },
  patch: Partial<AvailableHero> = {},
): AvailableHero => ({
  heroId: `pid-${reference}`,
  reference,
  subtype,
  name,
  imageUrl: '',
  lifecycleStatus: 'ACTIVE',
  baseStats: { ...stats, attack: null, damage: null, healing: null },
  abilities: [],
  selected: false,
  ...patch,
})

const HEROES: readonly AvailableHero[] = [
  heroe(
    'guerrero-tanque',
    'GUERRERO_TANQUE',
    'Guerrero Tanque',
    { power: 1, health: 44, defense: 11 },
    {
      baseStats: {
        power: 1,
        health: 44,
        defense: 11,
        attack: 10,
        damage: { mode: 'DICE', count: 1, sides: 4 },
        healing: null,
      },
      abilities: [{ reference: 'hab-golpe-escudo', name: 'Golpe con escudo' }],
      selected: true,
    },
  ),
  heroe('guerrero-armas', 'GUERRERO_ARMAS', 'Guerrero Armas', {
    power: 1,
    health: 36,
    defense: 8,
  }),
  heroe('mago-fuego', 'MAGO_FUEGO', 'Mago Fuego', { power: 1, health: 30, defense: 6 }),
  heroe('mago-hielo', 'MAGO_HIELO', 'Mago Hielo', { power: 1, health: 30, defense: 6 }),
  heroe('picaro-veneno', 'PICARO_VENENO', 'Pícaro Veneno', { power: 1, health: 32, defense: 7 }),
  heroe('picaro-machete', 'PICARO_MACHETE', 'Pícaro Machete', { power: 1, health: 32, defense: 7 }),
  heroe('chaman', 'CHAMAN', 'Chamán', { power: 1, health: 28, defense: 6 }),
  heroe('medico', 'MEDICO', 'Médico', { power: 1, health: 28, defense: 6 }),
]

const configuracionDe = (hero: AvailableHero): HeroEquipment => ({
  hero: {
    heroId: hero.heroId,
    reference: hero.reference,
    subtype: hero.subtype,
    name: hero.name,
    imageUrl: hero.imageUrl,
  },
  equipment: {
    weapons: [],
    armor: { HELMET: null, CHEST: null, GLOVES: null, BRACERS: null, PANTS: null, SHOES: null },
    items: [],
  },
  baseStats: hero.baseStats,
  effectiveStats: hero.baseStats,
  deltas: [],
  activeEffects: [],
})

const seleccionDe = (hero: AvailableHero): HeroSelection => ({
  selectedAt: '2026-09-03T10:00:00.000Z',
  configuration: configuracionDe(hero),
  readiness: { ready: true, blockers: [] },
  capacity: {
    weapons: { used: 0, max: 2 },
    armor: { used: 0, max: 6 },
    items: { used: 0, max: 2 },
  },
})

/** El primero del catálogo de ejemplo. Nunca está vacío, pero no se afirma con `!`. */
const PRIMERO: AvailableHero = heroe('guerrero-tanque', 'GUERRERO_TANQUE', 'Guerrero Tanque', {
  power: 1,
  health: 44,
  defense: 11,
})

export const HeroSelectionDevPreview = (): React.JSX.Element => {
  const [reference, setReference] = useState('guerrero-tanque')
  const activo = HEROES.find((hero) => hero.reference === reference) ?? PRIMERO

  return (
    <HeroSelectionView
      heroes={HEROES}
      selection={seleccionDe(activo)}
      isLoading={false}
      loadError={null}
      loaded
      activeReference={activo.reference}
      pending={false}
      selectError={null}
      onChoose={(hero) => {
        setReference(hero.reference)
      }}
    />
  )
}
