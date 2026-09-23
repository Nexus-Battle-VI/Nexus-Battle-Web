import { describe, expect, it } from 'vitest'

import { avatarPathForSubject } from './avatar'

describe('avatarPathForSubject', () => {
  it('construye la ruta autenticada de Account por sujeto', () => {
    expect(avatarPathForSubject('0a1b2c3d-sujeto')).toBe(
      '/accounts/by-subject/0a1b2c3d-sujeto/avatar',
    )
  })

  it('codifica el sujeto: nunca rompe la ruta', () => {
    expect(avatarPathForSubject('sub:ana@nexus.test')).toBe(
      '/accounts/by-subject/sub%3Aana%40nexus.test/avatar',
    )
    expect(avatarPathForSubject('a/../b')).toBe('/accounts/by-subject/a%2F..%2Fb/avatar')
  })

  it('sin sujeto (IA) no hay avatar', () => {
    expect(avatarPathForSubject(null)).toBeNull()
    expect(avatarPathForSubject(undefined)).toBeNull()
    expect(avatarPathForSubject('  ')).toBeNull()
  })
})
