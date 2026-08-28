import { describe, expect, it } from 'vitest'

import { createVisualResourceRegistry } from '../registry'
import { resolveVisualResource } from '../resolve-visual-resource'
import { HERO_IDS } from './hero-ids'
import { registerHeroVisualResources } from './register-hero-visual-resources'

describe('registerHeroVisualResources', () => {
  it('registra los 8 heroes como READY con category hero y un recurso procedural, sin url ficticia', () => {
    const registry = createVisualResourceRegistry()

    registerHeroVisualResources(registry)

    for (const heroId of HERO_IDS) {
      const { descriptor, isFallback } = resolveVisualResource(registry, heroId, 'hero')

      expect(isFallback).toBe(false)
      expect(descriptor.status).toBe('READY')
      expect(descriptor.category).toBe('hero')
      expect(descriptor.heroId).toBe(heroId)
      expect(descriptor.resource).toEqual({ kind: 'model3d', source: 'procedural' })
    }
  })

  it('no registra un noveno heroe ni ningun arma, armadura, item, accion o epica', () => {
    const registry = createVisualResourceRegistry()

    registerHeroVisualResources(registry)

    const unrelated = resolveVisualResource(
      registry,
      'guerrero-tanque--arma--espada-de-una-mano',
      'weapon',
    )
    const ninthHero = resolveVisualResource(registry, 'heroe-inexistente', 'hero')

    expect(unrelated.isFallback).toBe(true)
    expect(ninthHero.isFallback).toBe(true)
  })

  it('es idempotente: registrar dos veces no cambia el resultado', () => {
    const registry = createVisualResourceRegistry()

    registerHeroVisualResources(registry)
    registerHeroVisualResources(registry)

    const { descriptor } = resolveVisualResource(registry, 'guerrero-tanque', 'hero')
    expect(descriptor.status).toBe('READY')
  })
})
