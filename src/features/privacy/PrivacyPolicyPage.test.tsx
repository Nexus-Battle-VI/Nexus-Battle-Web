import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '@/test/render'
import { PrivacyPolicyPage } from './PrivacyPolicyPage'
import { POLICY_META, POLICY_SECTIONS } from './content'

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

  it('muestra la metadata real del documento fuente, no un valor inventado', () => {
    renderWithProviders(<PrivacyPolicyPage />, { route: '/privacy' })

    expect(screen.getByText(POLICY_META.organization)).toBeInTheDocument()
    expect(screen.getByText(POLICY_META.version)).toBeInTheDocument()
  })

  /**
   * No se prueban las 19 secciones una por una -serian pruebas triviales que
   * solo repiten `content.ts`-. Se comprueba la estructura jerarquica real:
   * cada seccion es un encabezado nivel 2 propio, no texto plano indistinguible.
   */
  it('estructura cada seccion del documento como encabezado propio', () => {
    renderWithProviders(<PrivacyPolicyPage />, { route: '/privacy' })

    const headings = screen.getAllByRole('heading', { level: 2 })
    expect(headings).toHaveLength(POLICY_SECTIONS.length)
    expect(headings[0]).toHaveTextContent('1. Aspectos generales')
    expect(headings.at(-1)).toHaveTextContent('19. Vigencia y control documental')
  })

  it('incluye el contenido real sobre consentimiento y sobre el plazo de eliminacion, sin inventarlo', () => {
    renderWithProviders(<PrivacyPolicyPage />, { route: '/privacy' })

    expect(
      screen.getByText(/deberá otorgar una manifestación previa, expresa e informada/u),
    ).toBeInTheDocument()
    expect(screen.getByText(/plazo máximo de treinta \(30\) días/u)).toBeInTheDocument()
  })
})
