import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AuthCallbackPage } from './AuthCallbackPage'
import { SessionControl } from './SessionControl'
import { renderWithProviders } from '@/test/render'
import { useSession } from '@/shared/session'

const resetSession = (): void => {
  useSession.setState({
    subject: null,
    email: null,
    displayName: null,
    roles: [],
    accessToken: null,
    expiresAt: null,
    viaProvider: false,
  })
}

const signUpOriginal = useSession.getState().signUp
const signInOriginal = useSession.getState().signIn
const signOutOriginal = useSession.getState().signOut

afterEach(() => {
  resetSession()
  // Varias pruebas sustituyen acciones del almacen. Sin devolverlas a su sitio,
  // el doble sobrevive a la prueba que lo instalo.
  useSession.setState({
    signUp: signUpOriginal,
    signIn: signInOriginal,
    signOut: signOutOriginal,
  })
  globalThis.sessionStorage.clear()
  vi.restoreAllMocks()
})

describe('SessionControl', () => {
  /**
   * Sin proveedor configurado, ofrecer un boton de iniciar sesion que no puede
   * funcionar seria peor que no ofrecer nada: sugiere que hay autenticacion
   * donde no la hay. La interfaz lo dice.
   */
  it('declara la ausencia de proveedor en lugar de ofrecer un boton inutil', () => {
    renderWithProviders(<SessionControl />)

    expect(screen.getByTestId('auth-unavailable')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /iniciar sesion/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /crear cuenta/i })).not.toBeInTheDocument()
  })

  it('ofrece iniciar sesion cuando hay proveedor y no hay sesion', () => {
    useSession.setState({ authenticationAvailable: true })
    renderWithProviders(<SessionControl />)

    expect(screen.getByRole('link', { name: /iniciar sesion/i })).toBeInTheDocument()
  })

  /**
   * Sin una entrada de alta, quien no tiene cuenta no tiene por donde empezar.
   * Ahora es un enlace a la pantalla PROPIA de registro, no una redireccion al
   * hosted UI del proveedor.
   */
  it('ofrece crear cuenta, que lleva a la pantalla propia de registro', () => {
    useSession.setState({ authenticationAvailable: true })

    renderWithProviders(<SessionControl />)

    expect(screen.getByRole('link', { name: /crear cuenta/i })).toHaveAttribute('href', '/register')
  })

  /**
   * El control del caso anterior. Iniciar sesion NO debe llevar al alta: son dos
   * destinos distintos. Si ambos enlazaran a `/register`, la prueba de arriba
   * pasaria sin distinguir nada. Ambos van a pantallas propias, no al hosted UI.
   */
  it('iniciar sesion lleva al login propio, no al alta', () => {
    useSession.setState({ authenticationAvailable: true })

    renderWithProviders(<SessionControl />)

    expect(screen.getByRole('link', { name: /iniciar sesion/i })).toHaveAttribute('href', '/login')
  })

  it('quien ya tiene sesion no ve la entrada de alta', () => {
    useSession.setState({
      authenticationAvailable: true,
      subject: 'sujeto-ana',
      displayName: 'Ana Ramirez',
      accessToken: 'token',
    })

    renderWithProviders(<SessionControl />)

    expect(screen.queryByRole('button', { name: /crear cuenta/i })).not.toBeInTheDocument()
  })

  it('muestra el menu de cuenta de Figma con avatar y permite abrir y cerrar sesion (HU-03)', async () => {
    useSession.setState({
      authenticationAvailable: true,
      subject: 'sujeto-ana',
      displayName: 'Ana Ramirez',
      accessToken: 'token',
    })

    const signOut = vi.fn().mockResolvedValue(undefined)
    useSession.setState({ signOut })

    renderWithProviders(<SessionControl />)

    // Trigger visible con inicial y etiqueta
    const trigger = screen.getByRole('button', { name: /menú de cuenta/i })
    expect(trigger).toBeInTheDocument()
    expect(screen.getByText('Mi cuenta')).toBeInTheDocument()
    expect(screen.getByText('A')).toBeInTheDocument()

    // El dropdown inicia cerrado
    expect(screen.queryByTestId('user-menu-dropdown')).not.toBeInTheDocument()

    // Abrir menu
    await userEvent.click(trigger)
    expect(screen.getByTestId('user-menu-dropdown')).toBeInTheDocument()
    expect(screen.getByText('Ana Ramirez')).toBeInTheDocument()
    expect(screen.getByText('@ana_ramirez')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /mi perfil/i })).toHaveAttribute('href', '/account')
    expect(screen.getByRole('menuitem', { name: /mi inventario/i })).toHaveAttribute(
      'href',
      '/inventory',
    )

    // Ejecutar logout
    const logoutBtn = screen.getByRole('menuitem', { name: /cerrar sesión/i })
    await userEvent.click(logoutBtn)

    expect(signOut).toHaveBeenCalledOnce()
  })

  it('cierra el menu de cuenta al presionar Escape (accesibilidad)', async () => {
    useSession.setState({
      authenticationAvailable: true,
      subject: 'sujeto-ana',
      displayName: 'Ana',
      accessToken: 'token',
    })

    renderWithProviders(<SessionControl />)

    const trigger = screen.getByRole('button', { name: /menú de cuenta/i })
    await userEvent.click(trigger)
    expect(screen.getByTestId('user-menu-dropdown')).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByTestId('user-menu-dropdown')).not.toBeInTheDocument()
  })

  it('recurre al sujeto cuando el proveedor no aporta nombre visible', async () => {
    useSession.setState({
      authenticationAvailable: true,
      subject: 'sujeto-ana',
      displayName: null,
      accessToken: 'token',
    })

    renderWithProviders(<SessionControl />)

    const trigger = screen.getByRole('button', { name: /menú de cuenta/i })
    await userEvent.click(trigger)

    expect(screen.getByText('Jugador Nexus')).toBeInTheDocument()
  })

  /**
   * HU-02: la interfaz debe representar el rol de la sesion vigente. Esto es
   * presentacion, no autorizacion: el rol nunca lo elige quien usa la
   * aplicacion, viene de `useSession().roles`.
   */
  it('representa el rol vigente de la sesion dentro del menu (RBAC visual)', async () => {
    useSession.setState({
      authenticationAvailable: true,
      subject: 'sujeto-admin',
      displayName: 'Admin',
      accessToken: 'token',
      roles: ['ADMINISTRATOR'],
    })

    renderWithProviders(<SessionControl />)

    const trigger = screen.getByRole('button', { name: /menú de cuenta/i })
    await userEvent.click(trigger)

    expect(screen.getByText('Administrador')).toBeInTheDocument()
  })

  it('no muestra ninguna etiqueta de rol cuando la sesion no trae ninguno', async () => {
    useSession.setState({
      authenticationAvailable: true,
      subject: 'sujeto-ana',
      displayName: 'Ana',
      accessToken: 'token',
      roles: [],
    })

    renderWithProviders(<SessionControl />)

    const trigger = screen.getByRole('button', { name: /menú de cuenta/i })
    await userEvent.click(trigger)

    expect(screen.queryByText('Jugador')).not.toBeInTheDocument()
  })
})

describe('AuthCallbackPage', () => {
  /**
   * Estas pruebas se ejecutan SIN proveedor configurado, que es el estado de
   * esta compilacion. Comprueban que la pantalla falla de forma explicita en
   * lugar de quedarse colgada o de dar por buena una respuesta cualquiera.
   */
  it('rechaza una direccion que no corresponde a un inicio de sesion en curso', async () => {
    renderWithProviders(<AuthCallbackPage />, { route: '/auth/callback' })

    expect(await screen.findByText(/No se pudo iniciar sesion/i)).toBeInTheDocument()
  })

  it('informa cuando el proveedor rechaza el inicio de sesion', async () => {
    renderWithProviders(<AuthCallbackPage />, { route: '/auth/callback?error=access_denied' })

    expect(await screen.findByText(/rechazo el inicio de sesion/i)).toBeInTheDocument()
  })

  /**
   * Sin esta comprobacion, alguien podria inducir a esta pestana a completar un
   * inicio de sesion que no pidio.
   */
  it('rechaza una respuesta cuyo estado no corresponde al que envio esta pestana', async () => {
    globalThis.sessionStorage.setItem(
      'nexus.auth.pending',
      JSON.stringify({ verifier: 'v', state: 'el-que-envie', returnTo: '/' }),
    )

    renderWithProviders(<AuthCallbackPage />, {
      route: '/auth/callback?code=abc&state=otro-distinto',
    })

    await waitFor(() => {
      expect(screen.getByText(/no corresponde a la peticion/i)).toBeInTheDocument()
    })
  })

  it('no deja el material pendiente disponible tras un intento fallido', async () => {
    globalThis.sessionStorage.setItem(
      'nexus.auth.pending',
      JSON.stringify({ verifier: 'v', state: 's', returnTo: '/' }),
    )

    renderWithProviders(<AuthCallbackPage />, { route: '/auth/callback?code=abc&state=otro' })

    await waitFor(() => {
      expect(screen.getByText(/No se pudo iniciar sesion/i)).toBeInTheDocument()
    })

    expect(globalThis.sessionStorage.getItem('nexus.auth.pending')).toBeNull()
  })
})
