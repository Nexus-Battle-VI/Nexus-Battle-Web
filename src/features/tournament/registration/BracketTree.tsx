import { useId, useRef, useState } from 'react'
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
import './bracket-tree.css'

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
  const [alternative, setAlternative] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [team, setTeam] = useState('')
  const viewport = useRef<HTMLDivElement>(null)
  const marker = useId()
  const layout = layoutBracket(bracket.matches)
  const finalMatch = bracket.matches.find((match) => match.track === 'FINAL')
  const finalPosition = finalMatch ? layout.positions.get(finalMatch.id) : undefined
  const roundTime = (round: number): string => {
    const match = bracket.matches.find((entry) => entry.round === round)
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
  const card = (match: GraphMatch, diagram: boolean) => {
    const winner = winnerLabel(match)
    const position = layout.positions.get(match.id)
    return (
      <button
        key={match.id}
        type="button"
        className={`bracket-node${diagram ? ' bracket-node--diagram' : ''}`}
        style={
          diagram && position
            ? { left: position.x, top: position.y, width: NODE_WIDTH, height: NODE_HEIGHT }
            : undefined
        }
        data-match={match.id}
        data-highlight={selectedNodes.has(match.id)}
        aria-pressed={selection === match.id}
        aria-label={`${match.id} · Ronda ${String(match.round)} · ${teamLabel(match, 0)} contra ${teamLabel(match, 1)} · ${statusLabel(match)}`}
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
          title={winner ? `${statusLabel(match)} · Ganador: ${winner}` : statusLabel(match)}
        >
          {winner ? `Ganador: ${winner}` : statusLabel(match)}
        </span>
        <span className="bracket-node-time">{timeLabel(match)}</span>
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
    <div className="bracket-tree">
      <p className="text-sm text-muted">
        Sigue las ramas: cada línea llega al lado A o B de la próxima justa. Selecciona una justa
        para consultar su recorrido y detalle.
      </p>
      <div className="bracket-controls">
        <Button
          variant="secondary"
          aria-pressed={!alternative}
          onClick={() => {
            setAlternative(false)
          }}
        >
          Ver árbol
        </Button>
        <Button
          variant="secondary"
          aria-pressed={alternative}
          onClick={() => {
            setAlternative(true)
          }}
        >
          Ver por rondas
        </Button>
        {!alternative && (
          <>
            <Button
              variant="secondary"
              aria-label="Reducir árbol"
              disabled={zoom <= 0.75}
              onClick={() => {
                setZoom((value) => Math.max(0.75, value - 0.25))
              }}
            >
              −
            </Button>
            <span>{Math.round(zoom * 100)} %</span>
            <Button
              variant="secondary"
              aria-label="Ampliar árbol"
              disabled={zoom >= 1.25}
              onClick={() => {
                setZoom((value) => Math.min(1.25, value + 0.25))
              }}
            >
              +
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                viewport.current?.scrollBy({ left: -COLUMN_STEP * zoom, behavior: 'auto' })
              }
            >
              Ronda anterior
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                viewport.current?.scrollBy({ left: COLUMN_STEP * zoom, behavior: 'auto' })
              }
            >
              Ronda siguiente
            </Button>
            <Button
              variant="secondary"
              onClick={() => viewport.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' })}
            >
              Inicio del árbol
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                viewport.current?.scrollTo({ top: (layout.lowerTop - 45) * zoom, behavior: 'auto' })
              }
            >
              Ir a perdedores
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                if (!finalMatch || !finalPosition) return
                choose(finalMatch.id)
                viewport.current?.scrollTo({
                  left: finalPosition.x * zoom - 28,
                  top: (finalPosition.y - 65) * zoom,
                  behavior: 'auto',
                })
              }}
            >
              Ir a final
            </Button>
          </>
        )}
      </div>
      <p className="bracket-legend">
        <span>━ G · Ganador</span>
        <span>┄ P · Perdedor</span>
        <span>A / B · Lado del encuentro</span>
      </p>
      <details>
        <summary className="cursor-pointer">Localizar un equipo · ocho cupos</summary>
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
      {(layout.missingSources.length > 0 || layout.edges.some((edge) => !edge.consistent)) && (
        <p role="alert">
          Las fuentes y destinos recibidos no coinciden. Actualiza las llaves; el recorrido requiere
          revisión del servidor.
        </p>
      )}
      {alternative ? (
        <div className="bracket-round-list">
          {[...new Set(bracket.matches.map((m) => m.round))]
            .sort((a, b) => a - b)
            .map((round) => (
              <section key={round} aria-label={`Ronda ${String(round)}`}>
                <h3 className="font-semibold">Ronda {round}</h3>
                <div className="bracket-round-cards">
                  {bracket.matches
                    .filter((m) => m.round === round)
                    .map((m) => (
                      <div key={m.id}>
                        {card(m, false)}
                        <p className="text-sm">
                          A: {sourceLabel(m.sources[0])} · B: {sourceLabel(m.sources[1])}
                        </p>
                      </div>
                    ))}
                </div>
              </section>
            ))}
        </div>
      ) : (
        <>
          <p id={`${marker}-hint`} className="text-sm text-muted">
            Desplaza el diagrama horizontal y verticalmente. Con teclado, enfoca esta área y usa las
            flechas; Tab selecciona cada justa.
          </p>
          <div
            ref={viewport}
            className="bracket-viewport"
            tabIndex={0}
            role="region"
            aria-label="Árbol desplazable de llaves"
            aria-describedby={`${marker}-hint`}
          >
            <div
              className="bracket-sizer"
              style={{ width: layout.width * zoom, height: layout.height * zoom }}
            >
              <div
                className="bracket-plane"
                style={{
                  width: layout.width,
                  height: layout.height,
                  transform: `scale(${String(zoom)})`,
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
                        id={`${marker}-${kind}`}
                        markerWidth="6"
                        markerHeight="6"
                        refX="5"
                        refY="3"
                        orient="auto"
                      >
                        <path
                          d="M0 0 L6 3 L0 6 Z"
                          className={`bracket-arrow bracket-arrow--${kind.toLowerCase()}`}
                        />
                      </marker>
                    ))}
                  </defs>
                  {layout.edges.map((edge) => (
                    <g
                      key={`${edge.to}-${String(edge.side)}`}
                      data-from={edge.from}
                      data-to={edge.to}
                      data-side={edge.side}
                      data-kind={edge.kind}
                      data-highlight={selectedNodes.has(edge.from) || selectedNodes.has(edge.to)}
                    >
                      <path d={edge.path} className="bracket-edge-underlay" />
                      <path
                        d={edge.path}
                        className={`bracket-edge bracket-edge--${edge.kind.toLowerCase()}`}
                        markerEnd={`url(#${marker}-${edge.kind})`}
                      />
                    </g>
                  ))}
                </svg>
                {[...new Set(bracket.matches.map((m) => m.round))]
                  .sort((a, b) => a - b)
                  .map((round) => (
                    <div
                      key={round}
                      className="bracket-round-heading"
                      style={{ left: 28 + (round - 1) * COLUMN_STEP, width: NODE_WIDTH }}
                    >
                      Ronda {round}
                      <span className="block text-xs font-normal">{roundTime(round)}</span>
                    </div>
                  ))}
                {(
                  [
                    ['MAIN', 'Árbol de ganadores'],
                    ['SECONDARY', 'Árbol de perdedores'],
                    ['FINAL', 'Final'],
                  ] as const
                ).map(([track, title]) => (
                  <section key={track} aria-label={title}>
                    <h3
                      className="bracket-track-heading"
                      style={{
                        left: track === 'FINAL' ? layout.width - NODE_WIDTH - 28 : 28,
                        top:
                          track === 'SECONDARY'
                            ? layout.lowerTop - 45
                            : track === 'FINAL'
                              ? (finalPosition?.y ?? 100) - 45
                              : 75,
                      }}
                    >
                      {title}
                    </h3>
                    {bracket.matches.filter((m) => m.track === track).map((m) => card(m, true))}
                  </section>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
