import { QueryState } from '@/components/ui/QueryState'
import { useSession } from '@/shared/session'

import type { DifficultyLevel } from './api'
import { DifficultySelector } from './DifficultySelector'
import { useMissionDifficulties } from './useMissionDifficulties'
import { useTranslation } from 'react-i18next'

export interface MissionDifficultyPickerProps {
  readonly missionId: string
  readonly value: DifficultyLevel | null
  readonly onChange: (level: DifficultyLevel) => void
}

/**
 * Selector de dificultad conectado a Missions (Task HU-75.3), con los cuatro
 * estados de toda consulta: cargando, error, vacio y contenido.
 *
 * Se monta en el detalle y la matricula de una mision (HU-70.3): quien lo monta
 * guarda el nivel elegido y lo envia como `difficulty` al matricular. Si Missions
 * rechaza con `422 PROGRESSION_LOCKED`, el `message` del error ya es el texto
 * que debe verse: `HttpError` lo toma del cuerpo de la respuesta.
 */
export const MissionDifficultyPicker = ({
  missionId,
  value,
  onChange,
}: MissionDifficultyPickerProps): React.JSX.Element => {
  const { t } = useTranslation()
  const subject = useSession((state) => state.subject)
  const query = useMissionDifficulties(missionId)

  if (subject === null) {
    return (
      <p className="text-sm text-muted">
        {t('missions:picker.loginToChoose')}
      </p>
    )
  }

  const items = query.data?.items ?? []

  return (
    <QueryState
      isLoading={query.isLoading}
      error={query.error}
      isEmpty={items.length === 0}
      emptyMessage={t('missions:picker.noLevels')}
    >
      <DifficultySelector items={items} value={value} onChange={onChange} />
    </QueryState>
  )
}
