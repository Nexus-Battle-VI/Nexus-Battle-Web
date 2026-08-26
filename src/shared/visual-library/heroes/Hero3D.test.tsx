import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Hero3D } from './Hero3D'

/**
 * `jsdom` no implementa un contexto WebGL real (`canvas.getContext('webgl2')`
 * devuelve `null`), asi que incluso un heroe `READY` termina en el fallback
 * seguro dentro de esta suite. Eso es exactamente el camino que EN-026.3
 * exige probar sin GPU (ver `docs/visual-library/heroes-3d.md`, "Three.js en
 * tests"): la prueba verifica que el fallo de WebGL no lanza y que la UI
 * sigue siendo estable y accesible, no el resultado visual del canvas.
 */
describe('Hero3D', () => {
  it('identifica el contenedor con el nombre oficial de un heroe conocido, de forma accesible', async () => {
    render(<Hero3D heroId="medico" />)

    expect(await screen.findByRole('img', { name: 'Médico' })).toBeInTheDocument()
    expect(screen.getByText('Médico')).toBeInTheDocument()
  })

  it('resuelve un id desconocido a un fallback seguro, sin lanzar, y lo comunica', async () => {
    render(<Hero3D heroId="heroe-inexistente" />)

    expect(await screen.findByRole('img', { name: 'heroe-inexistente' })).toBeInTheDocument()
    expect(
      screen.getByText(/vista previa no disponible para "heroe-inexistente"/iu),
    ).toBeInTheDocument()
  })

  it('no deja el canvas visible cuando WebGL no esta disponible (fallback estable, sin excepcion)', async () => {
    render(<Hero3D heroId="guerrero-tanque" />)

    await waitFor(() => {
      expect(screen.getByRole('img', { name: 'Guerrero Tanque' })).toBeInTheDocument()
    })

    const canvas = document.querySelector('canvas')
    expect(canvas).not.toBeNull()
    expect(canvas).toHaveAttribute('hidden')
  })

  it('limpia sin lanzar al desmontarse antes de que termine la carga diferida', () => {
    const { unmount } = render(<Hero3D heroId="chaman" />)

    expect(() => {
      unmount()
    }).not.toThrow()
  })
})
