import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

import type { DifficultyLevel, MissionDifficulty } from '../api'
import { DifficultySelector } from '../DifficultySelector'

/**
 * Vista previa de desarrollo del selector de dificultad (HU-75.3).
 *
 * NO ES UNA PANTALLA DEL PRODUCTO. El selector se usa en el detalle y la
 * matrícula de HU-70.3; esta vista aislada permite revisar sus estados y la
 * elección sin iniciar sesión ni consultar Missions.
 *
 * MONTA EL COMPONENTE DE PRODUCCIÓN, no una copia: si `DifficultySelector`
 * cambia, esta vista cambia con él.
 *
 * LOS DATOS SON LOS FIXTURES DEL CONTRATO hu-75-mission-difficulty-v1, no el
 * resultado de aplicar una regla: la interfaz no calcula el desbloqueo, lo
 * muestra tal como lo responde Missions.
 *
 * Solo se alcanza con `import.meta.env.DEV` (ver `src/routes/dev-routes.tsx`).
 */
interface Escenario {
  readonly titulo: string
  readonly descripcion: string
  readonly items: readonly MissionDifficulty[]
}

const SIN_PROGRESO: readonly MissionDifficulty[] = [
  {
    difficulty: 'NORMAL',
    unlocked: true,
    lockReason: null,
    enemyStatMultiplier: 1,
    rewardTier: 'STANDARD',
  },
  {
    difficulty: 'HEROIC',
    unlocked: false,
    lockReason: 'Debes completar esta misión en Normal al menos una vez.',
    enemyStatMultiplier: 1.5,
    rewardTier: 'IMPROVED',
  },
  {
    difficulty: 'LEGENDARY',
    unlocked: false,
    lockReason: 'Debes completar esta misión en Heroico al menos una vez.',
    enemyStatMultiplier: 2,
    rewardTier: 'PREMIUM',
  },
  {
    difficulty: 'MYTHIC',
    unlocked: false,
    lockReason: 'Debes completar esta misión en Legendario al menos una vez.',
    enemyStatMultiplier: null,
    rewardTier: 'EXCLUSIVE',
  },
]

const NORMAL_COMPLETADA: readonly MissionDifficulty[] = SIN_PROGRESO.map((item) =>
  item.difficulty === 'HEROIC' ? { ...item, unlocked: true, lockReason: null } : item,
)

const ESCENARIOS: readonly Escenario[] = [
  {
    titulo: 'Sin progreso',
    descripcion: 'El jugador nunca completó la misión.',
    items: SIN_PROGRESO,
  },
  {
    titulo: 'Normal completada',
    descripcion: 'El jugador completó la misión en Normal al menos una vez.',
    items: NORMAL_COMPLETADA,
  },
]

export const DifficultySelectorDevPreview = (): React.JSX.Element => {
  const [indice, setIndice] = useState(0)
  const [elegido, setElegido] = useState<DifficultyLevel | null>(null)
  const escenario = ESCENARIOS[indice] ?? ESCENARIOS[0]

  if (escenario === undefined) {
    throw new Error('la vista previa necesita al menos un escenario')
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-ink">
          Vista previa del selector de dificultad (HU-75)
        </h1>
        <p className="mt-1 text-sm text-muted">
          Vista aislada para revisar el selector usado en el detalle de misión.
        </p>
      </header>

      <Card
        title={`Escenario: ${escenario.titulo}`}
        description={`${escenario.descripcion} Datos del contrato; la interfaz real muestra lo que responda Missions.`}
      >
        <DifficultySelector items={escenario.items} value={elegido} onChange={setElegido} />
        <p className="mt-4 text-sm text-ink" aria-live="polite" data-testid="elegido">
          {`Nivel elegido: ${elegido ?? 'ninguno'}`}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {ESCENARIOS.map((opcion, i) => (
            <Button
              key={opcion.titulo}
              variant={i === indice ? 'primary' : 'secondary'}
              aria-pressed={i === indice}
              onClick={() => {
                setIndice(i)
                setElegido(null)
              }}
            >
              {opcion.titulo}
            </Button>
          ))}
        </div>
      </Card>
    </main>
  )
}
