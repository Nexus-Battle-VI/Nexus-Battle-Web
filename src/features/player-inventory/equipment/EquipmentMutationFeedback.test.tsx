import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { HttpError } from '@/lib/http'
import { EquipmentMutationFeedback } from './EquipmentMutationFeedback'

describe('EquipmentMutationFeedback (HU-29)', () => {
  it('distingue el contrato 409 + battle_lock y explica que el equipo no cambio', () => {
    const error = new HttpError(
      409,
      'No se puede modificar el equipamiento porque el héroe participa en una batalla activa.',
      { reason: 'battle_lock' },
    )

    render(<EquipmentMutationFeedback error={error} />)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Equipamiento protegido durante la batalla')
    expect(alert).toHaveTextContent('participa en una batalla activa')
    expect(alert).toHaveTextContent('se mantienen sin cambios')
  })

  it('no confunde otro conflicto 409 con el bloqueo de batalla', () => {
    const error = new HttpError(409, 'La ranura WEAPON_1 ya está ocupada.', {
      reason: 'slot_occupied',
    })

    render(<EquipmentMutationFeedback error={error} />)

    expect(screen.getByRole('alert')).toHaveTextContent('La ranura WEAPON_1 ya está ocupada.')
    expect(screen.queryByText('Equipamiento protegido durante la batalla')).toBeNull()
  })

  it('exige tambien el estado 409 aunque el cuerpo contenga battle_lock', () => {
    const error = new HttpError(503, 'Estado de batalla no disponible.', {
      reason: 'battle_lock',
    })

    render(<EquipmentMutationFeedback error={error} />)

    expect(screen.getByRole('alert')).toHaveTextContent('Estado de batalla no disponible.')
    expect(screen.queryByText('Equipamiento protegido durante la batalla')).toBeNull()
  })

  it('usa un mensaje seguro para errores no HTTP y no renderiza sin error', () => {
    const { rerender } = render(<EquipmentMutationFeedback error={new Error('interno')} />)

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No se pudo equipar el producto. Inténtalo de nuevo.',
    )

    rerender(<EquipmentMutationFeedback error={null} />)
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
