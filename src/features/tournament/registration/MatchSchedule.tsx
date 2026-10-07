import { dateLabel } from './presentation'
import type { MatchSummary, TournamentResolution } from './encounterApi'

const absenceReason: Record<TournamentResolution['ruleApplied'], string> = {
  ONE_COMPLETE: 'Un lado completó la aceptación y el otro quedó incompleto.',
  HIGHER_ACCEPTANCE_COUNT:
    'Ambos lados quedaron incompletos. El servidor otorgó la victoria al que recibió más aceptaciones.',
  TIED_ACCEPTANCE_COUNT:
    'Las aceptaciones quedaron empatadas. El servidor conservó un sorteo para esta resolución.',
}
export const AbsenceResolution = ({
  match,
}: {
  readonly match: MatchSummary
}): React.JSX.Element | null => {
  const resolution = match.resolution
  if (resolution?.resultType !== 'ABSENCE') return null
  const winner = match.registeredTeams?.find(
    (team) => team?.teamId === resolution.winnerTeamId,
  )?.name
  return (
    <section
      className="tournament-absence"
      aria-label={`Resolución por ausencia de ${match.bracketLabel}`}
    >
      <p className="font-semibold">Victoria por ausencia{winner ? ` · ${winner}` : ''}</p>
      <p>{absenceReason[resolution.ruleApplied]}</p>
      <p>
        Aceptaciones al cierre: lado A {resolution.acceptedCounts[0]} · lado B{' '}
        {resolution.acceptedCounts[1]}.
      </p>
      <p className="text-sm">
        Cuenta como victoria normal para el avance. Esta justa terminó sin combate.
      </p>
      <details className="tournament-technical">
        <summary>Recibo de resolución</summary>
        <p className="break-all">{resolution.resolutionId}</p>
        <p>
          {dateLabel(resolution.resolvedAt)} · {resolution.ruleApplied}
        </p>
        {resolution.tieBreak && (
          <p className="break-all">
            Sorteo conservado: {resolution.tieBreak.drawId} · lado{' '}
            {resolution.tieBreak.selectedSide === 0 ? 'A' : 'B'}
          </p>
        )}
      </details>
    </section>
  )
}
export const MatchSchedule = ({
  match,
}: {
  readonly match: MatchSummary
}): React.JSX.Element | null => {
  if (match.contractVersion !== 'torneos-v3.0.0') return null
  return (
    <div className="grid gap-1 text-sm">
      <p>
        Apertura:{' '}
        {match.acceptanceOpensAt ? dateLabel(match.acceptanceOpensAt) : 'Pendiente del servidor'}
      </p>
      <p>
        Cierre de aceptación:{' '}
        {match.acceptanceClosesAt ? dateLabel(match.acceptanceClosesAt) : 'Pendiente del servidor'}
      </p>
      <p>
        Inicio previsto:{' '}
        {match.scheduledStartAt ? dateLabel(match.scheduledStartAt) : 'Pendiente del servidor'}
      </p>
      {match.acceptedCounts && (
        <p className="font-semibold">
          Lado A: {match.acceptedCounts[0]}/{match.teamSize} · Lado B: {match.acceptedCounts[1]}/
          {match.teamSize} aceptaciones
        </p>
      )}
      {match.blockReason && (
        <p role="status">
          {match.blockReason.responsible === 'COMBAT_OPERATIONS'
            ? 'Operación de Combat pendiente'
            : 'Justa bloqueada por retraso'}
          : {match.blockReason.message}
        </p>
      )}
      {match.acceptanceStatus === 'SCHEDULED' && (
        <p>Ventana programada; el servidor aún no confirma su apertura.</p>
      )}
      {match.acceptanceStatus === 'CLOSED' &&
        !match.resolution &&
        !match.blockReason &&
        match.status !== 'IN_PROGRESS' &&
        match.status !== 'FINISHED' &&
        (match.operationalStatus === 'PREPARE_PENDING' ||
          match.operationalStatus === 'START_PENDING') && (
          <p>Aceptación cerrada. Esperando la operación de Combat.</p>
        )}
    </div>
  )
}
