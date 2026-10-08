import { useId, useState } from 'react'
import type { PublishedBracket } from './bracketApi'
import { TournamentButton as Button } from '../TournamentVisuals'
import {
  COLUMN_STEP,
  layoutBracket,
  NODE_WIDTH,
  NODE_HEIGHT,
  sourceLabel,
  type GraphMatch,
} from './bracketLayout'
import { useBracketWidth } from './useBracketWidth'
import './bracket-tree.css'

const tracks = [
  { key: 'MAIN', title: 'Árbol de ganadores', label: 'Ganadores' },
  { key: 'SECONDARY', title: 'Árbol de perdedores', label: 'Perdedores' },
  { key: 'FINAL', title: 'Final', label: 'Final' },
] as const
type Track = GraphMatch['track'] | 'ALL'

export const BracketTree = ({
  bracket,
  selection,
  onSelect,
  statusLabel,
  timeLabel,
  winnerLabel,
}: {
  readonly bracket: Omit<PublishedBracket, 'matches'> & { readonly matches: readonly GraphMatch[] }
  readonly selection: string
  readonly onSelect: (id: string) => void
  readonly statusLabel: (match: GraphMatch) => string
  readonly timeLabel: (match: GraphMatch) => string
  readonly winnerLabel: (match: GraphMatch) => string | null
}): React.JSX.Element => {
  const [track, setTrack] = useState<Track>('MAIN')
  const [view, setView] = useState<'auto' | 'tree' | 'rounds'>('auto')
  const [zoom, setZoom] = useState(1)
  const [round, setRound] = useState(1)
  const [team, setTeam] = useState('')
  const { container, width } = useBracketWidth()
  const marker = useId()
  const selected = bracket.matches.find((m) => m.id === selection)
  const activeTrack = track === 'ALL' ? track : (selected?.track ?? track)
  const layout = layoutBracket(bracket.matches, activeTrack === 'ALL' ? undefined : activeTrack)
  const validation = layoutBracket(bracket.matches)
  const matches = bracket.matches.filter((m) => activeTrack === 'ALL' || m.track === activeTrack)
  const currentRound =
    selected?.round ?? (layout.rounds.includes(round) ? round : (layout.rounds[0] ?? 1))
  const roundIndex = layout.rounds.indexOf(currentRound)
  const byRounds = view === 'rounds' || (view === 'auto' && width < layout.width * 0.9)
  const scale = view === 'auto' ? Math.min(1, width / layout.width) : zoom
  const roundTime = (value: number): string => {
    const match = matches.find((entry) => entry.round === value)
    return match ? timeLabel(match) : ''
  }
  const teamLabel = (match: GraphMatch, side: 0 | 1): string =>
    bracket.seeds.find((seed) => seed.teamId === match.teamIds[side])?.name ??
    sourceLabel(match.sources[side])
  const selectedNodes = new Set(
    bracket.matches
      .filter((m) => m.id === selection || (team !== '' && m.teamIds.includes(team)))
      .map((m) => m.id),
  )
  const choose = (id: string): void => {
    setTeam('')
    onSelect(id)
  }
  const chooseTrack = (next: Track): void => {
    setTrack(next)
    setRound(1)
    setTeam('')
    onSelect('')
  }
  const chooseRound = (next: number): void => {
    setRound(next)
    onSelect('')
  }
  const card = (match: GraphMatch, diagram: boolean) => {
    const winner = winnerLabel(match)
    const position = layout.positions.get(match.id)
    return (
      <button
        key={match.id}
        type="button"
        className={'bracket-node' + (diagram ? ' bracket-node--diagram' : '')}
        style={
          diagram && position
            ? { left: position.x, top: position.y, width: NODE_WIDTH, height: NODE_HEIGHT }
            : undefined
        }
        data-match={match.id}
        data-highlight={selectedNodes.has(match.id)}
        aria-pressed={selection === match.id}
        aria-label={
          match.id +
          ' · Ronda ' +
          String(match.round) +
          ' · ' +
          teamLabel(match, 0) +
          ' contra ' +
          teamLabel(match, 1) +
          ' · ' +
          statusLabel(match)
        }
        onClick={() => {
          choose(match.id)
        }}
      >
        <span className="bracket-node-heading">
          {match.id} · Ronda {match.round}
        </span>
        {([0, 1] as const).map((side) => (
          <span
            key={side}
            data-side={side}
            className="bracket-node-side"
            title={teamLabel(match, side)}
          >
            <span className="bracket-side-badge">{side === 0 ? 'A' : 'B'}</span>
            <span className="bracket-side-name">{teamLabel(match, side)}</span>
          </span>
        ))}
        <span
          className="bracket-node-state"
          title={winner ? statusLabel(match) + ' · Ganador: ' + winner : statusLabel(match)}
        >
          {winner ? 'Ganador: ' + winner : statusLabel(match)}
        </span>
        {!diagram && <span className="bracket-node-time">{timeLabel(match)}</span>}
        {diagram && (
          <>
            <span className="bracket-port bracket-port--winner" title="Salida del ganador">
              G
            </span>
            <span className="bracket-port bracket-port--loser" title="Salida del perdedor">
              P
            </span>
          </>
        )}
      </button>
    )
  }
  return (
    <div className="bracket-tree" ref={container}>
      <div className="bracket-controls">
        <div className="bracket-track-controls" role="group" aria-label="Ramas de las llaves">
          {tracks.map(({ key, label }) => (
            <Button
              key={key}
              variant="secondary"
              aria-pressed={activeTrack === key}
              onClick={() => {
                chooseTrack(key)
              }}
            >
              {label}{' '}
              <span className="bracket-track-count">
                · {bracket.matches.filter((m) => m.track === key).length}
              </span>
            </Button>
          ))}
          <Button
            variant="secondary"
            aria-pressed={activeTrack === 'ALL'}
            onClick={() => {
              chooseTrack('ALL')
            }}
          >
            Todas <span className="bracket-track-count">· {bracket.matches.length}</span>
          </Button>
        </div>
        <div className="bracket-view-controls" role="group" aria-label="Presentación de las llaves">
          <Button
            variant="secondary"
            aria-pressed={!byRounds}
            onClick={() => {
              setView('tree')
            }}
          >
            Ver árbol
          </Button>
          <Button
            variant="secondary"
            aria-pressed={byRounds}
            onClick={() => {
              setView('rounds')
            }}
          >
            Ver por rondas
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setView('auto')
              setZoom(1)
            }}
          >
            Ajustar
          </Button>
        </div>
        {!byRounds && (
          <div className="bracket-zoom-controls">
            <Button
              variant="secondary"
              aria-label="Reducir árbol"
              disabled={scale <= 0.75}
              onClick={() => {
                setZoom(Math.max(0.75, scale - 0.15))
                setView('tree')
              }}
            >
              −
            </Button>
            <span>{Math.round(scale * 100)} %</span>
            <Button
              variant="secondary"
              aria-label="Ampliar árbol"
              disabled={scale >= 1.5}
              onClick={() => {
                setZoom(Math.min(1.5, scale + 0.15))
                setView('tree')
              }}
            >
              +
            </Button>
          </div>
        )}
      </div>
      <details className="bracket-guide">
        <summary>Cómo leer las llaves y localizar un equipo</summary>
        <p className="text-sm text-muted">
          Selecciona una justa para ver sus equipos completos, su origen y su siguiente encuentro.
          En pantallas estrechas se muestra una ronda a la vez.
        </p>
        <p className="bracket-legend">
          <span>━ G · Ganador</span>
          <span>┄ P · Perdedor</span>
          <span>A / B · Lado del encuentro</span>
        </p>
        <ol className="bracket-seeds" aria-label="Posiciones de equipos">
          {bracket.seeds.map((seed) => (
            <li key={seed.teamId}>
              <button
                type="button"
                aria-pressed={team === seed.teamId}
                onClick={() => {
                  setTeam(seed.teamId)
                  onSelect('')
                }}
              >
                Cupo {seed.position} · {seed.name}
              </button>
            </li>
          ))}
        </ol>
      </details>
      {team !== '' && (
        <p role="status">
          Conexiones de {bracket.seeds.find((seed) => seed.teamId === team)?.name} en las justas
          resueltas.
        </p>
      )}
      {(validation.missingSources.length > 0 ||
        validation.edges.some((edge) => !edge.consistent)) && (
        <p role="alert">
          Las fuentes y destinos recibidos no coinciden. Actualiza las llaves; el recorrido requiere
          revisión del servidor.
        </p>
      )}
      {byRounds ? (
        <div className="bracket-round-list">
          <div className="bracket-round-navigation">
            <Button
              variant="secondary"
              aria-label="Ronda anterior"
              disabled={roundIndex <= 0}
              onClick={() => {
                chooseRound(layout.rounds[roundIndex - 1] ?? currentRound)
              }}
            >
              ←
            </Button>
            <label>
              <span className="sr-only">Ronda de las llaves</span>
              <select
                value={currentRound}
                onChange={(event) => {
                  chooseRound(Number(event.target.value))
                }}
              >
                {layout.rounds.map((value) => (
                  <option key={value} value={value}>
                    Ronda {value}
                  </option>
                ))}
              </select>
            </label>
            <Button
              variant="secondary"
              aria-label="Ronda siguiente"
              disabled={roundIndex >= layout.rounds.length - 1}
              onClick={() => {
                chooseRound(layout.rounds[roundIndex + 1] ?? currentRound)
              }}
            >
              →
            </Button>
            <span className="text-xs text-muted">{roundTime(currentRound)}</span>
          </div>
          <section aria-label={'Ronda ' + String(currentRound)}>
            <div className="bracket-round-cards">
              {matches.filter((m) => m.round === currentRound).map((m) => card(m, false))}
            </div>
          </section>
        </div>
      ) : (
        <>
          <p id={marker + '-hint'} className="text-xs text-muted">
            Enfoca el árbol y usa las flechas para desplazarte; Tab y Enter permiten elegir una
            justa. Puedes consultar las otras ramas con Ganadores, Perdedores, Final o Todas.
          </p>
          <div
            className="bracket-viewport"
            tabIndex={0}
            role="region"
            aria-label="Árbol desplazable de llaves"
            aria-describedby={marker + '-hint'}
            style={{ height: layout.height * scale + 2 }}
          >
            <div
              className="bracket-sizer"
              style={{ width: layout.width * scale, height: layout.height * scale }}
            >
              <div
                className="bracket-plane"
                style={{
                  width: layout.width,
                  height: layout.height,
                  transform: 'scale(' + String(scale) + ')',
                }}
              >
                <svg
                  width={layout.width}
                  height={layout.height}
                  className="bracket-connectors"
                  aria-hidden="true"
                >
                  <defs>
                    {(['WINNER', 'LOSER'] as const).map((kind) => (
                      <marker
                        key={kind}
                        id={marker + '-' + kind}
                        markerWidth="6"
                        markerHeight="6"
                        refX="5"
                        refY="3"
                        orient="auto"
                      >
                        <path
                          d="M0 0 L6 3 L0 6 Z"
                          className={'bracket-arrow bracket-arrow--' + kind.toLowerCase()}
                        />
                      </marker>
                    ))}
                  </defs>
                  {layout.edges.map((edge) => (
                    <g
                      key={edge.to + '-' + String(edge.side)}
                      data-from={edge.from}
                      data-to={edge.to}
                      data-side={edge.side}
                      data-kind={edge.kind}
                      data-highlight={selectedNodes.has(edge.from) || selectedNodes.has(edge.to)}
                    >
                      <path d={edge.path} className="bracket-edge-underlay" />
                      <path
                        d={edge.path}
                        className={'bracket-edge bracket-edge--' + edge.kind.toLowerCase()}
                        markerEnd={'url(#' + marker + '-' + edge.kind + ')'}
                      />
                    </g>
                  ))}
                </svg>
                {layout.rounds.map((value, column) => (
                  <div
                    key={value}
                    className="bracket-round-heading"
                    style={{ left: 16 + column * COLUMN_STEP, width: NODE_WIDTH }}
                  >
                    Ronda {value}
                    {activeTrack !== 'ALL' && <span>{roundTime(value)}</span>}
                  </div>
                ))}
                {tracks
                  .filter(({ key }) => activeTrack === 'ALL' || activeTrack === key)
                  .map(({ key, title }) => {
                    const entries = matches.filter((m) => m.track === key)
                    const firstPosition = entries[0]
                      ? layout.positions.get(entries[0].id)
                      : undefined
                    return (
                      <section key={key} aria-label={title}>
                        <h3
                          className={activeTrack === 'ALL' ? 'bracket-track-heading' : 'sr-only'}
                          style={
                            activeTrack === 'ALL'
                              ? {
                                  left: key === 'FINAL' ? firstPosition?.x : 16,
                                  top: (firstPosition?.y ?? 52) - 20,
                                }
                              : undefined
                          }
                        >
                          {title}
                        </h3>
                        {entries.map((m) => card(m, true))}
                      </section>
                    )
                  })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
