import { useState } from 'react'

import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FIELD_CLASS, FIELD_LABEL_CLASS } from '@/components/ui/form/fieldStyles'
import { Coins } from '@/components/ui/icons'

import { SelectableCard } from './SelectableCard'
import { useCreateBattleRoom } from './hooks'
import {
  MODE_DESCRIPTIONS,
  MODE_LABELS,
  TEAM_FORMATS,
  describeBattleRoomFailure,
} from './presentation'
import type { BattleRoomMode, CreateBattleRoomInput, CreateTeamConfigInput } from './types'

const MODE_OPTIONS = Object.keys(MODE_LABELS) as BattleRoomMode[]

/**
 * Equipo contrario para una sala `PVE`: se declara IA para satisfacer la
 * regla de composicion real de Combat ("una sala PVE sin ningun AI en
 * initialParticipants es invalida"). No hay logica de bots aqui — solo el
 * participante minimo que el contrato exige.
 */
const aiOpponentTeam = (capacity: number): CreateTeamConfigInput => ({
  capacity,
  initialParticipants: Array.from({ length: capacity }, () => ({ kind: 'AI' as const })),
})

const buildPayload = (mode: BattleRoomMode, capacity: number, amount: number): CreateBattleRoomInput => ({
  mode,
  teamConfigs:
    mode === 'PVE'
      ? [{ capacity }, aiOpponentTeam(capacity)]
      : [{ capacity }, { capacity }],
  reward: { amount },
})

/**
 * Panel izquierdo: formulario de creacion de sala. El creador NO se agrega
 * automaticamente como participante (la auditoria HU-14.4 lo advierte
 * explicitamente: no hay evidencia de esa regla en Combat) — esta pantalla
 * crea la sala vacia (o con el equipo de IA en `PVE`) y "unirse" queda para
 * HU-15.
 *
 * Modalidad y formato se presentan como tarjetas seleccionables (no `select`):
 * solo hay dos/tres alternativas y el producto pidio que ambas fueran visibles
 * a la vez. El VALOR que viaja al backend sigue siendo exactamente el que
 * exige el contrato (`'PVP'`/`'PVE'`, `capacity: number`) — el cambio es
 * puramente de presentacion.
 */
export const CreateBattleRoomPanel = (): React.JSX.Element => {
  const [mode, setMode] = useState<BattleRoomMode>('PVP')
  const [capacity, setCapacity] = useState(1)
  const [rewardInput, setRewardInput] = useState('0')
  const [rewardError, setRewardError] = useState<string | undefined>(undefined)

  const createRoom = useCreateBattleRoom()

  const handleSubmit = (event: React.SyntheticEvent): void => {
    event.preventDefault()

    const amount = Number(rewardInput)

    if (!Number.isFinite(amount) || amount < 0) {
      setRewardError('La recompensa debe ser un número mayor o igual a 0.')
      return
    }

    setRewardError(undefined)
    createRoom.mutate(buildPayload(mode, capacity, amount))
  }

  return (
    <Card
      title="Crear sala de batalla"
      description="La sala queda esperando jugadores hasta que se llene o se cancele."
    >
      <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
        <div>
          <span id="battle-room-mode-label" className={FIELD_LABEL_CLASS}>
            Modalidad
          </span>
          <div
            role="radiogroup"
            aria-labelledby="battle-room-mode-label"
            className="mt-1.5 flex flex-col gap-2 sm:flex-row"
          >
            {MODE_OPTIONS.map((option) => (
              <SelectableCard
                key={option}
                selected={mode === option}
                title={MODE_LABELS[option]}
                description={MODE_DESCRIPTIONS[option]}
                onSelect={() => {
                  setMode(option)
                }}
              />
            ))}
          </div>
        </div>

        <div>
          <span id="battle-room-format-label" className={FIELD_LABEL_CLASS}>
            Formato
          </span>
          <div
            role="radiogroup"
            aria-labelledby="battle-room-format-label"
            className="mt-1.5 flex gap-2"
          >
            {TEAM_FORMATS.map((format) => (
              <SelectableCard
                key={format.capacity}
                selected={capacity === format.capacity}
                title={format.label}
                onSelect={() => {
                  setCapacity(format.capacity)
                }}
              />
            ))}
          </div>
        </div>

        {mode === 'PVE' && (
          <p className="text-xs text-muted">El equipo contrario será controlado por la IA.</p>
        )}

        <div>
          <label htmlFor="battle-room-reward" className={FIELD_LABEL_CLASS}>
            Recompensa de la sala
          </label>
          <div className="relative mt-1.5">
            <Coins
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            />
            <input
              id="battle-room-reward"
              type="number"
              min={0}
              step="1"
              inputMode="numeric"
              value={rewardInput}
              aria-invalid={rewardError !== undefined}
              aria-describedby={rewardError === undefined ? 'battle-room-reward-hint' : 'battle-room-reward-error'}
              onChange={(event) => {
                setRewardInput(event.target.value)
              }}
              className={`${FIELD_CLASS} pl-9`}
            />
          </div>
          {rewardError === undefined ? (
            <p id="battle-room-reward-hint" className="mt-1 text-xs text-muted">
              Monto que se otorga al ganar la batalla.
            </p>
          ) : (
            <p id="battle-room-reward-error" role="alert" className="mt-1 text-xs text-danger">
              {rewardError}
            </p>
          )}
        </div>

        {createRoom.isError && (
          <p role="alert" className="text-sm text-danger">
            {describeBattleRoomFailure(createRoom.error)}
          </p>
        )}

        {createRoom.isSuccess && (
          <p role="status" className="text-sm text-success">
            Sala creada. Ya aparece en el listado de salas disponibles.
          </p>
        )}

        <Button type="submit" loading={createRoom.isPending}>
          Crear sala de batalla
        </Button>
      </form>
    </Card>
  )
}
