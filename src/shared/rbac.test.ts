import { describe, expect, it } from 'vitest'

import { primaryRole } from './rbac'

describe('primaryRole', () => {
  it('elige el rol de mayor precedencia sin depender del orden recibido', () => {
    expect(primaryRole(['PLAYER', 'SUPER_ADMINISTRATOR'])).toBe('SUPER_ADMINISTRATOR')
    expect(primaryRole(['MODERATOR', 'PLAYER', 'ADMINISTRATOR'])).toBe('ADMINISTRATOR')
    expect(primaryRole(['PLAYER', 'MODERATOR'])).toBe('MODERATOR')
  })
})
