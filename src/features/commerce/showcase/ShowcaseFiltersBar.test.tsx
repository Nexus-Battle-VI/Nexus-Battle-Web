import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'

import { renderWithProviders } from '@/test/render'
import { ShowcaseFiltersBar } from './ShowcaseFiltersBar'
import { NO_FILTERS } from './api'

const renderBar = (): ReturnType<typeof renderWithProviders> =>
  renderWithProviders(<ShowcaseFiltersBar filters={NO_FILTERS} onChange={vi.fn()} />)

describe('El filtro de tipo solo ofrece lo que la vitrina puede vender', () => {
  /**
   * ITEM y EPICA existen en Catalog pero nunca son candidatos de compra en
   * E-commerce (ver ecommerce-integration-v1.md): no deben aparecer como
   * opcion seleccionable, ni siquiera para filtrar por ellos.
   */
  it('no ofrece Item ni Epica como opciones', () => {
    renderBar()

    const select = within(screen.getByLabelText('Tipo de producto'))
    expect(select.queryByRole('option', { name: 'Ítem' })).not.toBeInTheDocument()
    expect(select.queryByRole('option', { name: 'Épica' })).not.toBeInTheDocument()
  })

  it('ofrece exactamente Todos, Héroe, Habilidad, Arma y Armadura, en ese orden', () => {
    renderBar()

    const options = within(screen.getByLabelText('Tipo de producto')).getAllByRole('option')
    expect(options.map((option) => option.textContent)).toEqual([
      'Todos',
      'Héroe',
      'Habilidad',
      'Arma',
      'Armadura',
    ])
  })
})
