import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SelectField } from '@/components/ui/form/SelectField'
import { TextField } from '@/components/ui/form/TextField'
import type { EntryPolicy, PaidMethod, RegistrationApi } from './api'
import { amountInMinorUnits } from './money'
import { useOperation } from './useOperation'

export const CreateTournamentPanel = ({
  subject,
  api,
  onCreated,
}: {
  readonly subject: string
  readonly api: RegistrationApi
  readonly onCreated: (id: string) => void
}): React.JSX.Element => {
  const operation = useOperation(JSON.stringify([subject, 'create-tournament']))
  const draft = (() => {
    try {
      const value: unknown = JSON.parse(operation.intent?.fingerprint ?? 'null')
      return Array.isArray(value) &&
        value.length === 9 &&
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
      }),
    )
    if (result !== null) {
      setCreated(result.name)
      onCreated(result.id)
    }
  }
  return (
    <Card>
      <details>
        <summary className="cursor-pointer font-semibold">Crear torneo · administración</summary>
        <form
          className="mt-4 grid gap-4"
          aria-label="Creación de torneo"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
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
                ['Inicio del torneo', startsAt, setStartsAt],
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
          <p className="text-sm text-muted">
            Fechas en tu hora local. Los precios se configuran por separado y no se convierten entre
            créditos y moneda. El servidor exige al menos 91 × 24 horas entre inicios de torneos.
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
