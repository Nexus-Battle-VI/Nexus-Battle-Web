import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { HttpError, type HttpDownload } from '@/lib/http'
import { PrivacySection, type PrivacySectionProps } from './PrivacySection'
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
  props: PrivacySectionProps = {},
) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))

  return renderAccountSection(<PrivacySection {...props} />, ACCOUNT_CONTEXT)
}

const fileFor = (format: string): HttpDownload => ({
  content: new Blob([format]),
  filename: `export.${format}`,
  mediaType: 'application/octet-stream',
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('PrivacySection', () => {
  it('muestra un estado de carga accesible mientras resuelve la proyección de privacidad', () => {
    renderPrivacySection(new Promise<Response>(() => undefined))

    expect(screen.getByRole('heading', { name: 'Mis datos personales' })).toBeInTheDocument()
    expect(screen.getByText('Cargando tus datos personales...')).toHaveAttribute('role', 'status')
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

  it('ante un 401 muestra un mensaje seguro de sesión caducada', async () => {
    const { container } = renderPrivacySection(
      jsonResponse(401, { message: 'Falta el testimonio o no es válido' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(/sesión ha caducado/u)
    expect(container.textContent).not.toContain('Falta el testimonio')
  })

  it('ante otros errores de consulta no expone detalles técnicos', async () => {
    const { container } = renderPrivacySection(
      jsonResponse(500, { message: 'StackTrace: token secret hash credential' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo cargar tu información personal. Intenta de nuevo más tarde.',
    )
    expect(container.textContent).not.toMatch(/StackTrace|token|secret|hash|credential/u)
  })

  it('no muestra datos de otros titulares, subject, tokens ni fecha inventada', async () => {
    const { container } = renderPrivacySection()
    await screen.findByText('Cuenta: Valeria Privacidad (titular autenticado)')
    const text = container.textContent

    expect(text).not.toContain('DrakoFenix')
    expect(text).not.toContain('00567')
    expect(text).not.toContain('technical-account-id')
    expect(text).not.toMatch(/subject|token|accessToken|status|avatarStorageKey/iu)
    expect(screen.queryByText('ID de jugador')).not.toBeInTheDocument()
    expect(screen.queryByText('Fecha de registro')).not.toBeInTheDocument()
    expect(text).not.toMatch(/registeredAt|createdAt|Date\.now/iu)
  })

  it('mantiene JSON, XML y PDF habilitados sin el mensaje anterior de indisponibilidad', async () => {
    renderPrivacySection()
    await screen.findByText('Cuenta: Valeria Privacidad (titular autenticado)')

    for (const format of ['JSON', 'XML', 'PDF']) {
      expect(screen.getByRole('heading', { name: format })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: `Solicitar exportación ${format}` })).toBeEnabled()
    }

    expect(screen.queryByText(/servicio correspondiente esté habilitado/iu)).not.toBeInTheDocument()
  })

  it.each(['json', 'xml', 'pdf'] as const)(
    'solicita %s, entrega el Blob real al guardado y muestra éxito',
    async (format) => {
      const user = userEvent.setup()
      const file = fileFor(format)
      const exportPersonalData = vi.fn().mockResolvedValue(file)
      const saveExport = vi.fn()
      renderPrivacySection(undefined, { exportPersonalData, saveExport })
      await screen.findByText('Cuenta: Valeria Privacidad (titular autenticado)')

      await user.click(
        screen.getByRole('button', { name: `Solicitar exportación ${format.toUpperCase()}` }),
      )

      expect(exportPersonalData.mock.calls[0]?.[0]).toBe(format)
      expect(saveExport).toHaveBeenCalledWith(file, format)
      expect(
        await screen.findByText(new RegExp(`${format} se descargó correctamente`, 'iu')),
      ).toBeInTheDocument()
    },
  )

  it('muestra procesamiento y no guarda antes de recibir el Blob', async () => {
    const user = userEvent.setup()
    const exportPersonalData = vi.fn().mockReturnValue(new Promise<HttpDownload>(() => undefined))
    const saveExport = vi.fn()
    renderPrivacySection(undefined, { exportPersonalData, saveExport })
    await screen.findByText('Cuenta: Valeria Privacidad (titular autenticado)')

    const pdf = screen.getByRole('button', { name: 'Solicitar exportación PDF' })
    await user.click(pdf)

    expect(pdf).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('Preparando la exportación PDF...')).toBeInTheDocument()
    expect(saveExport).not.toHaveBeenCalled()
  })

  it('maneja PDF 503 sin filtrar detalles, no descarga y permite reintentar', async () => {
    const user = userEvent.setup()
    const file = fileFor('pdf')
    const exportPersonalData = vi
      .fn()
      .mockRejectedValueOnce(
        new HttpError(503, 'Statistics internal URL stack token subject', {
          service: 'Comments',
        }),
      )
      .mockResolvedValueOnce(file)
    const saveExport = vi.fn()
    const { container } = renderPrivacySection(undefined, { exportPersonalData, saveExport })
    await screen.findByText('Cuenta: Valeria Privacidad (titular autenticado)')
    const pdf = screen.getByRole('button', { name: 'Solicitar exportación PDF' })

    await user.click(pdf)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El reporte PDF aún no puede prepararse. Intenta nuevamente más tarde.',
    )
    expect(saveExport).not.toHaveBeenCalled()
    expect(pdf).toBeEnabled()
    expect(container.textContent).not.toMatch(
      /Statistics|Comments|internal URL|stack|token|subject/u,
    )

    await user.click(pdf)

    expect(await screen.findByText(/PDF se descargó correctamente/iu)).toBeInTheDocument()
    expect(exportPersonalData).toHaveBeenCalledTimes(2)
    expect(saveExport).toHaveBeenCalledOnce()
  })

  it('muestra un error seguro si falla una exportación sin afirmar éxito', async () => {
    const user = userEvent.setup()
    const saveExport = vi.fn()
    renderPrivacySection(undefined, {
      exportPersonalData: vi.fn().mockRejectedValue(new Error('Bearer token stack interno')),
      saveExport,
    })
    await screen.findByText('Cuenta: Valeria Privacidad (titular autenticado)')

    await user.click(screen.getByRole('button', { name: 'Solicitar exportación JSON' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo descargar la exportación JSON. Intenta nuevamente.',
    )
    expect(screen.queryByText(/se descargó correctamente/iu)).not.toBeInTheDocument()
    expect(saveExport).not.toHaveBeenCalled()
  })
})
