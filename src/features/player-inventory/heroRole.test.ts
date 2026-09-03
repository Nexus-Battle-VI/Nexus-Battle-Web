import { describe, expect, it } from 'vitest'

import { heroRoleLabel } from './heroRole'

describe('Etiqueta de rol del héroe (HU-07)', () => {
  it('usa la etiqueta aprobada para los prototipos iniciales', () => {
    expect(heroRoleLabel('GUERRERO_TANQUE')).toBe('Tanque')
    expect(heroRoleLabel('GUERRERO_ARMAS')).toBe('Guerrero')
    expect(heroRoleLabel('MAGO_FUEGO')).toBe('Mago')
    expect(heroRoleLabel('PICARO_MACHETE')).toBe('Pícaro')
    expect(heroRoleLabel('CHAMAN')).toBe('Soporte')
    expect(heroRoleLabel('MEDICO')).toBe('Soporte')
  })

  /**
   * CONTROL DE CA-11: el mapa no es una lista cerrada. Un subtipo que no está
   * en él se deriva del código en lugar de dejar un hueco, de modo que un
   * noveno héroe aprobado se presenta sin añadir una rama por héroe.
   */
  it('deriva la etiqueta de un subtipo que no conoce', () => {
    expect(heroRoleLabel('DRUIDA_BOSQUE')).toBe('Druida')
    expect(heroRoleLabel('nigromante')).toBe('Nigromante')
  })

  it('no revienta con un subtipo vacío', () => {
    expect(heroRoleLabel('')).toBe('—')
  })
})
