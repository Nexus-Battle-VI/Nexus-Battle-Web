import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { QueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/shared/query-keys'
import { renderWithProviders } from '@/test/render'
import { PREVIEW_ACCOUNT, accountPreviewChildren } from './previewRoutes'

/**
 * `PrivacySection` lee `queryKeys.account.privacy` (HU-45.4) de la MISMA forma
 * que `AccountDevPreview` ya hace en la ruta real `/__dev/account/privacy`:
 * precargando el cache (con `staleTime: Infinity`, igual que el preview real)
 * en vez de dejar que dispare `GET /accounts/me/privacy`. Sin este seed, esta
 * prueba aislada (sin el shell `AccountDevPreview` alrededor) golpearia la red
 * de verdad y el hallazgo no seria sobre los transportes que sí importan aquí
 * (TOTP/idioma/exportación/eliminación).
 */
const privacyQueryClient = (): QueryClient => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } },
  })
  client.setQueryData(queryKeys.account.privacy, {
    email: PREVIEW_ACCOUNT.email,
    displayName: PREVIEW_ACCOUNT.displayName,
    firstNames: PREVIEW_ACCOUNT.firstNames,
    lastNames: PREVIEW_ACCOUNT.lastNames,
    roles: PREVIEW_ACCOUNT.roles,
    termsAccepted: true,
  })
  return client
}

/**
 * Vista previa de desarrollo de "Mi cuenta" (remaster visual Sprint 3) —
 * garantiza que los transportes inyectados en `accountPreviewChildren`
 * (TOTP, idioma, exportacion, eliminacion de cuenta) NUNCA llaman a
 * `fetch` real. El informe de implementacion lo exige explicitamente:
 * el preview debe poder inspeccionarse sin Account real, sin generar
 * secretos TOTP reales, sin PATCH de idioma, sin exportar ni eliminar
 * nada de verdad.
 */
const elementFor = (path: string): React.ReactElement => {
  const route = accountPreviewChildren.find((candidate) => candidate.path === path)
  if (route?.element === undefined || route.element === null) {
    throw new Error(`no se encontro la ruta de preview "${path}"`)
  }
  return route.element as React.ReactElement
}

describe('accountPreviewChildren (vista previa DEV de Mi cuenta)', () => {
  let fetchSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchSpy = vi.fn(() => {
      throw new Error('la vista previa DEV no debe llamar a fetch real')
    })
    vi.stubGlobal('fetch', fetchSpy)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('inscribe y confirma TOTP con un secreto de fixture, sin tocar la red', async () => {
    const user = userEvent.setup()
    renderWithProviders(elementFor('security'))

    await user.click(screen.getByRole('button', { name: 'Configurar autenticador' }))

    const secret = await screen.findByText('DEVPREVIEWFIXTUREONLY')
    expect(secret).toBeInTheDocument()

    await user.type(screen.getByLabelText('Codigo del autenticador'), '123456')
    await user.click(screen.getByRole('button', { name: 'Confirmar autenticador' }))

    expect(await screen.findByRole('status')).toHaveTextContent(/./)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('cambia el idioma de forma local sin invocar PATCH /accounts/me ni revertir la seleccion', async () => {
    const user = userEvent.setup()
    renderWithProviders(elementFor('preferences'))

    const english = screen.getByRole('button', { name: /English/ })
    await user.click(english)

    await waitFor(() => {
      expect(english).toHaveAttribute('aria-pressed', 'true')
    })
    // Si la mutacion real hubiera corrido y fallado, `onError` revertiria la
    // seleccion a Espanol: comprobar que sigue en Ingles tras asentarse es la
    // prueba de que el seam DEV evito el PATCH.
    expect(english).toHaveAttribute('aria-pressed', 'true')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('simula la exportacion de datos personales sin llamar a /accounts/me/privacy/export', async () => {
    const user = userEvent.setup()
    renderWithProviders(elementFor('privacy'), { queryClient: privacyQueryClient() })

    await user.click(screen.getByRole('button', { name: 'Solicitar exportación JSON' }))

    expect(
      await screen.findByText('La exportación JSON se descargó correctamente.'),
    ).toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('simula la solicitud de eliminacion de cuenta sin llamar a POST /accounts/me/deletion-requests', async () => {
    const user = userEvent.setup()
    renderWithProviders(elementFor('privacy'), { queryClient: privacyQueryClient() })

    await user.click(screen.getByRole('button', { name: 'Solicitar eliminación de cuenta' }))
    await user.click(screen.getByRole('button', { name: 'Sí, solicitar eliminación' }))

    expect(await screen.findByText('Solicitud recibida.')).toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
