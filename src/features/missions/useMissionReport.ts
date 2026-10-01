import { useQuery, type UseQueryResult } from '@tanstack/react-query'

import { queryKeys } from '@/shared/query-keys'
import { useSession } from '@/shared/session'

import { fetchMissionReport, type MissionReport } from './api'
import { missionReportNeedsPolling } from './missionReport'

const POLL_MS = 1_500

/**
 * Informe de una misión terminada (HU-74) con su experiencia (HU-09, Task
 * HU-09.5) y su liquidación de finalización (HU-10, Task HU-10.5), para el
 * jugador autenticado.
 *
 * SONDA CORTA MIENTRAS ALGO PUEDA CAMBIAR. El informe nace con el cierre, pero
 * la experiencia de cada derrota (HU-09) y las entregas de finalización (HU-10:
 * XP, créditos, productos) se resuelven DESPUÉS, cada una por su lado; las
 * primeras lecturas pueden ver líneas `PENDING` de cualquiera de las dos. Igual
 * que el panel de recompensa de batalla (HU-22), esto se recupera sin depender
 * de ningún evento en tiempo real.
 *
 * SE DETIENE SOLO CUANDO NADA MÁS PUEDE CAMBIAR: sin experiencia de HU-09 por
 * resolver Y sin ninguna línea HU-10 en `PENDING` (`missionReportNeedsPolling`,
 * la única fuente de esta decisión). `CREDITED` y `FAILED` son terminales en
 * ambas historias: una línea `FAILED` no se vuelve a sondear.
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

      return missionReportNeedsPolling(data) ? POLL_MS : false
    },
  })
}
