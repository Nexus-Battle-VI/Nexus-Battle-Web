import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { ChevronDown } from './icons'

describe('icons', () => {
  it('renderiza ChevronDown como un icono SVG accesible desde el punto controlado', () => {
    render(<ChevronDown role="img" aria-label="Expandir opciones" />)

    const icon = screen.getByRole('img', { name: 'Expandir opciones' })

    expect(icon.tagName.toLowerCase()).toBe('svg')
  })
})
