import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { QueryState } from '@/components/ui/QueryState'
import { httpClient } from '@/lib/http'
import { useSession } from '@/shared/session'

interface EditableMission {
  readonly missionId: string
  readonly name: string
  readonly [key: string]: unknown
}

const template: EditableMission = {
  missionId: 'msn_nueva_mision',
  name: 'Nueva misión',
  category: 'STORY',
  summary: 'Resumen de la misión.',
  narrative: 'Historia de la misión.',
  imageRef: null,
  estimatedDurationMinutes: 60,
  recommendedPower: null,
  prerequisites: [],
  objectives: [
    { id: 'obj_jefe', text: 'Derrotar al jefe.', primary: true, rule: { type: 'DEFEAT_BOSS' } },
  ],
  enemies: [],
  finalBoss: {
    enemyRef: 'jefe',
    name: 'Jefe',
    heroType: null,
    description: 'Jefe de la misión.',
    stats: { health: 50, attack: 8, defense: 7, damage: 3 },
    profile: {
      maxHealth: 50,
      attack: 8,
      defense: 7,
      damage: 3,
      ai: 'BOSS',
      enrageBelowPercent: 50,
      enrageAttackBonus: 2,
    },
    drops: [{ label: 'Trofeo del jefe', probability: 1, rolls: 1, productId: null }],
  },
  encounters: [{ index: 1, kind: 'BOSS', powerStep: 0, enemies: [{ enemyRef: 'jefe', count: 1 }] }],
  combatRules: {
    turnDurationSeconds: 60,
    maxTurnsPerEncounter: 30,
    recoveryPercent: 35,
    criticalChance: 0.1,
    criticalMultiplier: 1.5,
  },
  masterEncounter: null,
  rewards: {
    guaranteed: [],
    potential: [{ label: 'Trofeo del jefe', probability: 1, rolls: 1 }],
    objectiveBonuses: [],
    firstTime: [],
  },
  highlightedRewards: [{ label: 'Trofeo del jefe' }],
  active: false,
}

const fetchContent = (signal?: AbortSignal): Promise<readonly EditableMission[]> =>
  httpClient.get('/v1/admin/missions', signal)

const saveContent = async (source: string): Promise<EditableMission> => {
  const parsed: unknown = JSON.parse(source)
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('missionId' in parsed) ||
    typeof parsed.missionId !== 'string'
  ) {
    throw new Error('El JSON debe contener missionId.')
  }
  return httpClient.request(`/v1/admin/missions/${encodeURIComponent(parsed.missionId)}`, {
    method: 'PUT',
    body: parsed,
  })
}

export const MissionContentEditorPage = (): React.JSX.Element => {
  const subject = useSession((state) => state.subject)
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const missions = useQuery({
    queryKey: ['admin', 'missions', subject],
    queryFn: ({ signal }) => fetchContent(signal),
    enabled: subject !== null,
  })
  const save = useMutation({
    mutationFn: saveContent,
    onSuccess: (mission) => {
      setSelectedId(mission.missionId)
      setDraft(JSON.stringify(mission, null, 2))
      setMessage('Misión guardada.')
      void queryClient.invalidateQueries({ queryKey: ['admin', 'missions'] })
      void queryClient.invalidateQueries({ queryKey: ['missions'] })
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'No se pudo guardar.')
    },
  })

  const select = (mission: EditableMission): void => {
    setSelectedId(mission.missionId)
    setDraft(JSON.stringify(mission, null, 2))
    setMessage(null)
  }

  return (
    <section aria-label="Editor de misiones" className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Contenido de misiones</h1>
        <p className="mt-2 text-sm text-muted">
          Edita encuentros, estadísticas, IA, jefe, Máster y botín. Guarda la misión inactiva
          mientras preparas el contenido; cambia active a true para publicarla.
        </p>
      </header>
      <QueryState isLoading={missions.isPending} error={missions.error}>
        <Card title="Misiones">
          <div className="flex flex-wrap gap-2">
            {(missions.data ?? []).map((mission) => (
              <Button
                key={mission.missionId}
                variant="secondary"
                onClick={() => {
                  select(mission)
                }}
              >
                {mission.name}
              </Button>
            ))}
            <Button
              variant="secondary"
              onClick={() => {
                select(template)
              }}
            >
              Nueva misión
            </Button>
          </div>
        </Card>
      </QueryState>
      {selectedId !== null && (
        <Card title={`Editar ${selectedId}`}>
          <label className="block text-sm text-ink" htmlFor="mission-content-json">
            Definición JSON
          </label>
          <textarea
            id="mission-content-json"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value)
              setMessage(null)
            }}
            spellCheck={false}
            className="mt-2 min-h-[34rem] w-full rounded-md border border-border bg-surface p-3 font-mono text-xs text-ink"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              disabled={save.isPending}
              onClick={() => {
                save.mutate(draft)
              }}
            >
              Guardar
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                try {
                  setDraft(JSON.stringify(JSON.parse(draft), null, 2))
                  setMessage(null)
                } catch {
                  setMessage('El JSON no tiene un formato válido.')
                }
              }}
            >
              Formatear JSON
            </Button>
          </div>
          {message !== null && (
            <p role="status" className="mt-3 text-sm text-ink">
              {message}
            </p>
          )}
        </Card>
      )}
    </section>
  )
}
