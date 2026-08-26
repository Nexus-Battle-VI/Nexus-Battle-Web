import { describe, expect, it } from 'vitest'

import { createVisualResourceRegistry } from './registry'
import { resolveVisualResource } from './resolve-visual-resource'
import type { VisualResourceDescriptor } from './visual-resource'

describe('resolveVisualResource', () => {
  it('resuelve un id de heroe conocido y aprobado por EN-026.1 que aun no fue producido a un fallback seguro', () => {
    const registry = createVisualResourceRegistry()

    const resolution = resolveVisualResource(registry, 'guerrero-tanque', 'hero')

    expect(resolution).toEqual<typeof resolution>({
      descriptor: {
        id: 'guerrero-tanque',
        category: 'hero',
        heroId: 'guerrero-tanque',
        status: 'NOT_PRODUCED',
      },
      isFallback: true,
    })
  })

  it('resuelve un id de recurso asociado a un heroe, extrayendo heroId del id compuesto', () => {
    const registry = createVisualResourceRegistry()

    const resolution = resolveVisualResource(
      registry,
      'guerrero-tanque--arma--espada-de-una-mano',
      'weapon',
    )

    expect(resolution.isFallback).toBe(true)
    expect(resolution.descriptor.heroId).toBe('guerrero-tanque')
    expect(resolution.descriptor.category).toBe('weapon')
    expect(resolution.descriptor.status).toBe('NOT_PRODUCED')
  })

  it('resuelve un id desconocido (no registrado y fuera del inventario) sin lanzar, con el mismo fallback seguro', () => {
    const registry = createVisualResourceRegistry()

    const resolution = resolveVisualResource(registry, 'id-inexistente', 'item')

    expect(resolution.isFallback).toBe(true)
    expect(resolution.descriptor.status).toBe('NOT_PRODUCED')
  })

  it('devuelve el descriptor registrado, sin fallback, una vez que el recurso esta disponible', () => {
    const registry = createVisualResourceRegistry()
    const readyDescriptor: VisualResourceDescriptor = {
      id: 'guerrero-tanque',
      category: 'hero',
      heroId: 'guerrero-tanque',
      status: 'READY',
      resource: {
        kind: 'model3d',
        source: 'url',
        url: 'https://example.invalid/guerrero-tanque.glb',
      },
    }
    registry.register(readyDescriptor)

    const resolution = resolveVisualResource(registry, 'guerrero-tanque', 'hero')

    expect(resolution).toEqual<typeof resolution>({
      descriptor: readyDescriptor,
      isFallback: false,
    })
  })

  it('reutiliza el mismo descriptor registrado desde mas de un consumidor, sin duplicarlo', () => {
    const registry = createVisualResourceRegistry()
    const readyDescriptor: VisualResourceDescriptor = {
      id: 'guerrero-tanque',
      category: 'hero',
      heroId: 'guerrero-tanque',
      status: 'READY',
      resource: {
        kind: 'model3d',
        source: 'url',
        url: 'https://example.invalid/guerrero-tanque.glb',
      },
    }
    registry.register(readyDescriptor)

    const fromHeroSelection = resolveVisualResource(registry, 'guerrero-tanque', 'hero')
    const fromCatalog = resolveVisualResource(registry, 'guerrero-tanque', 'hero')

    expect(fromHeroSelection.descriptor).toBe(fromCatalog.descriptor)
  })

  it('no devuelve un descriptor registrado bajo una categoria distinta a la solicitada', () => {
    const registry = createVisualResourceRegistry()
    registry.register({
      id: 'guerrero-tanque',
      category: 'hero',
      heroId: 'guerrero-tanque',
      status: 'READY',
      resource: {
        kind: 'model3d',
        source: 'url',
        url: 'https://example.invalid/guerrero-tanque.glb',
      },
    })

    const resolution = resolveVisualResource(registry, 'guerrero-tanque', 'weapon')

    expect(resolution.isFallback).toBe(true)
    expect(resolution.descriptor).toEqual<VisualResourceDescriptor>({
      id: 'guerrero-tanque',
      category: 'weapon',
      heroId: 'guerrero-tanque',
      status: 'NOT_PRODUCED',
    })
  })

  it('permite extender el registro con un noveno heroe futuro sin afectar la resolucion de los existentes', () => {
    const registry = createVisualResourceRegistry()
    registry.register({
      id: 'guerrero-tanque',
      category: 'hero',
      heroId: 'guerrero-tanque',
      status: 'READY',
      resource: {
        kind: 'model3d',
        source: 'url',
        url: 'https://example.invalid/guerrero-tanque.glb',
      },
    })

    registry.register({
      id: 'heroe-futuro-aprobado',
      category: 'hero',
      heroId: 'heroe-futuro-aprobado',
      status: 'NOT_PRODUCED',
    })

    const existing = resolveVisualResource(registry, 'guerrero-tanque', 'hero')
    const future = resolveVisualResource(registry, 'heroe-futuro-aprobado', 'hero')

    expect(existing.descriptor.status).toBe('READY')
    expect(future.descriptor.status).toBe('NOT_PRODUCED')
    expect(future.isFallback).toBe(false)
  })

  it('resuelve un recurso procedural (sin url) registrado por EN-026.3, sin fallback', () => {
    const registry = createVisualResourceRegistry()
    const readyDescriptor: VisualResourceDescriptor = {
      id: 'guerrero-tanque',
      category: 'hero',
      heroId: 'guerrero-tanque',
      status: 'READY',
      resource: { kind: 'model3d', source: 'procedural' },
    }
    registry.register(readyDescriptor)

    const resolution = resolveVisualResource(registry, 'guerrero-tanque', 'hero')

    expect(resolution).toEqual<typeof resolution>({
      descriptor: readyDescriptor,
      isFallback: false,
    })
  })
})

describe('createVisualResourceRegistry', () => {
  it('aisla el estado entre instancias distintas', () => {
    const first = createVisualResourceRegistry()
    const second = createVisualResourceRegistry()

    first.register({
      id: 'guerrero-tanque',
      category: 'hero',
      heroId: 'guerrero-tanque',
      status: 'READY',
      resource: {
        kind: 'model3d',
        source: 'url',
        url: 'https://example.invalid/guerrero-tanque.glb',
      },
    })

    expect(second.get('guerrero-tanque')).toBeUndefined()
  })
})
