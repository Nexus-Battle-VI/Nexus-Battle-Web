import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'

import { createTestQueryClient, renderWithProviders } from '@/test/render'
import { useSession } from '@/shared/session'
import { LoginPage } from './LoginPage'
import { MESSAGES } from './validation'
import type { LoginOutcome } from './api'

const ANONYMOUS_STATE = {
  subject: null,
  email: null,
  displayName: null,
  roles: [],
  accessToken: null,
  expiresAt: null,
  viaProvider: false,
}

afterEach(() => {
  useSession.setState(ANONYMOUS_STATE)
})

const PLAYER_SESSION: LoginOutcome = {
  status: 'AUTHENTICATED',
  session: {
    subject: 'sujeto-ana',
    email: 'ana@nexus.test',
    displayName: 'Ana',
    roles: ['PLAYER'],
    accessToken: 'token-de-sesion',
    expiresAt: Date.now() + 900_000,
  },
}

const renderLogin = (
  loginFn?: () => Promise<LoginOutcome>,
  verifyMfaCodeFn?: () => Promise<LoginOutcome>,
) =>
  renderWithProviders(
    <LoginPage
      {...(loginFn === undefined ? {} : { loginFn })}
      {...(verifyMfaCodeFn === undefined ? {} : { verifyMfaCodeFn })}
    />,
    { route: '/login' },
  )

/** Para las pruebas que necesitan observar una navegacion real hacia /ecommerce. */
const renderLoginWithRouter = (
  loginFn?: () => Promise<LoginOutcome>,
  verifyMfaCodeFn?: () => Promise<LoginOutcome>,
) =>
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route
            path="/login"
            element={
              <LoginPage
                {...(loginFn === undefined ? {} : { loginFn })}
                {...(verifyMfaCodeFn === undefined ? {} : { verifyMfaCodeFn })}
              />
            }
          />
          <Route path="/ecommerce" element={<p>Landing de E-commerce</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

describe('LoginPage', () => {
  it('presenta el logotipo real del producto y el titulo de la pantalla', () => {
    renderLogin()

    // El logo es el asset real (`public/assets/logo.png`), no un lockup de
    // texto: se verifica por su `alt`, no por un texto plano "Nexus Battles VI".
    expect(
      screen.getByRole('img', { name: 'The Nexus Battles VI — Return of the Warriors' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Iniciar sesión' })).toBeInTheDocument()
  })

  it('muestra el campo de correo/apodo y el de contraseña con su etiqueta', () => {
    renderLogin()

    const identifier = screen.getByLabelText('Correo o apodo')
    const password = screen.getByLabelText('Contraseña')

    expect(identifier).toBeInTheDocument()
    expect(identifier).toHaveAttribute('placeholder', 'nombre@correo.com o tu apodo')
    expect(password).toHaveAttribute('type', 'password')
    expect(password).toHaveAttribute('placeholder', 'Tu contraseña')
  })

  it('ofrece los enlaces de recuperar contraseña y crear cuenta', () => {
    renderLogin()

    expect(screen.getByRole('button', { name: '¿Olvidaste tu contraseña?' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '¿No tienes cuenta? Crear cuenta' })).toHaveAttribute(
      'href',
      '/register',
    )
  })

  it('no incluye ningun selector de rol', () => {
    renderLogin()

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(screen.queryByText(/rol/iu)).not.toBeInTheDocument()
  })

  it('no muestra errores antes de cualquier interaccion', () => {
    renderLogin()

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Correo o apodo')).toHaveAttribute('aria-invalid', 'false')
  })

  it('al enviar vacio muestra el aviso de informacion y los errores de cada campo', async () => {
    const loginFn = vi.fn()
    const user = userEvent.setup()

    renderLogin(loginFn)
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    const summary = await screen.findByRole('alert')

    expect(summary).toHaveTextContent(MESSAGES.summaryTitle)
    expect(summary).toHaveTextContent(MESSAGES.summaryBody)
    expect(screen.getByLabelText('Correo o apodo')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('aria-invalid', 'true')
    expect(loginFn).not.toHaveBeenCalled()
  })

  it('durante el envio deshabilita el boton y lo comunica a tecnologias de apoyo', async () => {
    const user = userEvent.setup()
    let release: (outcome: LoginOutcome) => void = () => undefined

    const loginFn = vi.fn(
      () =>
        new Promise<LoginOutcome>((resolve) => {
          release = resolve
        }),
    )

    renderLogin(loginFn)
    await user.type(screen.getByLabelText('Correo o apodo'), 'ana@nexus.test')
    await user.type(screen.getByLabelText('Contraseña'), 'Nexus#2026')

    // Se toma la referencia ANTES de pulsar: en carga el boton pasa a
    // anunciarse como "Procesando...", asi que buscarlo de nuevo por su
    // nombre accesible original ya no lo encontraria.
    const button = screen.getByRole('button', { name: 'Iniciar sesión' })

    await user.click(button)

    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')

    release(PLAYER_SESSION)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Acceso completado' })).toBeInTheDocument()
    })
  })

  it('credenciales invalidas muestran un mensaje generico sin detalles internos', async () => {
    const user = userEvent.setup()
    const loginFn = vi.fn<() => Promise<LoginOutcome>>().mockResolvedValue({
      status: 'INVALID_CREDENTIALS',
    })

    renderLogin(loginFn)
    await user.type(screen.getByLabelText('Correo o apodo'), 'ana@nexus.test')
    await user.type(screen.getByLabelText('Contraseña'), 'incorrecta')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    const alert = await screen.findByRole('alert')

    expect(alert).toHaveTextContent('No fue posible iniciar sesión. Revisa tus credenciales.')
    expect(alert.textContent).not.toMatch(/cognito|jwt|stack|sql|excepcion/iu)
  })

  it('un fallo de transporte se presenta como error temporal, no como credenciales invalidas', async () => {
    const user = userEvent.setup()
    const loginFn = vi.fn<() => Promise<LoginOutcome>>().mockRejectedValue(new Error())

    renderLogin(loginFn)
    await user.type(screen.getByLabelText('Correo o apodo'), 'ana@nexus.test')
    await user.type(screen.getByLabelText('Contraseña'), 'Nexus#2026')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos completar el inicio de sesión en este momento.',
    )
  })

  it('no envia el formulario dos veces mientras la primera peticion esta en curso', async () => {
    const user = userEvent.setup()
    let release: (outcome: LoginOutcome) => void = () => undefined

    const loginFn = vi.fn(
      () =>
        new Promise<LoginOutcome>((resolve) => {
          release = resolve
        }),
    )

    renderLogin(loginFn)
    await user.type(screen.getByLabelText('Correo o apodo'), 'ana@nexus.test')
    await user.type(screen.getByLabelText('Contraseña'), 'Nexus#2026')

    const button = screen.getByRole('button', { name: 'Iniciar sesión' })

    await user.click(button)
    await user.click(button)
    await user.click(button)

    expect(loginFn).toHaveBeenCalledTimes(1)
    release(PLAYER_SESSION)
  })

  it.each(['PLAYER', 'MODERATOR'])(
    'credenciales validas de %s completan el login sin pasar por 2FA',
    async (role) => {
      const user = userEvent.setup()
      const loginFn = vi.fn<() => Promise<LoginOutcome>>().mockResolvedValue({
        status: 'AUTHENTICATED',
        session: {
          subject: 'sujeto-1',
          email: 'persona@nexus.test',
          displayName: 'Persona',
          roles: [role],
          accessToken: 'token',
          expiresAt: Date.now() + 900_000,
        },
      })

      renderLoginWithRouter(loginFn)
      await user.type(screen.getByLabelText('Correo o apodo'), 'persona@nexus.test')
      await user.type(screen.getByLabelText('Contraseña'), 'Nexus#2026')
      await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

      expect(await screen.findByText('Landing de E-commerce')).toBeInTheDocument()
      expect(useSession.getState().subject).toBe('sujeto-1')
      expect(useSession.getState().roles).toEqual([role])
    },
  )

  it.each(['ADMINISTRATOR', 'SUPER_ADMINISTRATOR'])(
    'credenciales validas de %s exigen segundo factor antes de completar el acceso',
    async (role) => {
      const user = userEvent.setup()
      const loginFn = vi.fn<() => Promise<LoginOutcome>>().mockResolvedValue({
        status: 'MFA_REQUIRED',
        challenge: { challengeId: `reto-${role}` },
      })

      renderLoginWithRouter(loginFn)
      await user.type(screen.getByLabelText('Correo o apodo'), 'admin@nexus.test')
      await user.type(screen.getByLabelText('Contraseña'), 'Nexus#2026')
      await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

      expect(
        await screen.findByRole('heading', { level: 1, name: 'Verificación adicional' }),
      ).toBeInTheDocument()
      // Ninguna operacion administrativa se habilita: no hay sesion todavia.
      expect(useSession.getState().subject).toBeNull()
      expect(screen.queryByText('Landing de E-commerce')).not.toBeInTheDocument()
    },
  )

  it('un codigo de segundo factor rechazado no habilita el acceso', async () => {
    const user = userEvent.setup()
    const loginFn = vi.fn<() => Promise<LoginOutcome>>().mockResolvedValue({
      status: 'MFA_REQUIRED',
      challenge: { challengeId: 'reto-1' },
    })
    const verifyMfaCodeFn = vi.fn<() => Promise<LoginOutcome>>().mockResolvedValue({
      status: 'INVALID_CREDENTIALS',
    })

    renderLoginWithRouter(loginFn, verifyMfaCodeFn)
    await user.type(screen.getByLabelText('Correo o apodo'), 'admin@nexus.test')
    await user.type(screen.getByLabelText('Contraseña'), 'Nexus#2026')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    await screen.findByRole('heading', { level: 1, name: 'Verificación adicional' })

    await user.type(screen.getByLabelText('Código de verificación'), '000000')
    await user.click(screen.getByRole('button', { name: 'Verificar código' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El código no es válido o ya expiró.',
    )
    expect(useSession.getState().subject).toBeNull()
  })

  it('un codigo de segundo factor valido completa el acceso y redirige a E-commerce', async () => {
    const user = userEvent.setup()
    const loginFn = vi.fn<() => Promise<LoginOutcome>>().mockResolvedValue({
      status: 'MFA_REQUIRED',
      challenge: { challengeId: 'reto-1' },
    })
    const verifyMfaCodeFn = vi.fn<() => Promise<LoginOutcome>>().mockResolvedValue({
      status: 'AUTHENTICATED',
      session: {
        subject: 'sujeto-admin',
        email: 'admin@nexus.test',
        displayName: 'Admin',
        roles: ['ADMINISTRATOR'],
        accessToken: 'token',
        expiresAt: Date.now() + 900_000,
      },
    })

    renderLoginWithRouter(loginFn, verifyMfaCodeFn)
    await user.type(screen.getByLabelText('Correo o apodo'), 'admin@nexus.test')
    await user.type(screen.getByLabelText('Contraseña'), 'Nexus#2026')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    await screen.findByRole('heading', { level: 1, name: 'Verificación adicional' })

    await user.type(screen.getByLabelText('Código de verificación'), '123456')
    await user.click(screen.getByRole('button', { name: 'Verificar código' }))

    expect(await screen.findByText('Landing de E-commerce')).toBeInTheDocument()
    expect(useSession.getState().subject).toBe('sujeto-admin')
    expect(useSession.getState().roles).toEqual(['ADMINISTRATOR'])
  })

  it('un segundo factor vacio se valida localmente antes de llamar al servicio', async () => {
    const user = userEvent.setup()
    const loginFn = vi.fn<() => Promise<LoginOutcome>>().mockResolvedValue({
      status: 'MFA_REQUIRED',
      challenge: { challengeId: 'reto-1' },
    })
    const verifyMfaCodeFn = vi.fn()

    renderLogin(loginFn, verifyMfaCodeFn)
    await user.type(screen.getByLabelText('Correo o apodo'), 'admin@nexus.test')
    await user.type(screen.getByLabelText('Contraseña'), 'Nexus#2026')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    await screen.findByRole('heading', { level: 1, name: 'Verificación adicional' })
    await user.click(screen.getByRole('button', { name: 'Verificar código' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(MESSAGES.summaryBody)
    expect(verifyMfaCodeFn).not.toHaveBeenCalled()
  })
})
