import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ProfileSection } from './ProfileSection'
import { FIXTURE_ACCOUNT, renderAccountSection } from './testRender'
import type { OwnAccount } from './api'

const ok = (account: OwnAccount) => vi.fn().mockResolvedValue(account)

describe('ProfileSection', () => {
  it('muestra correo, nombres y estado como solo lectura (no como campos)', () => {
    renderAccountSection(<ProfileSection save={ok(FIXTURE_ACCOUNT)} />)

    expect(screen.getByText('ana@nexus.test')).toBeInTheDocument()
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('Ramirez')).toBeInTheDocument()
    expect(screen.getByText('Activa')).toBeInTheDocument()

    // El correo no es un control editable.
    expect(screen.queryByLabelText('Correo electronico')).not.toBeInTheDocument()
  })

  it('el apodo es editable y arranca con el valor de la cuenta', () => {
    renderAccountSection(<ProfileSection save={ok(FIXTURE_ACCOUNT)} />)

    expect(screen.getByLabelText('Apodo')).toHaveValue('Ana Ramirez')
  })

  it('deshabilita "Guardar cambios" mientras el apodo no cambia', () => {
    renderAccountSection(<ProfileSection save={ok(FIXTURE_ACCOUNT)} />)

    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled()
  })

  it('valida la forma del apodo en el cliente sin llamar al backend', async () => {
    const user = userEvent.setup()
    const save = ok(FIXTURE_ACCOUNT)
    renderAccountSection(<ProfileSection save={save} />)

    const input = screen.getByLabelText('Apodo')
    await user.clear(input)
    await user.type(input, 'ab')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/entre 3 y 32/u)
    expect(save).not.toHaveBeenCalled()
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('confirma el guardado solo tras la respuesta del backend', async () => {
    const user = userEvent.setup()
    const save = vi.fn().mockResolvedValue({ ...FIXTURE_ACCOUNT, displayName: 'Ana Nueva' })
    renderAccountSection(<ProfileSection save={save} />)

    const input = screen.getByLabelText('Apodo')
    await user.clear(input)
    await user.type(input, 'Ana Nueva')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(save).toHaveBeenCalledWith({ displayName: 'Ana Nueva' })
    expect(await screen.findByRole('status')).toHaveTextContent('Cambios guardados correctamente.')
  })

  it('muestra el mensaje del backend cuando el guardado falla', async () => {
    const user = userEvent.setup()
    const save = vi.fn().mockRejectedValue(new Error('El apodo ya esta en uso.'))
    renderAccountSection(<ProfileSection save={save} />)

    const input = screen.getByLabelText('Apodo')
    await user.clear(input)
    await user.type(input, 'Duplicado')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('El apodo ya esta en uso.')
    })
  })
})
