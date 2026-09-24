import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'

import { Button } from '@/components/ui/Button'
import { useCallAt } from '@/shared/countdown'

import { useActiveMissions } from './useActiveMissions'

interface FinishedMission {
  readonly enrollmentId: string
  readonly missionName: string
}

/**
 * Aviso de misión terminada (diseño «misiones jugables», P-J6): vive en el marco de
 * la aplicación, así que el jugador se entera esté donde esté. Una misión que deja
 * de estar en curso terminó: el aviso lleva a su reporte. Al abrir la aplicación no
 * se avisa de lo que ya había terminado; eso está en el historial.
 */
export const MissionFinishedNotice = (): React.JSX.Element | null => {
  const active = useActiveMissions()
  const queryClient = useQueryClient()
  const known = useRef<ReadonlyMap<string, string> | null>(null)
  const [finished, setFinished] = useState<readonly FinishedMission[]>([])

  useEffect(() => {
    const items = active.data?.items
    if (items === undefined) return
    const current = new Map(items.map((item) => [item.enrollmentId, item.missionName]))
    const previous = known.current
    known.current = current
    if (previous === null) return
    const ended = [...previous]
      .filter(([enrollmentId]) => !current.has(enrollmentId))
      .map(([enrollmentId, missionName]) => ({ enrollmentId, missionName }))
    if (ended.length === 0) return
    setFinished((list) => [...list, ...ended])
    void queryClient.invalidateQueries({ queryKey: ['missions', 'board'] })
    void queryClient.invalidateQueries({ queryKey: ['missions', 'history'] })
    void queryClient.invalidateQueries({ queryKey: ['missions', 'history-summary'] })
  }, [active.data, queryClient])

  // Missions ordena por fin: se vuelve a preguntar cuando debería terminar la primera.
  const { refetch } = active
  const refresh = useCallback(() => {
    void refetch()
  }, [refetch])
  useCallAt(active.data?.items[0]?.endsAt ?? null, refresh)

  const dismiss = (enrollmentId: string): void => {
    setFinished((list) => list.filter((item) => item.enrollmentId !== enrollmentId))
  }

  if (finished.length === 0) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-4 z-50 flex flex-col gap-2 sm:left-auto sm:w-96"
    >
      {finished.map((mission) => (
        <div
          key={mission.enrollmentId}
          className="flex flex-col gap-2 rounded-lg border border-brand/60 bg-surface-raised p-4 text-sm shadow-lg"
        >
          <p className="font-semibold text-ink">«{mission.missionName}» terminó.</p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to={`/missions/reports/${encodeURIComponent(mission.enrollmentId)}`}
              onClick={() => {
                dismiss(mission.enrollmentId)
              }}
              className="font-medium text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand"
            >
              Ver el reporte
            </Link>
            <Button
              variant="secondary"
              onClick={() => {
                dismiss(mission.enrollmentId)
              }}
            >
              Cerrar
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
