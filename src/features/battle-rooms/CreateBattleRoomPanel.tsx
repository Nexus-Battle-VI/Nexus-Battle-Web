import { useState } from 'react'
import { useNavigate } from 'react-router'

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
import { useWallet } from './battle/useWallet'
import { availableWarning, parseStakeInput } from './battle/stakePresentation'
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

/**
 * Body real de `POST /rooms`. HU-23: cuando el creador apuesta, se declara a si
 * mismo como participante `HUMAN` (el unico declarable al crear) con su monto:
 * la apuesta necesita un participante que la sostenga, y Combat la reserva de
 * forma sincrona antes de crear la sala. Sin apuesta el cuerpo es EXACTAMENTE
 * el de antes de HU-23 (la sala nace vacia y el creador se une despues).
 */
const buildPayload = (
  mode: BattleRoomMode,
  capacity: number,
  amount: number,
  stakeAmount: number | null,
): CreateBattleRoomInput => ({
  mode,
  teamConfigs:
    mode === 'PVE'
      ? [{ capacity }, aiOpponentTeam(capacity)]
      : [
          {
            capacity,
            ...(stakeAmount === null
              ? {}
              : {
                  initialParticipants: [{ kind: 'HUMAN' as const, stake: { amount: stakeAmount } }],
                }),
          },
          { capacity },
        ],
  reward: { amount },
})

/**
 * Panel izquierdo: formulario de creacion de sala. El creador NO se agrega
 * automaticamente como participante (la auditoria HU-14.4 lo advierte
 * explicitamente: no hay evidencia de esa regla en Combat) — esta pantalla
 * crea la sala vacia (o con el equipo de IA en `PVE`) y "unirse" queda para
 * HU-15. Unica excepcion (HU-23): si el creador apuesta, SI se declara como
 * participante con su monto, porque la reserva necesita un participante que la
 * sostenga.
 *
 * Modalidad y formato se presentan como tarjetas seleccionables (no `select`):
 * solo hay dos/tres alternativas y el producto pidio que ambas fueran visibles
 * a la vez. El VALOR que viaja al backend sigue siendo exactamente el que
 * exige el contrato (`'PVP'`/`'PVE'`, `capacity: number`) — el cambio es
 * puramente de presentacion.
 *
 * HU-23: "Apostar créditos (opcional)" es un campo NUEVO, separado de
 * "Recompensa de la sala" (D7: `reward.amount` no se toca). Solo aparece en
 * JcJ: las salas JcE no admiten apuesta (D4). El tope real es el saldo
 * DISPONIBLE que publica Wallet; si no alcanza se avisa, pero quien decide
 * sigue siendo el backend.
 */
export const CreateBattleRoomPanel = (): React.JSX.Element => {
  const [mode, setMode] = useState<BattleRoomMode>('PVP')
  const [capacity, setCapacity] = useState(1)
  const [rewardInput, setRewardInput] = useState('0')
  const [rewardError, setRewardError] = useState<string | undefined>(undefined)
  const [stakeInput, setStakeInput] = useState('0')
  const [stakeError, setStakeError] = useState<string | undefined>(undefined)

  const createRoom = useCreateBattleRoom()
  const navigate = useNavigate()
  const wallet = useWallet()

  const stake = parseStakeInput(stakeInput)
  const stakeWarning =
    stake.amount === null ? null : availableWarning(stake.amount, wallet.data?.available)

  const handleSubmit = (event: React.SyntheticEvent): void => {
    event.preventDefault()

    const amount = Number(rewardInput)

    if (!Number.isFinite(amount) || amount < 0) {
      setRewardError('La recompensa debe ser un número mayor o igual a 0.')
      return
    }

    if (stake.error !== null) {
      setStakeError(stake.error)
      return
    }

    setRewardError(undefined)
    setStakeError(undefined)
    // Igual que al unirse: tras crear, directo al lobby de la sala nueva.
    createRoom.mutate(buildPayload(mode, capacity, amount, stake.amount), {
      onSuccess: (room) => {
        void navigate(`/play/rooms/${room.id}`)
      },
    })
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
                  // HU-23 (D4): la apuesta no existe en JcE; al volver a JcJ el
                  // campo reaparece con lo ultimo escrito (no se pierde).
                  if (option === 'PVE') {
                    setStakeError(undefined)
                  }
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
              aria-describedby={
                rewardError === undefined ? 'battle-room-reward-hint' : 'battle-room-reward-error'
              }
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

        {mode === 'PVP' && (
          <div>
            <label htmlFor="battle-room-stake" className={FIELD_LABEL_CLASS}>
              Apostar créditos (opcional)
            </label>
            <div className="relative mt-1.5">
              <Coins
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              />
              <input
                id="battle-room-stake"
                type="number"
                min={0}
                step="1"
                inputMode="numeric"
                value={stakeInput}
                aria-invalid={stakeError !== undefined}
                aria-describedby={
                  stakeError === undefined ? 'battle-room-stake-hint' : 'battle-room-stake-error'
                }
                onChange={(event) => {
                  setStakeInput(event.target.value)
                }}
                className={`${FIELD_CLASS} pl-9`}
              />
            </div>
            {stakeError === undefined ? (
              <p id="battle-room-stake-hint" className="mt-1 text-xs text-muted">
                Se reserva de tu saldo disponible y se liquida al terminar la batalla. 0 = no
                apostar.
              </p>
            ) : (
              <p id="battle-room-stake-error" role="alert" className="mt-1 text-xs text-danger">
                {stakeError}
              </p>
            )}
            {stakeWarning !== null && (
              <p role="status" className="mt-1 text-xs text-warning">
                {stakeWarning}
              </p>
            )}
          </div>
        )}

        {createRoom.isError && (
          <p role="alert" className="text-sm text-danger">
            {describeBattleRoomFailure(createRoom.error)}
          </p>
        )}

        {createRoom.isSuccess && (
          <p role="status" className="text-sm text-success">
            Sala creada. Entrando al lobby…
          </p>
        )}

        <Button type="submit" loading={createRoom.isPending}>
          Crear sala de batalla
        </Button>
      </form>
    </Card>
  )
}
