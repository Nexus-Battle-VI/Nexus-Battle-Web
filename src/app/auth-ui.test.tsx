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

    expect(screen.getByRole('button', { name: /iniciar sesion/i })).toBeInTheDocument()
  })

  /**
   * Account dejo de crear identidades: exige un sujeto ya verificado. Sin una
   * entrada de alta, quien no tiene cuenta no tiene por donde empezar.
   */
  it('ofrece crear cuenta, que es la unica via para tener una', async () => {
    const signUp = vi.fn()
    useSession.setState({ authenticationAvailable: true, signUp })

    renderWithProviders(<SessionControl />)

    await userEvent.click(screen.getByRole('button', { name: /crear cuenta/i }))

    expect(signUp).toHaveBeenCalledOnce()
  })

  /**
   * Comprobado contra el sistema desplegado antes de escribirlo: con el
   * `returnTo` por defecto se volvia al catalogo, y desde ahi no hay forma de
   * alcanzar el formulario de HU-01 con la sesion viva. No hay enlace hacia el,
   * y escribir la direccion recarga la pagina, que borra el testimonio porque
   * `session.ts` lo guarda en memoria. La persona quedaba registrada en Cognito,
   * sin cuenta, y el formulario respondia "Falta el testimonio de identidad".
   *
   * Por eso se afirma la RUTA y no solo que se llamo: `toHaveBeenCalledOnce`
   * seguia pasando con el destino equivocado, que es el fallo que hubo.
   */
  it('devuelve al formulario de alta, no a donde se pulso el boton', async () => {
    const signUp = vi.fn()
    useSession.setState({ authenticationAvailable: true, signUp })

    renderWithProviders(<SessionControl />)

    await userEvent.click(screen.getByRole('button', { name: /crear cuenta/i }))

    expect(signUp).toHaveBeenCalledWith('/register')
  })

  /**
   * El control del caso anterior. Iniciar sesion NO debe redirigir al alta:
   * quien ya tiene cuenta tiene que volver a donde estaba. Si ambos fueran a
   * `/register`, la prueba de arriba pasaria sin distinguir nada.
   */
  it('iniciar sesion no desvia al alta: devuelve a donde se estaba', async () => {
    const signIn = vi.fn()
    useSession.setState({ authenticationAvailable: true, signIn })

    renderWithProviders(<SessionControl />)

    await userEvent.click(screen.getByRole('button', { name: /iniciar sesion/i }))

    expect(signIn).toHaveBeenCalledWith()
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

  it('muestra a quien esta identificado y permite cerrar sesion', async () => {
    useSession.setState({
      authenticationAvailable: true,
      subject: 'sujeto-ana',
      displayName: 'Ana Ramirez',
      accessToken: 'token',
    })

    const signOut = vi.fn()
    useSession.setState({ signOut })

    renderWithProviders(<SessionControl />)

    expect(screen.getByText('Ana Ramirez')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /cerrar sesion/i }))

    expect(signOut).toHaveBeenCalledOnce()
  })

  it('recurre al sujeto cuando el proveedor no aporta nombre visible', () => {
    useSession.setState({
      authenticationAvailable: true,
      subject: 'sujeto-ana',
      displayName: null,
      accessToken: 'token',
    })

    renderWithProviders(<SessionControl />)

    expect(screen.getByText('sujeto-ana')).toBeInTheDocument()
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
