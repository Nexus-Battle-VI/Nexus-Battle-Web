import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/test/render'

import { AuthRemasterPreview } from './AuthRemasterPreview'

/**
 * La vista previa del remaster (EN-031) monta las pantallas REALES con
 * transportes de ejemplo: cada una tiene que llegar a su contenido y recorrer
 * sus etapas sin red.
 */
describe('vista previa del remaster de Autenticacion (EN-031)', () => {
  it('abre en Login y alterna entre las tres pantallas', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AuthRemasterPreview />)

    expect(screen.getByRole('heading', { level: 1, name: 'Iniciar sesión' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Registro' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Crear cuenta' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Recuperación' }))
    expect(
      screen.getByRole('heading', { level: 1, name: 'Recuperar contraseña' }),
    ).toBeInTheDocument()
  })

  it('un identificador con «elegir» lleva a la eleccion de factor y de ahi al codigo', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AuthRemasterPreview />)

    await user.type(screen.getByLabelText('Correo o apodo'), 'jugador-elegir')
    await user.type(screen.getByLabelText('Contraseña'), 'Vista.Previa1')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    await user.click(await screen.findByText('Aplicación autenticadora'))

    expect(await screen.findByLabelText('Código de verificación')).toBeInTheDocument()
  })
})
