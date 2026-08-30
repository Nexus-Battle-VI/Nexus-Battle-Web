import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { RequireIdentity } from './RequireIdentity'
import { renderWithProviders } from '@/test/render'
import { useSession } from '@/shared/session'

const signUpOriginal = useSession.getState().signUp

afterEach(() => {
  useSession.setState({ subject: null, authenticationAvailable: false, signUp: signUpOriginal })
  vi.restoreAllMocks()
})

describe('RequireIdentity', () => {
  it('deja pasar cuando ya hay identidad', () => {
    useSession.setState({ authenticationAvailable: true, subject: 'sujeto-1' })

    renderWithProviders(
      <RequireIdentity>
        <p>Formulario de registro</p>
      </RequireIdentity>,
    )

    expect(screen.getByText('Formulario de registro')).toBeInTheDocument()
  })

  /**
   * El fallo que esto arregla, tal cual ocurrio: el boton "Crear cuenta" de la
   * landing era un enlace directo a /register, asi que alguien sin identidad
   * rellenaba nombres, apellidos, apodo, contrasena, avatar y cuatro preguntas
   * de seguridad para recibir al final "Falta el testimonio de identidad".
   *
   * `POST /api/accounts` exige testimonio y responde 401 sin el.
   */
  it('NO muestra el formulario a quien no tiene identidad', () => {
    useSession.setState({ authenticationAvailable: true, subject: null })

    renderWithProviders(
      <RequireIdentity>
        <p>Formulario de registro</p>
      </RequireIdentity>,
    )

    expect(screen.queryByText('Formulario de registro')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Primero, tu identidad' })).toBeVisible()
  })

  /**
   * Se afirma la RUTA de retorno, no solo que se llamo. Con el `returnTo` por
   * defecto se volveria a donde se pulso -que aqui es la propia /register, pero
   * dejarlo implicito hace que un cambio en el destino pase inadvertido-, y ese
   * fue exactamente el fallo de `SessionControl` que ya hubo que corregir.
   */
  it('el alta vuelve a /register, donde la sesion ya sirve', async () => {
    const signUp = vi.fn()
    useSession.setState({ authenticationAvailable: true, subject: null, signUp })

    renderWithProviders(
      <RequireIdentity>
        <p>Formulario de registro</p>
      </RequireIdentity>,
    )

    await userEvent.click(screen.getByTestId('start-identity-sign-up'))

    expect(signUp).toHaveBeenCalledWith('/register')
  })

  /**
   * Sin proveedor no hay identidad posible. Ofrecer un boton que no puede
   * funcionar es peor que no ofrecerlo: sugiere que hay un camino donde no lo
   * hay. Mismo criterio que `SessionControl`.
   */
  it('no ofrece un boton que no puede funcionar sin proveedor', () => {
    useSession.setState({ authenticationAvailable: false, subject: null })

    renderWithProviders(
      <RequireIdentity>
        <p>Formulario de registro</p>
      </RequireIdentity>,
    )

    expect(screen.queryByTestId('start-identity-sign-up')).not.toBeInTheDocument()
    expect(screen.getByText(/no tiene proveedor de identidad configurado/i)).toBeInTheDocument()
  })
})
