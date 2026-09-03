import { useId, useState } from 'react'
import { COUNTRY_OPTIONS } from './countries'

import { Button } from '@/components/ui/Button'
import { statusLabel } from '@/lib/format'
import { validateDisplayName, type OwnAccount, type OwnAccountEdit } from './api'
import { useAccountContext } from './outletContext'
import { useUpdateOwnAccount } from './useOwnAccount'
import {
  FIELD_CLASS,
  FIELD_ERROR_CLASS,
  FIELD_HINT_CLASS,
  FIELD_LABEL_CLASS,
  READONLY_FIELD_CLASS,
} from './fieldStyles'

/**
 * Informacion personal de la cuenta (HU-05.4).
 *
 * Contrato REAL: `GET /api/accounts/me` trae todo; `PATCH /api/accounts/me` solo
 * admite `displayName` y `countryCode`. El apodo y el país se editan; el correo,
 * los nombres y el estado se muestran de solo lectura -no como controles
 * deshabilitados que inviten a pensar que "algun dia" se podran tocar aqui-.
 *
 * No hay actualizacion optimista: el mensaje de exito aparece cuando Account
 * confirma, y el valor mostrado es el que Account devuelve.
 */

interface ReadonlyRowProps {
  readonly label: string
  readonly value: string
}

const ReadonlyRow = ({ label, value }: ReadonlyRowProps): React.JSX.Element => (
  <div>
    <span className={FIELD_LABEL_CLASS}>{label}</span>
    <p className={`mt-1 ${READONLY_FIELD_CLASS}`}>{value}</p>
  </div>
)

export interface ProfileSectionProps {
  /**
   * Transporte del guardado. Se inyecta en pruebas y en la vista previa de
   * desarrollo; en produccion queda `updateOwnAccount` (`PATCH /accounts/me`).
   */
  readonly save?: (edit: OwnAccountEdit) => Promise<OwnAccount>
}

export const ProfileSection = ({ save }: ProfileSectionProps = {}): React.JSX.Element => {
  const { account } = useAccountContext()
  const mutation = useUpdateOwnAccount(save)

  const [displayName, setDisplayName] = useState(account.displayName)
  const [countryCode, setCountryCode] = useState(account.countryCode ?? '')
  const [clientError, setClientError] = useState<string | null>(null)

  const errorId = useId()

  const trimmed = displayName.trim().replace(/\s+/gu, ' ')
  const countryUnchanged = countryCode === (account.countryCode ?? '')
  const unchanged = trimmed === account.displayName && countryUnchanged

  let backendError: string | null = null
  if (mutation.isError) {
    backendError =
      mutation.error instanceof Error ? mutation.error.message : 'No se pudo guardar el perfil.'
  }
  const shownError = clientError ?? backendError

  const handleSubmit = (event: React.SyntheticEvent): void => {
    event.preventDefault()
    mutation.reset()

    const invalid = validateDisplayName(displayName)
    if (invalid !== null) {
      setClientError(invalid)
      return
    }

    setClientError(null)
    mutation.mutate({
      displayName: trimmed,
      ...(countryUnchanged ? {} : { countryCode: countryCode || null }),
    })
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <ReadonlyRow label="Nombres" value={account.firstNames} />
        <ReadonlyRow label="Apellidos" value={account.lastNames} />
        <ReadonlyRow label="Correo electronico" value={account.email} />
        <ReadonlyRow label="Estado de la cuenta" value={statusLabel(account.status)} />
      </div>

      <div>
        <label htmlFor="account-display-name" className={FIELD_LABEL_CLASS}>
          Apodo
        </label>
        <input
          id="account-display-name"
          name="displayName"
          type="text"
          className={`mt-1 ${FIELD_CLASS}`}
          value={displayName}
          maxLength={64}
          autoComplete="nickname"
          aria-invalid={shownError !== null}
          aria-describedby={shownError !== null ? errorId : undefined}
          onChange={(event) => {
            setDisplayName(event.target.value)
            setClientError(null)
            mutation.reset()
          }}
        />
        <p className={FIELD_HINT_CLASS}>
          Es tu nombre visible para el resto de jugadores. Entre 3 y 32 caracteres.
        </p>
        {shownError !== null && (
          <p id={errorId} role="alert" className={FIELD_ERROR_CLASS}>
            {shownError}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="account-country" className={FIELD_LABEL_CLASS}>
          País
        </label>
        <select
          id="account-country"
          name="countryCode"
          autoComplete="country"
          className={`mt-1 ${FIELD_CLASS}`}
          value={countryCode}
          onChange={(event) => {
            setCountryCode(event.target.value)
            mutation.reset()
          }}
        >
          <option value="">Sin especificar</option>
          {COUNTRY_OPTIONS.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
        <p className={FIELD_HINT_CLASS}>Se usará para determinar la moneda de tus compras.</p>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" loading={mutation.isPending} disabled={unchanged}>
          Guardar cambios
        </Button>
        {mutation.isSuccess && (
          <p role="status" className="text-sm text-success">
            Cambios guardados correctamente.
          </p>
        )}
      </div>
    </form>
  )
}
