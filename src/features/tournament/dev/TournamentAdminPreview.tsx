import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import '@/features/battle-rooms/battle-rooms.css'
import { Button } from '@/components/ui/Button'
import { TournamentEncounterAdminPanel } from '@/features/tournament/registration/TournamentEncounterAdminPanel'
import { TournamentEncountersPanel } from '@/features/tournament/registration/TournamentEncountersPanel'
import { createEncounterAdminFixture, DEV_ADMIN_TOURNAMENT_ID } from './encounterAdminFixtures'

/**
 * Vista previa DEV de HU-85.3: el panel administrativo y la vista de consulta
 * (la que usa la transmisión) conviven con el MISMO adaptador de prueba, pero
 * son componentes distintos. Datos ficticios en memoria; no prueba Combat.
 */
export const TournamentAdminPreview = (): React.JSX.Element => {
  const fixture = useMemo(() => createEncounterAdminFixture({ delayMs: 600 }), [])
  const [down, setDown] = useState(false)
  return (
    <div className="br-scene br-scene-lobby br-scene-pad mx-auto grid max-w-7xl gap-5">
      <aside className="br-panel grid gap-3 p-4">
        <p className="br-heading-eyebrow">Torneo · solo DEV</p>
        <h1 className="br-heading-title">Administración de justas · datos de prueba</h1>
        <p>
          Adaptador en memoria que replica el contrato HU-85 (propuesta pendiente de revisión).
          E1–E4 tienen equipos definidos; E5–Final esperan resultados previos, por eso el servidor
          de prueba las rechaza. No prueba Cognito, Combat ni PostgreSQL.
        </p>
        <div>
          <Button
            variant="battle-compact"
            aria-pressed={down}
            onClick={() => {
              fixture.setCombatDown(!down)
              setDown(!down)
            }}
          >
            {down ? 'Restablecer Combat de prueba' : 'Simular Combat caído'}
          </Button>
        </div>
        <Link className="text-brand underline" to="/tournament">
          Abrir Torneo con sesión real
        </Link>
      </aside>
      <TournamentEncounterAdminPanel
        id={DEV_ADMIN_TOURNAMENT_ID}
        subject="dev-admin"
        encounters={fixture.encounters}
        admin={fixture.admin}
      />
      <TournamentEncountersPanel
        id={DEV_ADMIN_TOURNAMENT_ID}
        subject="dev-admin"
        api={fixture.encounters}
      />
    </div>
  )
}
