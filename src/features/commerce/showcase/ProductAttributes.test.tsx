import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '@/test/render'
import { ProductAttributes } from './ProductAttributes'

/*
 * 7a pasada (polish visual final): las ETIQUETAS de atributo (DAÑO, TIPO,
 * COMPATIBILIDAD...) pasan a la fuente display -mismo criterio tipografico
 * que titulos mayores- mientras los VALORES reales siguen en texto UI
 * normal, nunca al reves. Estos tests fijan ese contrato sin tocar el dato
 * que se muestra (ningun atributo se inventa ni se omite).
 */
describe('ProductAttributes — jerarquia tipografica de etiqueta vs valor', () => {
  it('renderiza un atributo escalar simple con su etiqueta y valor reales', () => {
    renderWithProviders(<ProductAttributes values={{ damage: 42 }} />)

    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('usa la fuente display solo en la etiqueta (dt), nunca en el valor (dd)', () => {
    renderWithProviders(<ProductAttributes values={{ damage: 42 }} />)

    const row = screen.getByText('42').closest('div')
    const dt = row?.querySelector('dt')
    const dd = row?.querySelector('dd')
    expect(dt?.className ?? '').toContain('font-game-display')
    expect(dd?.className ?? '').not.toContain('font-game-display')
  })

  it('no inventa atributos: solo pinta las claves que el esquema real trae', () => {
    renderWithProviders(<ProductAttributes values={{ damage: 42, armor: 10 }} />)

    expect(screen.getAllByRole('definition')).toHaveLength(2)
  })

  it('agrupa compacto en dos columnas (clase commerce-attrs) a nivel raiz', () => {
    renderWithProviders(<ProductAttributes values={{ damage: 42 }} />)

    expect(screen.getByText('42').closest('dl')).toHaveClass('commerce-attrs')
  })

  it('un grupo anidado (objeto dentro de un arreglo) no repite el grid de dos columnas', () => {
    renderWithProviders(<ProductAttributes values={{ effects: [{ damage: 5 }] }} />)

    const nestedDl = screen.getByText('5').closest('dl')
    expect(nestedDl).not.toHaveClass('commerce-attrs')
  })

  it('un booleano se muestra como Si/No, nunca como true/false crudo', () => {
    renderWithProviders(<ProductAttributes values={{ stackable: true }} />)

    expect(screen.queryByText('true')).not.toBeInTheDocument()
  })
})
