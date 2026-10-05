import { useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'
import { SelectField } from '@/components/ui/form/SelectField'
import { TournamentWorkbench } from './legacy/TournamentWorkbench'
import { DEV_TOURNAMENT_ACTORS } from './legacy/dev/fixtures'
import { LocalTournamentGateway } from './legacy/dev/LocalTournamentGateway'

/** Preserved historical in-memory demo. It does not consume the current server contract. */
export const TournamentLocalPage = (): React.JSX.Element => {
  const [gateway, setGateway] = useState(() => new LocalTournamentGateway())
  const [actorId, setActorId] = useState('p13')
  const actor =
    DEV_TOURNAMENT_ACTORS.find((candidate) => candidate.id === actorId) ?? DEV_TOURNAMENT_ACTORS[0]
  if (actor === undefined) throw new Error('Faltan actores de la demo.')
  return (
    <section className="grid gap-6 p-5" aria-label="Torneo: demo histórica">
      <aside className="grid gap-3 rounded-lg border border-border bg-surface-raised p-4">
        <h1 className="text-xl font-semibold">Demo histórica de Torneo · solo DEV</h1>
        <p>
          Datos ficticios en memoria: equipos, avatares, héroes, pagos y resultados. Este prototipo
          conserva el avance original; no acredita el contrato v2 ni sesiones Cognito.
        </p>
        <SelectField
          label="Perfil de prueba"
          value={actorId}
          options={DEV_TOURNAMENT_ACTORS.map((candidate) => ({
            value: candidate.id,
            label: candidate.name,
          }))}
          onChange={(event) => {
            setActorId(event.target.value)
          }}
        />
        <Button
          variant="secondary"
          onClick={() => {
            setGateway(new LocalTournamentGateway())
          }}
        >
          Reiniciar demo histórica
        </Button>
        <Link to="/tournament" className="text-brand underline">
          Abrir Torneo con sesión real
        </Link>
        <Link to="/__dev/tournament/registration" className="text-brand underline">
          Revisar la interfaz v2 con datos de prueba
        </Link>
      </aside>
      <TournamentWorkbench key={actorId} gateway={gateway} actor={actor} />
    </section>
  )
}
