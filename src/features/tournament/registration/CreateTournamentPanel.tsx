import { useState } from 'react'
import { TournamentButton as Button } from '../TournamentVisuals'
import { TournamentCard as Card } from '../TournamentVisuals'
import { SelectField } from '@/components/ui/form/SelectField'
import { TextField } from '@/components/ui/form/TextField'
import {
  MODALITIES_CONTRACT_VERSION,
  type EntryPolicy,
  type PaidMethod,
  type RegistrationApi,
  type TournamentMode,
} from './api'
import { modalities } from './modalities'
import { calendarPreview } from './calendar'
import { dateLabel } from './presentation'
import { amountInMinorUnits } from './money'
import { useOperation } from './useOperation'

export const CreateTournamentPanel = ({
  subject,
  api,
  onCreated,
  initiallyOpen = false,
}: {
  readonly subject: string
  readonly api: RegistrationApi
  readonly onCreated: (id: string) => void
  readonly initiallyOpen?: boolean
}): React.JSX.Element => {
  const operation = useOperation(
    JSON.stringify([subject, 'create-tournament', MODALITIES_CONTRACT_VERSION]),
  )
  const draft = (() => {
    try {
      const value: unknown = JSON.parse(operation.intent?.fingerprint ?? 'null')
      return Array.isArray(value) &&
        value.length === 10 &&
        value.every((part) => typeof part === 'string')
        ? value
        : []
    } catch {
      return []
    }
  })()
  const [name, setName] = useState(draft[0] ?? '')
  const [policyKind, setPolicyKind] = useState(draft[1] ?? '')
  const [credits, setCredits] = useState(draft[2] ?? '')
  const [money, setMoney] = useState(draft[3] ?? '')
  const [currency, setCurrency] = useState(draft[4] ?? '')
  const [precision, setPrecision] = useState(draft[5] ?? '')
  const [opensAt, setOpensAt] = useState(draft[6] ?? '')
  const [closesAt, setClosesAt] = useState(draft[7] ?? '')
  const [startsAt, setStartsAt] = useState(draft[8] ?? '')
  const [mode, setMode] = useState<TournamentMode>(
    draft[9] === 'SOLO' || draft[9] === 'TRIO' ? draft[9] : 'DUO',
  )
  const [validation, setValidation] = useState<string | null>(null)
  const [created, setCreated] = useState<string | null>(null)
  const hasCredits = policyKind === 'CREDITS' || policyKind === 'BOTH'
  const hasMoney = policyKind === 'SIMULATED_MONEY' || policyKind === 'BOTH'
  const fingerprint = JSON.stringify([
    name,
    policyKind,
    credits,
    money,
    currency,
    precision,
    opensAt,
    closesAt,
    startsAt,
    mode,
  ])
  const locked = operation.busy || operation.intent !== null || created !== null
  const submit = async (): Promise<void> => {
    const methods: PaidMethod[] = []
    if (hasCredits) {
      const amount = Number(credits)
      if (!Number.isSafeInteger(amount) || amount <= 0) {
        setValidation('Configura un importe entero positivo de créditos.')
        return
      }
      methods.push({ method: 'CREDITS', amount })
    }
    if (hasMoney) {
      const minorUnit = precision === '' ? -1 : Number(precision)
      const amountMinor = amountInMinorUnits(money, minorUnit)
      if (amountMinor === null || !/^[A-Z]{3}$/u.test(currency)) {
        setValidation('Revisa importe, código de moneda y decimales del pago simulado.')
        return
      }
      methods.push({ method: 'SIMULATED_MONEY', amountMinor, currency, minorUnit })
    }
    if (policyKind === '' || (policyKind !== 'FREE' && methods.length === 0)) return
    const opening = new Date(opensAt)
    const closing = new Date(closesAt)
    const start = new Date(startsAt)
    if (
      ![opening, closing, start].every((date) => Number.isFinite(date.getTime())) ||
      opening >= closing ||
      closing > start
    ) {
      setValidation(
        'La apertura debe ser anterior al cierre y el cierre no puede superar el inicio.',
      )
      return
    }
    setValidation(null)
    const entryPolicy: EntryPolicy =
      policyKind === 'FREE'
        ? { version: 1, free: true, methods: [] }
        : { version: 1, free: false, methods }
    const result = await operation.run(fingerprint, fingerprint, (operationId) =>
      api.create({
        operationId,
        name,
        entryPolicy,
        opensAt: opening.toISOString(),
        closesAt: closing.toISOString(),
        startsAt: start.toISOString(),
        tournamentMode: mode,
      }),
    )
    if (result !== null) {
      setCreated(result.name)
      onCreated(result.id)
    }
  }
  return (
    <Card>
      <details open={initiallyOpen}>
        <summary className="cursor-pointer font-semibold">Crear torneo · administración</summary>
        <form
          className="mt-4 grid gap-4"
          aria-label="Creación de torneo"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <SelectField
            label="Modalidad del torneo"
            value={mode}
            disabled={locked}
            options={Object.entries(modalities).map(([value, details]) => ({
              value,
              label: `${details.label} · ${details.summary}`,
            }))}
            onChange={(event) => {
              setMode(event.target.value as TournamentMode)
            }}
          />
          <p>{modalities[mode].summary}. La modalidad queda fija al crear.</p>
          <TextField
            label="Nombre del torneo"
            value={name}
            required
            disabled={locked}
            onChange={(event) => {
              setName(event.target.value)
            }}
          />
          <SelectField
            label="Política de inscripción"
            value={policyKind}
            required
            disabled={locked}
            placeholder="Elige la política"
            options={[
              { value: 'FREE', label: 'Gratuita' },
              { value: 'CREDITS', label: 'Créditos' },
              { value: 'SIMULATED_MONEY', label: 'Dinero simulado' },
              { value: 'BOTH', label: 'Créditos o dinero simulado' },
            ]}
            onChange={(event) => {
              setPolicyKind(event.target.value)
            }}
          />
          {hasCredits && (
            <TextField
              label="Importe en créditos"
              type="number"
              min={1}
              step={1}
              required
              disabled={locked}
              value={credits}
              onChange={(event) => {
                setCredits(event.target.value)
              }}
            />
          )}
          {hasMoney && (
            <div className="grid gap-3 sm:grid-cols-3">
              <TextField
                label="Importe de dinero simulado"
                inputMode="decimal"
                required
                disabled={locked}
                value={money}
                onChange={(event) => {
                  setMoney(event.target.value)
                }}
              />
              <TextField
                label="Código de moneda"
                hint="Tres letras; lo define el torneo."
                required
                minLength={3}
                maxLength={3}
                pattern="[A-Z]{3}"
                disabled={locked}
                value={currency}
                onChange={(event) => {
                  setCurrency(event.target.value.toUpperCase())
                }}
              />
              <TextField
                label="Decimales de la moneda"
                type="number"
                min={0}
                max={6}
                step={1}
                required
                disabled={locked}
                value={precision}
                onChange={(event) => {
                  setPrecision(event.target.value)
                }}
              />
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                ['Apertura de inscripción', opensAt, setOpensAt],
                ['Cierre de inscripción', closesAt, setClosesAt],
                ['Apertura de la primera aceptación', startsAt, setStartsAt],
              ] as const
            ).map(([label, value, set]) => (
              <TextField
                key={label}
                label={label}
                type="datetime-local"
                required
                disabled={locked}
                value={value}
                onChange={(event) => {
                  set(event.target.value)
                }}
              />
            ))}
          </div>
          {calendarPreview(startsAt).length > 0 && (
            <div
              className="tournament-calendar-scroll"
              tabIndex={0}
              aria-label="Vista previa del calendario"
            >
              <table className="tournament-calendar">
                <caption>Vista previa de seis rondas · el servidor guarda el calendario</caption>
                <thead>
                  <tr>
                    <th>Ronda</th>
                    <th>Aceptación personal</th>
                    <th>Inicio previsto</th>
                  </tr>
                </thead>
                <tbody>
                  {calendarPreview(startsAt).map((round) => (
                    <tr key={round.round}>
                      <th>{round.round}</th>
                      <td>
                        {dateLabel(round.opensAt)} – {dateLabel(round.closesAt)}
                      </td>
                      <td>{dateLabel(round.plannedStartAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-sm text-muted">
            Fechas en tu hora local. Los precios se configuran por separado y no se convierten entre
            créditos y moneda. Cada justa tiene dos minutos de aceptación y comienza al cierre de su
            ventana. Las rondas están separadas por diez minutos; los horarios quedan fijos.
          </p>
          {operation.intent?.phase === 'UNCERTAIN' && (
            <p role="status">Creación pendiente de comprobar. Se conserva el mismo intento.</p>
          )}
          {validation !== null && <p role="alert">{validation}</p>}
          {operation.error?.state === fingerprint && <p role="alert">{operation.error.message}</p>}
          {operation.intent?.phase === 'REJECTED' && (
            <Button variant="secondary" onClick={operation.resetRejected}>
              Corregir configuración
            </Button>
          )}
          {created === null ? (
            <Button
              type="submit"
              loading={operation.busy}
              disabled={operation.intent?.phase === 'REJECTED'}
            >
              {operation.intent === null ? 'Crear torneo' : 'Comprobar creación'}
            </Button>
          ) : (
            <p role="status">Torneo creado: {created}.</p>
          )}
        </form>
      </details>
    </Card>
  )
}
