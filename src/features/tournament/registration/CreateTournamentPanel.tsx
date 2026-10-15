import { useState } from 'react'
import { CalendarClock, Swords, Trophy, FlaskConical } from 'lucide-react'
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

const localDate = (date: Date): string =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)

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
        (value.length === 10 || value.length === 11) &&
        value.every((part) => typeof part === 'string')
        ? value
        : []
    } catch {
      return []
    }
  })()
  const [name, setName] = useState(draft[0] ?? '')
  const [isTest, setIsTest] = useState(draft.length === 0 || draft[10] === 'TEST')
  const [policyKind, setPolicyKind] = useState(draft[1] ?? 'FREE')
  const [credits, setCredits] = useState(draft[2] ?? '')
  const [money, setMoney] = useState(draft[3] ?? '')
  const [currency, setCurrency] = useState(draft[4] ?? '')
  const [precision, setPrecision] = useState(draft[5] ?? '')
  const [opensAt, setOpensAt] = useState(() => draft[6] ?? localDate(new Date()))
  const [startsAt, setStartsAt] = useState(
    () => draft[8] ?? localDate(new Date(Math.ceil((Date.now() + 30 * 60000) / 60000) * 60000)),
  )
  const [closesAt, setClosesAt] = useState(draft[7] ?? startsAt)
  const [customClosing, setCustomClosing] = useState(draft.length > 0)
  const [mode, setMode] = useState<TournamentMode>(
    draft[9] === 'DUO' || draft[9] === 'TRIO' ? draft[9] : 'SOLO',
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
    ...(isTest ? ['TEST'] : []),
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
        ...(isTest ? { isTest: true } : {}),
      }),
    )
    if (result !== null) {
      setCreated(result.name)
      onCreated(result.id)
    }
  }
  return (
    <Card className="tournament-simple-create">
      <details open={initiallyOpen}>
        <summary hidden={initiallyOpen} className="cursor-pointer font-semibold">
          Crear torneo · administración
        </summary>
        <form
          className="tournament-simple-form"
          aria-label="Creación de torneo"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <header className="tournament-simple-heading">
            <span className="tournament-simple-emblem">
              <Trophy size={28} aria-hidden="true" />
            </span>
            <div>
              <h2>Prepara el torneo</h2>
              <p>Ponle nombre. Elige formato y hora. Listo.</p>
            </div>
          </header>
          <div className="tournament-simple-basics">
            <TextField
              label="Nombre del torneo"
              value={name}
              required
              placeholder="Ej. Torneo de los viernes"
              disabled={locked}
              onChange={(event) => {
                setName(event.target.value)
              }}
            />
            <TextField
              label="Inicio del torneo"
              type="datetime-local"
              required
              disabled={locked}
              value={startsAt}
              onChange={(event) => {
                setStartsAt(event.target.value)
                if (!customClosing) setClosesAt(event.target.value)
              }}
            />
          </div>
          <fieldset className="tournament-format-picker" disabled={locked}>
            <legend>Modalidad del torneo</legend>
            <div>
              {(['SOLO', 'DUO', 'TRIO'] as const).map((value) => (
                <label key={value}>
                  <input
                    type="radio"
                    name="tournament-mode"
                    checked={mode === value}
                    onChange={() => {
                      setMode(value)
                    }}
                  />
                  <Swords size={20} aria-hidden="true" />
                  <strong>{modalities[value].label}</strong>
                  <span>
                    {value === 'SOLO' ? 'Individual' : value === 'DUO' ? 'Parejas' : 'Tríos'}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="tournament-kind-picker" disabled={locked}>
            <legend className="sr-only">Tipo de torneo</legend>
            <label>
              <input
                type="radio"
                name="tournament-kind"
                checked={isTest}
                onChange={() => {
                  setIsTest(true)
                  setPolicyKind('FREE')
                }}
              />
              <FlaskConical size={20} aria-hidden="true" />
              <span>
                <strong>Prueba gratuita</strong>
                <small>Sin recompensas</small>
              </span>
            </label>
            <label>
              <input
                type="radio"
                name="tournament-kind"
                checked={!isTest}
                onChange={() => {
                  setIsTest(false)
                }}
              />
              <Trophy size={20} aria-hidden="true" />
              <span>
                <strong>Competitivo</strong>
                <small>Premios configurables</small>
              </span>
            </label>
          </fieldset>
          {!isTest && (
            <SelectField
              label="Política de inscripción"
              value={policyKind}
              required
              disabled={locked || isTest}
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
          )}
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
          <p className="tournament-simple-summary">
            <CalendarClock size={17} aria-hidden="true" />
            {modalities[mode].summary}.{' '}
            {closesAt ? `Inscripción hasta ${dateLabel(closesAt)}.` : 'Elige cuándo empieza.'}
          </p>
          <details className="tournament-simple-options">
            <summary>Personalizar horarios y ver rondas</summary>
            <div className="grid gap-3 sm:grid-cols-2 mt-3">
              {(
                [
                  ['Apertura de inscripción', opensAt, setOpensAt],
                  [
                    'Cierre de inscripción',
                    closesAt,
                    (value: string) => {
                      setCustomClosing(true)
                      setClosesAt(value)
                    },
                  ],
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
              Horas locales. Aceptación de dos minutos; rondas cada diez minutos. El inicio elegido
              abre la primera aceptación.
            </p>
          </details>
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
              className="tournament-simple-primary"
              type="submit"
              loading={operation.busy}
              disabled={operation.intent?.phase === 'REJECTED'}
            >
              {operation.intent === null
                ? isTest
                  ? 'Crear torneo de prueba'
                  : 'Crear torneo'
                : 'Comprobar creación'}
            </Button>
          ) : (
            <p role="status">Torneo creado: {created}.</p>
          )}
        </form>
      </details>
    </Card>
  )
}
