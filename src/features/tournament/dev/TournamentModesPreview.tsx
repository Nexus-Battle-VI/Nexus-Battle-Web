import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { SelectField } from '@/components/ui/form/SelectField'
import { useTheme } from '@/shared/theme'
import { TournamentRegistrationPage } from '@/features/tournament/registration/TournamentRegistrationPage'
import { TournamentBracketPanel } from '@/features/tournament/registration/TournamentBracketPanel'
import { TournamentAcceptancePanel } from '@/features/tournament/registration/TournamentAcceptancePanel'
import { TournamentEncounterAdminPanel } from '@/features/tournament/registration/TournamentEncounterAdminPanel'
import { TournamentEncountersPanel } from '@/features/tournament/registration/TournamentEncountersPanel'
import { calendarPreviewApis } from './calendarPreviewApis'
import { useTournamentAssets } from '@/features/tournament/tournamentAssets'
import {
  MODALITIES_CONTRACT_VERSION,
  type RegistrationApi,
  type TournamentMode,
} from '@/features/tournament/registration/api'
import { modalities } from '@/features/tournament/registration/modalities'
import {
  createRegistrationPreviewApis,
  DEV_REGISTRATION_TOURNAMENT,
  devAvatarDownload,
} from './registrationFixtures'

/** Explicit visual fixtures, isolated by Vite DEV; never an API fallback. */
export const TournamentModesPreview = (): React.JSX.Element => {
  const [mode, setMode] = useState<TournamentMode>('TRIO')
  const [scene, setScene] = useState('llaves')
  const [state, setState] = useState('open')
  const theme = useTheme((state) => state.theme)
  const setTheme = useTheme((state) => state.setTheme)
  const assets = useTournamentAssets()
  const baseline = useMemo(() => createRegistrationPreviewApis(), [])
  const template = useQuery({
    queryKey: ['qa-tree-template'],
    queryFn: () => baseline.brackets.publish('qa', 'qa-bracket'),
  })
  const size = modalities[mode].size
  const tournament = {
    ...DEV_REGISTRATION_TOURNAMENT,
    id: `qa-formats-${mode}-${state}`,
    name: 'Copa Nexus · octavos de la arena',
    contractVersion: MODALITIES_CONTRACT_VERSION,
    tournamentMode: mode,
    teamSize: size,
  }
  const bracket = template.data
    ? {
        ...template.data,
        tournamentId: tournament.id,
        version: 3 as const,
        tournamentMode: mode,
        teamSize: size,
        seeds: template.data.seeds.map((seed, index) => ({
          ...seed,
          name:
            [
              'Guardianes del Amanecer y de las Tierras del Norte',
              'Caballeros de la Última Fortaleza',
              'Centinelas de la Costa Esmeralda',
              'Alianza de la Montaña y el Bosque Antiguo',
              'Exploradores del Valle de las Sombras',
              'Vigilantes de las Estrellas del Sur',
              'Defensores del Último Portal',
              'Heredero de la Corona del Reino Perdido',
            ][index] ?? seed.name,
          memberIds: Array.from(
            { length: size },
            (_, seat) => `qa-${String(index)}-${String(seat)}`,
          ),
        })),
      }
    : null
  const calendar = bracket ? calendarPreviewApis(bracket, mode, state) : null
  const qaSubject = bracket?.seeds[0]?.memberIds[0] ?? 'qa-0-0'
  const api: RegistrationApi = {
    ...baseline.api,
    list: () => Promise.resolve([tournament]),
    view: () =>
      Promise.resolve({
        tournament,
        capacity: {
          confirmed: 7,
          reserved: 1,
          available: 0,
          teamSize: size,
          confirmedPeople: 7 * size,
          totalPeople: 8 * size,
        },
        teams: [],
      }),
    create: () => Promise.reject(new Error('Revisión visual: crear requiere el servidor real.')),
    register: () =>
      Promise.reject(new Error('Revisión visual: registrar requiere el servidor real.')),
  }
  return (
    <main className="mx-auto grid min-w-0 max-w-7xl gap-5 p-3 sm:p-6">
      <aside className="grid gap-3 rounded border border-border p-4">
        <h1 className="font-semibold">Revisión visual · datos de demostración · solo DEV</h1>
        <p className="text-sm">
          Monta componentes del producto. No valida cuentas, pagos ni combates reales. Recursos
          existentes de Cuenta, Comercio y Jugar Online; PixelLab y OBS pendientes.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SelectField
            label="Modalidad de revisión"
            value={mode}
            options={Object.entries(modalities).map(([value, format]) => ({
              value,
              label: format.label,
            }))}
            onChange={(event) => {
              setMode(event.target.value as TournamentMode)
            }}
          />
          <SelectField
            label="Pantalla de revisión"
            value={scene}
            options={[
              { value: 'llaves', label: 'Árbol de llaves' },
              { value: 'inscripcion', label: 'Inscripción' },
              { value: 'administrador', label: 'Producto · administrador' },
              { value: 'convocatoria', label: 'Aceptación personal' },
              { value: 'operacion', label: 'Administración de justas' },
              { value: 'consulta', label: 'Consulta de justa' },
            ]}
            onChange={(event) => {
              setScene(event.target.value)
            }}
          />
          <SelectField
            label="Estado de revisión"
            value={state}
            options={[
              { value: 'open', label: 'Aceptación abierta' },
              { value: 'ready', label: 'Lista para iniciar' },
              { value: 'running', label: 'E1 y E2 en curso' },
              { value: 'blocked', label: 'Dependencia retrasada' },
              { value: 'absence-count', label: 'Ausencia · mayor conteo' },
              { value: 'absence-tie', label: 'Ausencia · empate sorteado' },
              { value: 'absence-full', label: 'Ausencia · un lado completo' },
              { value: 'final', label: 'Final y campeón' },
            ]}
            onChange={(event) => {
              setState(event.target.value)
            }}
          />
          <SelectField
            label="Tema de revisión"
            value={theme}
            options={[
              { value: 'light', label: 'Claro' },
              { value: 'dark', label: 'Oscuro' },
            ]}
            onChange={(event) => {
              setTheme(event.target.value === 'dark' ? 'dark' : 'light')
            }}
          />
        </div>
      </aside>
      <div style={assets} className="tournament-skin min-w-0">
        {scene === 'llaves' && bracket && calendar ? (
          <TournamentBracketPanel
            key={`${mode}:${state}`}
            id={tournament.id}
            subject={`qa-player-${state}`}
            roles={['PLAYER']}
            confirmed={8}
            api={{ view: () => Promise.resolve(bracket), publish: baseline.brackets.publish }}
            progress={calendar.progress}
            encounters={calendar.encounters}
          />
        ) : scene === 'convocatoria' && calendar ? (
          <TournamentAcceptancePanel
            key={`${mode}:${state}`}
            id={tournament.id}
            subject={qaSubject}
            encounters={calendar.encounters}
            api={calendar.acceptance}
          />
        ) : scene === 'operacion' && calendar ? (
          <TournamentEncounterAdminPanel
            key={`${mode}:${state}`}
            id={tournament.id}
            subject={`qa-admin-${state}`}
            encounters={calendar.encounters}
            admin={calendar.admin}
          />
        ) : scene === 'consulta' && calendar && bracket ? (
          <TournamentEncountersPanel
            key={`${mode}:${state}`}
            id={tournament.id}
            subject={qaSubject}
            api={calendar.encounters}
            selectedMatchId={
              bracket.matches.find(
                (m) => m.id === (state === 'blocked' ? 'E9' : state === 'final' ? 'Final' : 'E1'),
              )?.encounterId ?? ''
            }
          />
        ) : ['inscripcion', 'administrador'].includes(scene) ? (
          <TournamentRegistrationPage
            key={`${mode}:${scene}`}
            api={api}
            identity={{
              subject: `qa-review-owner-${mode}`,
              roles: scene === 'administrador' ? ['ADMINISTRATOR'] : ['PLAYER'],
              displayName: 'Jugador de revisión',
            }}
            avatarDownload={devAvatarDownload}
            brackets={{ view: () => Promise.resolve(null), publish: baseline.brackets.publish }}
            encounters={baseline.encounters}
          />
        ) : (
          <p role="status">Cargando grafo de demostración…</p>
        )}
      </div>
    </main>
  )
}
