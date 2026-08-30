import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { TotpEnrollment } from './TotpEnrollment'
import type { TotpAssociation } from './api'

const ASSOCIATION: TotpAssociation = {
  otpauthUri:
    'otpauth://totp/Nexus%20Battles%20VI:jugador@nexus.test?secret=ABC123XYZ&issuer=Nexus',
  secret: 'ABC123XYZ',
}

describe('TotpEnrollment', () => {
  it('asocia, muestra la clave y confirma con el codigo', async () => {
    const user = userEvent.setup()
    const onEnroll = vi.fn<() => Promise<TotpAssociation>>().mockResolvedValue(ASSOCIATION)
    const onConfirm = vi.fn<(code: string) => Promise<void>>().mockResolvedValue()

    render(<TotpEnrollment onEnroll={onEnroll} onConfirm={onConfirm} />)

    await user.click(screen.getByRole('button', { name: 'Configurar autenticador' }))

    // La clave para introducir a mano se muestra: no depende del QR.
    expect(await screen.findByText('ABC123XYZ')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Codigo del autenticador'), '123456')
    await user.click(screen.getByRole('button', { name: 'Confirmar autenticador' }))

    expect(onConfirm).toHaveBeenCalledWith('123456')
    expect(await screen.findByRole('status')).toHaveTextContent(/Autenticador confirmado/u)
  })

  /**
   * El codigo mal formado se corta en el cliente: no tiene sentido molestar al
   * servicio con algo que no puede ser un TOTP.
   */
  it('rechaza un codigo que no son seis digitos sin llamar al servicio', async () => {
    const user = userEvent.setup()
    const onEnroll = vi.fn<() => Promise<TotpAssociation>>().mockResolvedValue(ASSOCIATION)
    const onConfirm = vi.fn<(code: string) => Promise<void>>().mockResolvedValue()

    render(<TotpEnrollment onEnroll={onEnroll} onConfirm={onConfirm} />)

    await user.click(screen.getByRole('button', { name: 'Configurar autenticador' }))
    await screen.findByText('ABC123XYZ')

    await user.type(screen.getByLabelText('Codigo del autenticador'), 'abcdef')
    await user.click(screen.getByRole('button', { name: 'Confirmar autenticador' }))

    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/seis digitos/u)
  })

  it('muestra el motivo cuando la asociacion falla', async () => {
    const user = userEvent.setup()
    const onEnroll = vi
      .fn<() => Promise<TotpAssociation>>()
      .mockRejectedValue(new Error('El proveedor de identidad no esta disponible.'))

    render(<TotpEnrollment onEnroll={onEnroll} onConfirm={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Configurar autenticador' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/no esta disponible/u)
    // No se paso al paso del codigo: la asociacion no llego a existir.
    expect(screen.queryByLabelText('Codigo del autenticador')).not.toBeInTheDocument()
  })

  it('muestra el error del servicio cuando el codigo se rechaza', async () => {
    const user = userEvent.setup()
    const onEnroll = vi.fn<() => Promise<TotpAssociation>>().mockResolvedValue(ASSOCIATION)
    const onConfirm = vi
      .fn<(code: string) => Promise<void>>()
      .mockRejectedValue(new Error('El codigo del autenticador no es valido.'))

    render(<TotpEnrollment onEnroll={onEnroll} onConfirm={onConfirm} />)

    await user.click(screen.getByRole('button', { name: 'Configurar autenticador' }))
    await screen.findByText('ABC123XYZ')

    await user.type(screen.getByLabelText('Codigo del autenticador'), '999999')
    await user.click(screen.getByRole('button', { name: 'Confirmar autenticador' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/no es valido/u)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
