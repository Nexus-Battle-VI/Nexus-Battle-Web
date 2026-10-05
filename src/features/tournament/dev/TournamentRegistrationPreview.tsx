import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { SelectField } from '@/components/ui/form/SelectField'
import { TournamentRegistrationPage } from '@/features/tournament/registration/TournamentRegistrationPage'
import { createRegistrationPreviewApis, devAvatarDownload } from './registrationFixtures'

export const TournamentRegistrationPreview = (): React.JSX.Element => {
  const apis = useMemo(() => createRegistrationPreviewApis(), [])
  const [subject, setSubject] = useState('dev-player-A')
  return (
    <div className="mx-auto grid max-w-7xl gap-5 p-5">
      <aside className="grid gap-3 rounded-lg border border-brand p-4">
        <h1 className="font-semibold">Vista previa v2 · datos de prueba · solo DEV</h1>
        <p>
          Adaptadores de prueba en memoria. Siete confirmados ficticios y un cupo de prueba. No
          prueba Cognito, Wallet, Account ni Combat. Cambiar perfil no cambia tu sesión real.
        </p>
        <SelectField
          label="Actor de prueba"
          value={subject}
          options={[
            { value: 'dev-player-A', label: 'Jugador A · creador' },
            { value: 'dev-player-B', label: 'Jugador B · compañero' },
            { value: 'dev-admin', label: 'Administrador de prueba' },
          ]}
          onChange={(event) => {
            setSubject(event.target.value)
          }}
        />
        <Link className="text-brand underline" to="/tournament">
          Abrir Torneo con sesión real
        </Link>
      </aside>
      <TournamentRegistrationPage
        {...apis}
        avatarDownload={devAvatarDownload}
        identity={{ subject, roles: subject === 'dev-admin' ? ['ADMINISTRATOR'] : ['PLAYER'] }}
      />
    </div>
  )
}
