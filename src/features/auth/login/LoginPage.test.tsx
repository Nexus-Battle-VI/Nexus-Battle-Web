import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'

import { createTestQueryClient, renderWithProviders } from '@/test/render'
import { HttpError } from '@/lib/http'
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
    expiresAt: Date.now() + 3_600_000,
  },
}

const unauthorized = (message: string): HttpError => new HttpError(401, message, { message })
const serviceUnavailable = (): HttpError =>
  new HttpError(503, 'El proveedor de identidad no esta disponible.', null)

const renderLogin = (
  loginFn?: () => Promise<LoginOutcome>,
  completeSecondFactorFn?: () => Promise<LoginOutcome>,
) =>
  renderWithProviders(
    <LoginPage
      {...(loginFn === undefined ? {} : { loginFn })}
      {...(completeSecondFactorFn === undefined ? {} : { completeSecondFactorFn })}
    />,
    { route: '/login' },
  )

/** Para las pruebas que necesitan observar una navegacion real hacia /ecommerce. */
const renderLoginWithRouter = (
  loginFn?: () => Promise<LoginOutcome>,
  completeSecondFactorFn?: () => Promise<LoginOutcome>,
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
                {...(completeSecondFactorFn === undefined ? {} : { completeSecondFactorFn })}
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

  it('ofrece "Volver al menú" hacia la raiz publica', () => {
    renderLogin()

    expect(screen.getByRole('link', { name: '← Volver al menú' })).toHaveAttribute('href', '/')
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

  it('envia identifier y password tal cual los escribio la persona', async () => {
    const user = userEvent.setup()
    const loginFn = vi.fn<() => Promise<LoginOutcome>>().mockResolvedValue(PLAYER_SESSION)

    renderLogin(loginFn)
    await user.type(screen.getByLabelText('Correo o apodo'), 'ana@nexus.test')
    await user.type(screen.getByLabelText('Contraseña'), 'Nexus#2026')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    await waitFor(() => {
      expect(loginFn).toHaveBeenCalledWith({
        identifier: 'ana@nexus.test',
        password: 'Nexus#2026',
      })
    })
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

  it('credenciales invalidas (401) muestran un mensaje generico sin detalles internos', async () => {
    const user = userEvent.setup()
    const loginFn = vi
      .fn<() => Promise<LoginOutcome>>()
      .mockRejectedValue(unauthorized('Las credenciales no son validas.'))

    renderLogin(loginFn)
    await user.type(screen.getByLabelText('Correo o apodo'), 'ana@nexus.test')
    await user.type(screen.getByLabelText('Contraseña'), 'incorrecta')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    const alert = await screen.findByRole('alert')

    expect(alert).toHaveTextContent('No fue posible iniciar sesión. Revisa tus credenciales.')
    expect(alert.textContent).not.toMatch(/cognito|jwt|stack|sql|excepcion|validas/iu)
  })

  it('no distingue visualmente correo inexistente de contrasena incorrecta (ambos son 401)', async () => {
    const user = userEvent.setup()
    const loginFn = vi
      .fn<() => Promise<LoginOutcome>>()
      .mockRejectedValue(unauthorized('Las credenciales no son validas.'))

    renderLogin(loginFn)
    await user.type(screen.getByLabelText('Correo o apodo'), 'no-existe@nexus.test')
    await user.type(screen.getByLabelText('Contraseña'), 'cualquiera')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    // El mismo texto generico que para una contrasena incorrecta: no hay
    // forma de distinguir "no existe" de "clave mala" desde la UI.
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No fue posible iniciar sesión. Revisa tus credenciales.',
    )
  })

  it('un fallo de proveedor (503) se presenta como error temporal, no como credenciales invalidas', async () => {
    const user = userEvent.setup()
    const loginFn = vi.fn<() => Promise<LoginOutcome>>().mockRejectedValue(serviceUnavailable())

    renderLogin(loginFn)
    await user.type(screen.getByLabelText('Correo o apodo'), 'ana@nexus.test')
    await user.type(screen.getByLabelText('Contraseña'), 'Nexus#2026')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    const alert = await screen.findByRole('alert')

    expect(alert).toHaveTextContent('No pudimos completar el inicio de sesión en este momento.')
    expect(alert.textContent).not.toMatch(/credenciales/iu)
  })

  it('un fallo de red generico tambien se presenta como error temporal', async () => {
    const user = userEvent.setup()
    const loginFn = vi
      .fn<() => Promise<LoginOutcome>>()
      .mockRejectedValue(new TypeError('Failed to fetch'))

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
    'credenciales validas de %s completan el login sin pasar por segundo factor',
    async (role) => {
      const user = userEvent.setup()
      const expiresAt = Date.now() + 3_600_000
      const loginFn = vi.fn<() => Promise<LoginOutcome>>().mockResolvedValue({
        status: 'AUTHENTICATED',
        session: {
          subject: 'sujeto-1',
          email: 'persona@nexus.test',
          displayName: 'Persona',
          roles: [role],
          accessToken: 'token',
          expiresAt,
        },
      })

      renderLoginWithRouter(loginFn)
      await user.type(screen.getByLabelText('Correo o apodo'), 'persona@nexus.test')
      await user.type(screen.getByLabelText('Contraseña'), 'Nexus#2026')
      await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

      expect(await screen.findByText('Landing de E-commerce')).toBeInTheDocument()
      expect(useSession.getState().subject).toBe('sujeto-1')
      expect(useSession.getState().roles).toEqual([role])
      expect(useSession.getState().expiresAt).toBe(expiresAt)
      // El shell autenticado depende de esta bandera para no mostrar "Sin
      // proveedor de identidad" pese a haber una sesion real: el login de
      // credenciales de HU-02 es un medio de autenticacion independiente del
      // proveedor OIDC.
      expect(useSession.getState().authenticationAvailable).toBe(true)
    },
  )

  it.each(['ADMINISTRATOR', 'SUPER_ADMINISTRATOR'])(
    'credenciales validas de %s exigen segundo factor antes de completar el acceso',
    async (role) => {
      const user = userEvent.setup()
      const loginFn = vi.fn<() => Promise<LoginOutcome>>().mockResolvedValue({
        status: 'SECOND_FACTOR_REQUIRED',
        challengeToken: `reto-${role}`,
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

  /**
   * La pantalla anunciaba SIEMPRE "te enviamos un codigo por correo
   * electronico". El pool reta con la aplicacion autenticadora y no envia
   * ningun correo, asi que mandaba a revisar un buzon vacio. Se detecto
   * entrando de verdad, no con una prueba.
   *
   * Se afirma el texto que corresponde Y que el equivocado NO aparece: sin lo
   * segundo, una frase que mencionara los dos canales pasaria igual.
   */
  it('anuncia la aplicacion autenticadora cuando el reto es TOTP', async () => {
    const user = userEvent.setup()
    const loginFn = vi.fn<() => Promise<LoginOutcome>>().mockResolvedValue({
      status: 'SECOND_FACTOR_REQUIRED',
      challengeToken: 'reto-totp',
      secondFactorMethod: 'AUTHENTICATOR_APP',
    })

    renderLoginWithRouter(loginFn)
    await user.type(screen.getByLabelText('Correo o apodo'), 'admin@nexus.test')
    await user.type(screen.getByLabelText('Contraseña'), 'Nexus#2026')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByText(/aplicación autenticadora/i)).toBeInTheDocument()
    expect(screen.queryByText(/por correo electrónico/i)).not.toBeInTheDocument()
  })

  /**
   * Sin esta etapa, activar un segundo factor adicional rompia el inicio de
   * sesion: Cognito emite `SELECT_MFA_TYPE` cuando hay mas de un factor
   * inscrito, y Account lo trataba -bien- como fallo del proveedor.
   *
   * Se afirma que aparece UNA opcion POR factor ofrecido, no que exista la
   * pantalla: un selector con un solo boton fijo pasaria una prueba de
   * "aparece el titulo" sin servir para nada.
   */
  it('ofrece una opcion por cada factor que el proveedor admite', async () => {
    const user = userEvent.setup()
    const loginFn = vi.fn<() => Promise<LoginOutcome>>().mockResolvedValue({
      status: 'SECOND_FACTOR_SELECTION_REQUIRED',
      challengeToken: 'seleccion',
      availableSecondFactors: ['AUTHENTICATOR_APP', 'EMAIL'],
    })

    renderLoginWithRouter(loginFn)
    await user.type(screen.getByLabelText('Correo o apodo'), 'admin@nexus.test')
    await user.type(screen.getByLabelText('Contraseña'), 'Nexus#2026')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Elige cómo verificarte' }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('choose-factor-AUTHENTICATOR_APP')).toBeInTheDocument()
    expect(screen.getByTestId('choose-factor-EMAIL')).toBeInTheDocument()
    // El que NO se ofrecio no debe aparecer: la pantalla muestra lo que el
    // proveedor admite, no el catalogo completo de factores.
    expect(screen.queryByTestId('choose-factor-SMS')).not.toBeInTheDocument()
  })

  /**
   * Elegir NO autentica. Lo que devuelve es el reto del factor elegido, y la
   * pantalla debe pasar a pedir el codigo, no a dar acceso. Es la misma
   * propiedad que protege CA-06 en Account, comprobada de este lado.
   */
  it('elegir un factor lleva a pedir el codigo, no a la sesion', async () => {
    const user = userEvent.setup()
    const loginFn = vi.fn<() => Promise<LoginOutcome>>().mockResolvedValue({
      status: 'SECOND_FACTOR_SELECTION_REQUIRED',
      challengeToken: 'seleccion',
      availableSecondFactors: ['AUTHENTICATOR_APP', 'EMAIL'],
    })

    renderLoginWithRouter(loginFn)
    await user.type(screen.getByLabelText('Correo o apodo'), 'admin@nexus.test')
    await user.type(screen.getByLabelText('Contraseña'), 'Nexus#2026')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    await screen.findByTestId('choose-factor-EMAIL')

    // No hay sesion todavia, que es lo que de verdad importa.
    expect(useSession.getState().subject).toBeNull()
    expect(screen.queryByText('Landing de E-commerce')).not.toBeInTheDocument()
  })

  /**
   * El control del caso anterior: con el correo como canal, el mensaje debe
   * cambiar. Si no cambiara, la prueba de arriba pasaria por una frase fija.
   */
  it('anuncia el correo cuando el reto SI es por correo', async () => {
    const user = userEvent.setup()
    const loginFn = vi.fn<() => Promise<LoginOutcome>>().mockResolvedValue({
      status: 'SECOND_FACTOR_REQUIRED',
      challengeToken: 'reto-correo',
      secondFactorMethod: 'EMAIL',
    })

    renderLoginWithRouter(loginFn)
    await user.type(screen.getByLabelText('Correo o apodo'), 'admin@nexus.test')
    await user.type(screen.getByLabelText('Contraseña'), 'Nexus#2026')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByText(/por correo electrónico/i)).toBeInTheDocument()
    expect(screen.queryByText(/aplicación autenticadora/i)).not.toBeInTheDocument()
  })

  /**
   * Un Account anterior a este contrato no envia el canal. La pantalla no debe
   * inventarlo: pide el codigo sin nombrar de donde sale.
   */
  it('no nombra ningun canal cuando Account no lo declara', async () => {
    const user = userEvent.setup()
    const loginFn = vi.fn<() => Promise<LoginOutcome>>().mockResolvedValue({
      status: 'SECOND_FACTOR_REQUIRED',
      challengeToken: 'reto-sin-canal',
    })

    renderLoginWithRouter(loginFn)
    await user.type(screen.getByLabelText('Correo o apodo'), 'admin@nexus.test')
    await user.type(screen.getByLabelText('Contraseña'), 'Nexus#2026')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByText(/Ingresa el código de verificación/i)).toBeInTheDocument()
    expect(screen.queryByText(/por correo electrónico/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/aplicación autenticadora/i)).not.toBeInTheDocument()
  })

  it('un codigo de segundo factor rechazado (401) no habilita el acceso', async () => {
    const user = userEvent.setup()
    const loginFn = vi.fn<() => Promise<LoginOutcome>>().mockResolvedValue({
      status: 'SECOND_FACTOR_REQUIRED',
      challengeToken: 'reto-1',
    })
    const completeSecondFactorFn = vi
      .fn<() => Promise<LoginOutcome>>()
      .mockRejectedValue(unauthorized('El segundo factor no es valido o ha expirado.'))

    renderLoginWithRouter(loginFn, completeSecondFactorFn)
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

  it('envia identifier, challengeToken y code al completar el segundo factor', async () => {
    const user = userEvent.setup()
    const loginFn = vi.fn<() => Promise<LoginOutcome>>().mockResolvedValue({
      status: 'SECOND_FACTOR_REQUIRED',
      challengeToken: 'reto-1',
    })
    const completeSecondFactorFn = vi.fn<() => Promise<LoginOutcome>>().mockResolvedValue({
      status: 'AUTHENTICATED',
      session: {
        subject: 'sujeto-admin',
        email: 'admin@nexus.test',
        displayName: 'Admin',
        roles: ['ADMINISTRATOR'],
        accessToken: 'token',
        expiresAt: Date.now() + 3_600_000,
      },
    })

    renderLoginWithRouter(loginFn, completeSecondFactorFn)
    await user.type(screen.getByLabelText('Correo o apodo'), 'admin@nexus.test')
    await user.type(screen.getByLabelText('Contraseña'), 'Nexus#2026')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    await screen.findByRole('heading', { level: 1, name: 'Verificación adicional' })

    await user.type(screen.getByLabelText('Código de verificación'), '123456')
    await user.click(screen.getByRole('button', { name: 'Verificar código' }))

    await waitFor(() => {
      expect(completeSecondFactorFn).toHaveBeenCalledWith('admin@nexus.test', 'reto-1', '123456')
    })
  })

  it('un codigo de segundo factor valido completa el acceso y redirige a E-commerce', async () => {
    const user = userEvent.setup()
    const loginFn = vi.fn<() => Promise<LoginOutcome>>().mockResolvedValue({
      status: 'SECOND_FACTOR_REQUIRED',
      challengeToken: 'reto-1',
    })
    const completeSecondFactorFn = vi.fn<() => Promise<LoginOutcome>>().mockResolvedValue({
      status: 'AUTHENTICATED',
      session: {
        subject: 'sujeto-admin',
        email: 'admin@nexus.test',
        displayName: 'Admin',
        roles: ['ADMINISTRATOR'],
        accessToken: 'token',
        expiresAt: Date.now() + 3_600_000,
      },
    })

    renderLoginWithRouter(loginFn, completeSecondFactorFn)
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
      status: 'SECOND_FACTOR_REQUIRED',
      challengeToken: 'reto-1',
    })
    const completeSecondFactorFn = vi.fn()

    renderLogin(loginFn, completeSecondFactorFn)
    await user.type(screen.getByLabelText('Correo o apodo'), 'admin@nexus.test')
    await user.type(screen.getByLabelText('Contraseña'), 'Nexus#2026')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    await screen.findByRole('heading', { level: 1, name: 'Verificación adicional' })
    await user.click(screen.getByRole('button', { name: 'Verificar código' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(MESSAGES.summaryBody)
    expect(completeSecondFactorFn).not.toHaveBeenCalled()
  })
})
