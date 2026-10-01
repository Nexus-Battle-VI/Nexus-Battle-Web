import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FIELD_CLASS, FIELD_LABEL_CLASS } from '@/components/ui/form/fieldStyles'

import './battle-rooms.css'
import { BattlePixelIcon } from './BattlePixelIcon'
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
  const { t } = useTranslation()
  const wallet = useWallet()

  const stake = parseStakeInput(stakeInput)
  const stakeWarning =
    stake.amount === null ? null : availableWarning(stake.amount, wallet.data?.available)

  const handleSubmit = (event: React.SyntheticEvent): void => {
    event.preventDefault()

    const amount = Number(rewardInput)

    if (!Number.isFinite(amount) || amount < 0) {
      setRewardError(t('battle:create.rewardError'))
      return
    }

    if (stake.error !== null) {
      setStakeError(stake.error)
      return
    }

    setRewardError(undefined)
    setStakeError(undefined)
    // Hotfix post-despliegue: crear una sala ya NO navega automaticamente a
    // su lobby -- el creador se queda en /play. `useCreateBattleRoom` (ver
    // `hooks.ts`) ya invalida el listado publico y "mis salas" en su propio
    // `onSuccess`, asi que la sala nueva aparece sola en "Salas disponibles"
    // y el banner "Tu sala esta esperando jugadores" (`ActiveRoomBanner`,
    // sin cambios) ofrece "Volver a la sala" para quien quiera entrar. Esto
    // tambien evita asumir que el creador ya es miembro del Equipo A/B: se
    // une despues con el flujo normal, igual que cualquier invitado.
    createRoom.mutate(buildPayload(mode, capacity, amount, stake.amount))
  }

  return (
    <Card className="br-panel br-panel--corners">
      <div className="mb-4 flex items-center gap-2">
        <BattlePixelIcon icon="createJoin" size="md" />
        <div>
          <h2 className="br-section-title text-lg">{t('battle:create.title')}</h2>
          <p className="text-sm text-muted">{t('battle:create.description')}</p>
        </div>
      </div>
      <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
        <div>
          <span id="battle-room-mode-label" className={FIELD_LABEL_CLASS}>
            {t('battle:create.mode')}
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
                className="br-selectable"
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
            {t('battle:create.format')}
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
                className="br-selectable"
                onSelect={() => {
                  setCapacity(format.capacity)
                }}
              />
            ))}
          </div>
        </div>

        {mode === 'PVE' && <p className="text-xs text-muted">{t('battle:create.aiTeam')}</p>}

        <div>
          <label htmlFor="battle-room-reward" className={FIELD_LABEL_CLASS}>
            {t('battle:create.reward')}
          </label>
          <div className="relative mt-1.5">
            <BattlePixelIcon
              icon="credits"
              size="sm"
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2"
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
              className={`${FIELD_CLASS} pl-10`}
            />
          </div>
          {rewardError === undefined ? (
            <p id="battle-room-reward-hint" className="mt-1 text-xs text-muted">
              {t('battle:create.rewardHint')}
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
              {t('battle:card.stakeLabel')}
            </label>
            <div className="relative mt-1.5">
              <BattlePixelIcon
                icon="wager"
                size="sm"
                className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2"
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
                className={`${FIELD_CLASS} pl-10`}
              />
            </div>
            {stakeError === undefined ? (
              <p id="battle-room-stake-hint" className="mt-1 text-xs text-muted">
                {t('battle:create.stakeHint')}
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
            {t('battle:create.created')}
          </p>
        )}

        {/* 5a pasada (secciones 6C/94/95 del brief): en Dark recupera el
            marco PixelLab (`.br-pixellab-primary`, scopeada a
            `[data-theme='dark']`); en Light NO hace nada -- se conserva a
            proposito el boton CSS actual (excepcion consciente). */}
        <Button
          type="submit"
          variant="battle-primary"
          className="br-pixellab-primary"
          loading={createRoom.isPending}
        >
          {t('battle:create.title')}
        </Button>
      </form>
    </Card>
  )
}
