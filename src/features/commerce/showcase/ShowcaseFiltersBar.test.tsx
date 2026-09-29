import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '@/test/render'
import { ShowcaseFiltersBar } from './ShowcaseFiltersBar'
import { NO_FILTERS } from './api'

const renderBar = (): ReturnType<typeof renderWithProviders> =>
  renderWithProviders(<ShowcaseFiltersBar filters={NO_FILTERS} onChange={vi.fn()} />)

/*
 * El filtro de tipo (4a pasada) dejo de ser un `<select>` nativo: ahora es un
 * rail de botones reales (`role="group"`), uno por tipo, con icono PixelLab +
 * texto. Estos tests conservan la MISMA intencion -que tipo NO aparece como
 * opcion, que tipos SI y en que orden, que boton queda marcado como activo-
 * adaptada al nuevo mecanismo de interaccion (boton + `aria-pressed`, no
 * `selectOptions`).
 */
describe('El filtro de tipo solo ofrece lo que la vitrina puede vender', () => {
  /**
   * ITEM y EPICA existen en Catalog pero nunca son candidatos de compra en
   * E-commerce (ver ecommerce-integration-v1.md): no deben aparecer como
   * opcion seleccionable, ni siquiera para filtrar por ellos.
   */
  it('no ofrece Item ni Epica como opciones', () => {
    renderBar()

    const group = within(screen.getByRole('group', { name: 'Tipo de producto' }))
    expect(group.queryByRole('button', { name: 'Ítem' })).not.toBeInTheDocument()
    expect(group.queryByRole('button', { name: 'Épica' })).not.toBeInTheDocument()
  })

  it('ofrece exactamente Todos, Héroe, Habilidad, Arma y Armadura, en ese orden', () => {
    renderBar()

    const options = within(screen.getByRole('group', { name: 'Tipo de producto' })).getAllByRole(
      'button',
    )
    expect(options.map((option) => option.textContent)).toEqual([
      'Todos',
      'Héroe',
      'Habilidad',
      'Arma',
      'Armadura',
    ])
  })

  it('marca como activo solo el boton del tipo seleccionado', () => {
    renderWithProviders(<ShowcaseFiltersBar filters={{ ...NO_FILTERS, type: 'ARMA' }} onChange={vi.fn()} />)

    const group = within(screen.getByRole('group', { name: 'Tipo de producto' }))
    expect(group.getByRole('button', { name: 'Arma' })).toHaveAttribute('aria-pressed', 'true')
    expect(group.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'false')
    expect(group.getByRole('button', { name: 'Héroe' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('actualiza filters.type al pulsar un boton de categoria', async () => {
    const onChange = vi.fn()
    renderWithProviders(<ShowcaseFiltersBar filters={NO_FILTERS} onChange={onChange} />)

    await userEvent.click(screen.getByRole('button', { name: 'Héroe' }))

    expect(onChange).toHaveBeenCalledExactlyOnceWith({ ...NO_FILTERS, type: 'HEROE' })
  })
})
