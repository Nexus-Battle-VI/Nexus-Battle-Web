import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import {
  HeroPowerPanel,
  type HeroPowerView,
  type PowerResolutionView,
} from '@/features/player-inventory/power/HeroPowerPanel'
import { Hero3D } from '@/shared/visual-library/heroes/Hero3D'
import type { HeroId } from '@/shared/visual-library/heroes/hero-ids'

interface PreviewSnapshot {
  readonly id: string
  readonly label: string
  readonly heroVisualId: HeroId
  readonly power: HeroPowerView
  readonly resolution: PowerResolutionView
}

/**
 * Snapshots contractuales, no una copia del algoritmo de HU-11. Cada botón
 * carga la salida que el módulo Node.js ya prueba para un evento concreto.
 */
const SNAPSHOTS: readonly PreviewSnapshot[] = [
  {
    id: 'initial',
    label: 'Estado inicial',
    heroVisualId: 'guerrero-tanque',
    power: { heroId: 'hero-tanque', heroName: 'Guerrero Tanque', current: 10, max: 10 },
    resolution: { kind: 'IDLE' },
  },
  {
    id: 'spent',
    label: 'Gasto válido',
    heroVisualId: 'guerrero-tanque',
    power: { heroId: 'hero-tanque', heroName: 'Guerrero Tanque', current: 6, max: 10 },
    resolution: { kind: 'SPENT', action: 'Mano de piedra', spent: 4 },
  },
  {
    id: 'insufficient',
    label: 'Saldo insuficiente',
    heroVisualId: 'guerrero-tanque',
    power: { heroId: 'hero-tanque', heroName: 'Guerrero Tanque', current: 2, max: 10 },
    resolution: {
      kind: 'INSUFFICIENT',
      action: 'Defensa feroz',
      fallbackAction: 'Ataque básico',
    },
  },
  {
    id: 'cancelled',
    label: 'Acción cancelada',
    heroVisualId: 'guerrero-tanque',
    power: { heroId: 'hero-tanque', heroName: 'Guerrero Tanque', current: 6, max: 10 },
    resolution: { kind: 'UNCHANGED', action: 'Golpe con escudo', reason: 'not_executed' },
  },
  {
    id: 'turn',
    label: 'Turno +2',
    heroVisualId: 'guerrero-tanque',
    power: { heroId: 'hero-tanque', heroName: 'Guerrero Tanque', current: 8, max: 10 },
    resolution: { kind: 'REGENERATED', amount: 2 },
  },
  {
    id: 'finished',
    label: 'Fin de combate',
    heroVisualId: 'guerrero-tanque',
    power: { heroId: 'hero-tanque', heroName: 'Guerrero Tanque', current: 10, max: 10 },
    resolution: { kind: 'RESTORED' },
  },
  {
    id: 'other-hero',
    label: 'Héroe B aislado',
    heroVisualId: 'guerrero-armas',
    power: { heroId: 'hero-armas', heroName: 'Guerrero Armas', current: 8, max: 8 },
    resolution: { kind: 'IDLE' },
  },
]

const INITIAL_SNAPSHOT = SNAPSHOTS[0]

export const HeroPowerDevPreview = (): React.JSX.Element => {
  const [selectedId, setSelectedId] = useState(INITIAL_SNAPSHOT?.id ?? '')
  const snapshot = SNAPSHOTS.find((candidate) => candidate.id === selectedId) ?? INITIAL_SNAPSHOT

  if (snapshot === undefined) {
    return <p role="alert">No hay escenarios de Poder configurados.</p>
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-6xl flex-col gap-6 p-5 sm:p-8">
      <header>
        <p className="text-xs font-semibold tracking-[0.18em] text-brand uppercase">
          HU-11 · Vista previa de desarrollo
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">
          Gestión del recurso Poder
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
          Recorre salidas contractuales del módulo Node.js. Esta vista no calcula combate ni
          sustituye al backend; solo presenta el estado actualizado del héroe.
        </p>
      </header>

      <nav aria-label="Escenarios de Poder" className="flex flex-wrap gap-2">
        {SNAPSHOTS.map((candidate) => (
          <Button
            key={candidate.id}
            variant={candidate.id === snapshot.id ? 'primary' : 'secondary'}
            aria-pressed={candidate.id === snapshot.id}
            onClick={() => {
              setSelectedId(candidate.id)
            }}
          >
            {candidate.label}
          </Button>
        ))}
      </nav>

      <div className="grid gap-5 lg:grid-cols-[minmax(15rem,0.7fr)_minmax(20rem,1.3fr)]">
        <section className="rounded-2xl border border-border bg-surface-raised p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-ink">Héroe del evento</h2>
          <Hero3D heroId={snapshot.heroVisualId} className="mx-auto mt-4 max-w-72" />
        </section>
        <HeroPowerPanel power={snapshot.power} resolution={snapshot.resolution} />
      </div>

      <aside className="rounded-lg border border-border bg-surface/70 px-4 py-3 text-xs leading-relaxed text-muted">
        Los máximos y costos son datos de demostración de las Tablas 6 y 7. Las habilidades y épicas
        reales deben llegar de Catalog; los eventos de turno y fin, del contexto de combate.
      </aside>
    </main>
  )
}
