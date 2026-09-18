import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Coins } from '@/components/ui/icons'

import { modeLabel, occupancyOf } from './presentation'
import type { BattleRoom } from './types'

export interface BattleRoomCardProps {
  readonly room: BattleRoom
  /** `true` si la sesion actual es quien creo esta sala. Solo controla si se ve el boton: la autoridad real es el backend. */
  readonly isOwn: boolean
  readonly onCancel: (roomId: string) => void
  readonly cancelling: boolean
}

/**
 * Fila del listado de salas disponibles. Muestra unicamente datos reales de
 * `BattleRoomResponse` (modalidad, estado, cupos, recompensa) — sin nombre de
 * sala, mapa, region ni jugadores conectados, porque Combat no devuelve nada
 * de eso.
 *
 * `room.id` (UUID tecnico) NO se muestra al jugador de NINGUNA forma visual
 * (HU-14.4, refinamiento final): ni como texto, ni como `title`/tooltip
 * nativo del navegador -un `title` seria igualmente visible al pasar el
 * mouse, asi que tampoco es aceptable-. Sigue usandose intacto, sin
 * transformar, para todo lo tecnico: la key de React, la cancelacion y la
 * busqueda por ID del panel (exigida por el enunciado de HU-14.4). El unico
 * lugar donde el id sobrevive en el DOM es `data-testid`: un atributo que
 * ninguna persona ve ni al inspeccionar visualmente la pantalla, presente
 * solo para que las pruebas puedan localizar una tarjeta concreta sin
 * depender de texto que si es visible (modalidad/estado/recompensa pueden
 * repetirse entre salas distintas).
 */
export const BattleRoomCard = ({
  room,
  isOwn,
  onCancel,
  cancelling,
}: BattleRoomCardProps): React.JSX.Element => {
  const { filled, total } = occupancyOf(room)

  return (
    <li
      data-testid={`battle-room-${room.id}`}
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 transition-colors motion-safe:duration-150 hover:border-brand/40 hover:bg-surface-raised sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={room.status} />
          <span className="text-sm font-medium text-ink">{modeLabel(room.mode)}</span>
        </div>
        <p className="flex items-center gap-1.5 text-sm text-muted">
          <span>{filled}/{total} jugadores</span>
          <span aria-hidden="true">·</span>
          <Coins aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-brand" />
          <span>{room.reward.amount.toLocaleString('es-CO')}</span>
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {isOwn && (
          <Button
            variant="danger"
            loading={cancelling}
            onClick={() => {
              onCancel(room.id)
            }}
          >
            Cancelar
          </Button>
        )}
        <button
          type="button"
          disabled
          title="Disponible en HU-15"
          className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium text-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          Unirse — Próximamente
        </button>
      </div>
    </li>
  )
}
