import { describe, expect, it } from 'vitest'

import { MissingContractError, login, verifyMfaCode } from './api'

/**
 * Estas pruebas fijan una decision: mientras `Nexus-Battle-Account` no
 * publique el contrato de autenticacion de HU-02 (verificado: su rama
 * `feature/HU-02-login-rbac` es identica a `main`), ninguna operacion puede
 * resolver con exito. Si alguien conecta un endpoint inventado para "dejarlo
 * funcionando", estas pruebas fallan.
 */
describe('Transporte del login', () => {
  it('no autentica mientras no exista contrato de servicio', async () => {
    await expect(
      login({ identifier: 'ana@nexus.test', password: 'Nexus#2026' }),
    ).rejects.toBeInstanceOf(MissingContractError)
  })

  it('nombra la operacion pendiente en lugar de fallar en generico', async () => {
    const error: unknown = await login({ identifier: 'ana', password: 'x' }).catch(
      (reason: unknown) => reason,
    )

    expect(error).toBeInstanceOf(MissingContractError)
    expect((error as MissingContractError).operation).toBe('inicio de sesion')
    expect((error as MissingContractError).message).toMatch(/HU-02/u)
  })

  it('no verifica el segundo factor mientras no exista contrato de servicio', async () => {
    await expect(verifyMfaCode('reto-1', '123456')).rejects.toBeInstanceOf(MissingContractError)
  })
})
