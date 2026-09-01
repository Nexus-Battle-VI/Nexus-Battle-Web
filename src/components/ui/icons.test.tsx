import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { ChevronDown, Eye, EyeOff, LogOut, Package, Settings, User } from './icons'

describe('icons', () => {
  it('renderiza ChevronDown como un icono SVG accesible desde el punto controlado', () => {
    render(<ChevronDown role="img" aria-label="Expandir opciones" />)

    const icon = screen.getByRole('img', { name: 'Expandir opciones' })

    expect(icon.tagName.toLowerCase()).toBe('svg')
  })

  it('renderiza LogOut como un icono SVG accesible para la accion de cerrar sesion (HU-03)', () => {
    render(<LogOut role="img" aria-label="Cerrar sesion" />)

    const icon = screen.getByRole('img', { name: 'Cerrar sesion' })

    expect(icon.tagName.toLowerCase()).toBe('svg')
  })

  it('renderiza User, Package y Settings como iconos SVG para la navegacion', () => {
    render(
      <>
        <User role="img" aria-label="Mi perfil" />
        <Package role="img" aria-label="Mi inventario" />
        <Settings role="img" aria-label="Configuracion" />
      </>,
    )

    expect(screen.getByRole('img', { name: 'Mi perfil' }).tagName.toLowerCase()).toBe('svg')
    expect(screen.getByRole('img', { name: 'Mi inventario' }).tagName.toLowerCase()).toBe('svg')
    expect(screen.getByRole('img', { name: 'Configuracion' }).tagName.toLowerCase()).toBe('svg')
  })

  it('renderiza Eye y EyeOff como iconos SVG para mostrar/ocultar contraseña (HU-05.4)', () => {
    render(
      <>
        <Eye role="img" aria-label="Mostrar contraseña" />
        <EyeOff role="img" aria-label="Ocultar contraseña" />
      </>,
    )

    expect(screen.getByRole('img', { name: 'Mostrar contraseña' }).tagName.toLowerCase()).toBe(
      'svg',
    )
    expect(screen.getByRole('img', { name: 'Ocultar contraseña' }).tagName.toLowerCase()).toBe(
      'svg',
    )
  })
})
