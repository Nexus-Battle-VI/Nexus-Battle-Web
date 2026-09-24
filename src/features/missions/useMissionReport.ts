import { useQuery, type UseQueryResult } from '@tanstack/react-query'

import { queryKeys } from '@/shared/query-keys'
import { useSession } from '@/shared/session'

import { fetchMissionReport, type MissionReport } from './api'
import { readExperience } from './missionReport'

const POLL_MS = 1_500

/**
 * Informe de una misión terminada (HU-74) con su experiencia (HU-09, Task
 * HU-09.5), para el jugador autenticado.
 *
 * SONDA CORTA MIENTRAS QUEDA EXPERIENCIA POR RESOLVER. El informe nace con el
 * cierre, pero la experiencia de cada derrota se acredita DESPUÉS: primero se pide
 * la tirada a Combat y luego se acredita en Player/Inventory, así que las primeras
 * lecturas ven líneas `PENDING`. Igual que el panel de recompensa de batalla
 * (HU-22), esto se recupera sin depender de ningún evento en tiempo real.
 *
 * SE DETIENE SOLO CUANDO NADA MÁS PUEDE CAMBIAR: sin derrotas por resolver
 * (`pending` en cero, ya acreditadas o fallidas -- las dos son terminales) o sin
 * bloque de experiencia (un servicio anterior a HU-09.5), no hay motivo para seguir
 * preguntando.
 */
export const useMissionReport = (enrollmentId: string | null): UseQueryResult<MissionReport> => {
  const subject = useSession((state) => state.subject)

  return useQuery({
    queryKey: queryKeys.missions.report(subject, enrollmentId ?? ''),
    queryFn: ({ signal }) => fetchMissionReport(enrollmentId ?? '', signal),
    enabled: enrollmentId !== null,
    refetchInterval: (query) => {
      const data = query.state.data

      if (data === undefined) {
        return POLL_MS
      }

      const experience = readExperience(data)
      const settled = experience === null || experience.pending === 0

      return settled ? false : POLL_MS
    },
  })
}
