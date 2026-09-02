import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'

import { PrivacySection } from './PrivacySection'
import { renderAccountSection } from './testRender'
import type { OwnAccount, OwnPersonalData } from './api'

const PERSONAL_DATA: OwnPersonalData = {
  email: 'valeria.privacidad@nexus.test',
  displayName: 'Valeria Privacidad',
  firstNames: 'Valeria',
  lastNames: 'Rios',
  roles: ['PLAYER'],
  termsAccepted: true,
}

const ACCOUNT_CONTEXT: OwnAccount = {
  id: 'technical-account-id',
  email: 'general.account@nexus.test',
  displayName: 'Cuenta General',
  firstNames: 'General',
  lastNames: 'Account',
  status: 'SUSPENDED',
  roles: ['PLAYER'],
}

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const renderPrivacySection = (
  response: Response | Promise<Response> = jsonResponse(200, PERSONAL_DATA),
) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))

  return renderAccountSection(<PrivacySection />, ACCOUNT_CONTEXT)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('PrivacySection', () => {
  it('muestra un estado de carga accesible mientras resuelve la proyeccion de privacidad', () => {
    const pending = new Promise<Response>((resolve) => {
      setTimeout(resolve, 1_000_000)
    })
    renderPrivacySection(pending)

    expect(screen.getByRole('heading', { name: 'Mis datos personales' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Cargando tus datos personales...')
  })

  it('muestra los datos reales del contrato privacy, no los del OwnAccount general', async () => {
    const { container } = renderPrivacySection()

    expect(
      await screen.findByText('Cuenta: Valeria Privacidad (titular autenticado)'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Consulta tu información y solicita una copia en el formato que prefieras.'),
    ).toBeInTheDocument()

    const summary = screen.getByLabelText('Resumen de tu información')
    expect(within(summary).getByText('Nombre de usuario')).toBeInTheDocument()
    expect(within(summary).getByText(PERSONAL_DATA.displayName)).toBeInTheDocument()
    expect(within(summary).getByText('Correo electrónico')).toBeInTheDocument()
    expect(within(summary).getByText(PERSONAL_DATA.email)).toBeInTheDocument()
    expect(within(summary).getByText('Nombre')).toBeInTheDocument()
    expect(within(summary).getByText(PERSONAL_DATA.firstNames)).toBeInTheDocument()
    expect(within(summary).getByText('Apellidos')).toBeInTheDocument()
    expect(within(summary).getByText(PERSONAL_DATA.lastNames)).toBeInTheDocument()
    expect(within(summary).getByText('Rol')).toBeInTheDocument()
    expect(within(summary).getByText('Jugador')).toBeInTheDocument()
    expect(within(summary).getByText('Aceptación de términos')).toBeInTheDocument()
    expect(within(summary).getByText('Sí')).toBeInTheDocument()

    expect(container.textContent).not.toContain(ACCOUNT_CONTEXT.id)
    expect(container.textContent).not.toContain(ACCOUNT_CONTEXT.displayName)
    expect(container.textContent).not.toContain(ACCOUNT_CONTEXT.email)
  })

  it('ante un 401 muestra un mensaje seguro de sesion caducada', async () => {
    const { container } = renderPrivacySection(
      jsonResponse(401, { message: 'Falta el testimonio o no es valido' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(/sesión ha caducado/u)
    expect(container.textContent).not.toContain('Falta el testimonio')
  })

  it('ante otros errores muestra un mensaje comprensible sin detalles tecnicos', async () => {
    const { container } = renderPrivacySection(
      jsonResponse(500, { message: 'StackTrace: token secret hash credential' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo cargar tu información personal. Intenta de nuevo más tarde.',
    )
    expect(container.textContent).not.toMatch(/StackTrace|token|secret|hash|credential/u)
  })

  it('no muestra datos de Figma, otros titulares, subject, tokens ni fecha inventada', async () => {
    const { container } = renderPrivacySection()
    await screen.findByText('Cuenta: Valeria Privacidad (titular autenticado)')
    const text = container.textContent

    expect(text).not.toContain('DrakoFenix')
    expect(text).not.toContain('00567')
    expect(text).not.toContain('drako.fenix@correo.com')
    expect(text).not.toContain('Beatriz')
    expect(text).not.toMatch(/subject|token|accessToken|status|avatarStorageKey/iu)
    expect(text).not.toContain('technical-account-id')
    expect(screen.queryByText('ID de jugador')).not.toBeInTheDocument()
    expect(screen.queryByText('Fecha de registro')).not.toBeInTheDocument()
    expect(text).not.toMatch(/registeredAt|createdAt|Date\.now/iu)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('declara JSON, XML y PDF como exportaciones no disponibles sin simular archivos', async () => {
    renderPrivacySection()
    await screen.findByText('Cuenta: Valeria Privacidad (titular autenticado)')

    for (const format of ['JSON', 'XML', 'PDF']) {
      expect(screen.getByRole('heading', { name: format })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: `Solicitar exportación ${format}` })).toBeDisabled()
    }

    expect(
      screen.getAllByText(
        'Esta exportación estará disponible cuando el servicio correspondiente esté habilitado.',
      ),
    ).toHaveLength(3)
    expect(screen.queryByRole('link', { name: /descargar/iu })).not.toBeInTheDocument()
  })
})
