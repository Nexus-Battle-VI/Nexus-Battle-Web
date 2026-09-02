import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'

import { renderWithProviders } from '@/test/render'
import { PrivacyPolicyPage } from './PrivacyPolicyPage'

describe('PrivacyPolicyPage', () => {
  it('renderiza el titulo de la Politica como encabezado principal', () => {
    renderWithProviders(<PrivacyPolicyPage />, { route: '/privacy' })

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Política de Privacidad y Tratamiento de Datos Personales',
      }),
    ).toBeInTheDocument()
  })

  it('muestra contenido real de la Politica sobre el tratamiento de datos', () => {
    renderWithProviders(<PrivacyPolicyPage />, { route: '/privacy' })

    expect(
      screen.getByText(/establece las condiciones bajo las cuales se recolecta, utiliza/u),
    ).toBeInTheDocument()
  })

  it('incluye el apartado de derechos del titular y solicitud de eliminacion', () => {
    renderWithProviders(<PrivacyPolicyPage />, { route: '/privacy' })

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /Derecho de eliminación de cuenta y datos asociados/u,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/deberá otorgar una manifestación previa, expresa e informada/u),
    ).toBeInTheDocument()
  })

  it('menciona el plazo de treinta dias para la eliminacion, porque asi lo dice la fuente', () => {
    renderWithProviders(<PrivacyPolicyPage />, { route: '/privacy' })

    expect(screen.getByText(/plazo máximo de treinta \(30\) días/u)).toBeInTheDocument()
  })

  /**
   * La pagina es un documento estatico, no una entidad funcional: dentro del
   * contenido de la Politica no hay ningun control que dispare una accion de
   * negocio (eliminar cuenta, exportar datos, etc.) aunque el texto la
   * mencione. Se acota a `main` porque el chrome de la pagina (volver, tema)
   * si trae sus propios controles legitimos, ajenos al contenido.
   */
  it('no ofrece ninguna accion funcional de eliminacion o exportacion dentro del contenido', () => {
    renderWithProviders(<PrivacyPolicyPage />, { route: '/privacy' })

    const content = within(screen.getByRole('main'))
    expect(content.queryByRole('button')).not.toBeInTheDocument()
    expect(content.queryByRole('form')).not.toBeInTheDocument()
  })
})
