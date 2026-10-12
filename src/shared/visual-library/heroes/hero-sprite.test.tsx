import { readdirSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { PNG } from 'pngjs'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HeroSprite } from './HeroSprite'
import { HERO_IDS } from './hero-ids'
import { heroSpriteSpec, spritePosition, spriteSequence } from './hero-sprite'

const publicPath = (...parts: string[]): string => path.join(process.cwd(), 'public', ...parts)

describe('Hero sprites', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('keeps the eight original exports untouched and their 338 frames inside each sheet', () => {
    const provenance = JSON.parse(
      readFileSync(publicPath('assets/heroes/sprites/provenance.json'), 'utf8'),
    ) as { retained: { character_id: string; png_sha256: string; json_sha256: string }[] }
    let originalFrames = 0
    for (const id of HERO_IDS) {
      const spec = heroSpriteSpec(id)!
      const folder = path.dirname(publicPath(spec.image))
      // EN-031: la hoja servida puede ser la ampliada (`en031-*`); el export original sigue
      // en la misma carpeta, intacto, con el hash de `provenance.json`.
      const originalName = readdirSync(folder).find(
        (name) => name.endsWith('.png') && !name.startsWith('en031-'),
      )!
      const original = provenance.retained.find(
        (source) => source.character_id === spec.characterId,
      )!
      const originalPng = readFileSync(path.join(folder, originalName))
      expect(createHash('sha256').update(originalPng).digest('hex')).toBe(original.png_sha256)
      const metadata = readFileSync(path.join(folder, originalName.replace(/\.png$/u, '.json')))
      expect(createHash('sha256').update(metadata).digest('hex')).toBe(original.json_sha256)
      const exportRows = (
        JSON.parse(metadata.toString('utf8')) as { spritesheet: { rows: unknown[] } }
      ).spritesheet.rows.length

      // La hoja servida empieza con el export original pixel a pixel.
      const served = PNG.sync.read(readFileSync(publicPath(spec.image)))
      const source = PNG.sync.read(originalPng)
      expect(served.width).toBe(spec.sheet.width)
      expect(served.height).toBe(spec.sheet.height)
      expect(served.data.subarray(0, source.data.length).equals(source.data)).toBe(true)

      for (const animation of spec.animations) {
        for (const sequence of Object.values(animation.directions)) {
          expect((sequence.col + sequence.count) * spec.cell.width).toBeLessThanOrEqual(
            spec.sheet.width,
          )
          expect((sequence.row + 1) * spec.cell.height).toBeLessThanOrEqual(spec.sheet.height)
          if (sequence.row < exportRows) originalFrames += sequence.count
        }
      }
    }
    expect(originalFrames).toBe(338)
    expect(heroSpriteSpec('unknown')).toBeNull()
  })

  it('EN-031: every hero can idle, take a hit and attack in both arena facings', () => {
    for (const id of HERO_IDS) {
      const spec = heroSpriteSpec(id)!
      for (const direction of ['south-east', 'north-west'] as const) {
        expect(
          spriteSequence(spec, direction, 'idle')?.count,
          `${id} idle ${direction}`,
        ).toBeGreaterThan(1)
        expect(spriteSequence(spec, direction, 'hit'), `${id} hit ${direction}`).not.toBeNull()
        expect(spriteSequence(spec, direction, 'attack')?.count, `${id} attack ${direction}`).toBe(
          8,
        )
      }
    }
  })

  it('maps the original cell origin and final idle frame without cropping or mirroring', () => {
    const fire = heroSpriteSpec('mago-fuego')!
    const idle = spriteSequence(fire, 'south-east', 'idle')!
    expect(spritePosition(fire, idle, 0)).toBe(spritePosition(fire, { ...idle, col: 0 }, 0))
    expect(spritePosition(fire, idle, 7).startsWith('100% ')).toBe(true)
  })

  it('shows an accessible hero, and a placeholder (never a 3D render) when the image cannot load', () => {
    const { container } = render(<HeroSprite heroId="medico" />)
    expect(screen.getByRole('img', { name: 'Médico' })).toBeInTheDocument()
    expect(container.querySelector('.hero-sprite-frame')).toHaveAttribute('data-animated', 'true')
    fireEvent.error(container.querySelector('img')!)
    expect(container.querySelector('.hero-sprite-frame')).toBeNull()
    expect(container.querySelector('.hero-sprite-missing')).not.toBeNull()
    expect(screen.getByRole('img', { name: 'Médico' })).toBeInTheDocument()
  })

  it('plays a hit only after observed health decreases and cancels it on unmount', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false })),
    )
    const cancel = vi.fn()
    const animate = vi.fn(() => ({ cancel }))
    const fire = heroSpriteSpec('mago-fuego')!
    const hit = spriteSequence(fire, 'south-east', 'hit')!
    const { container, rerender, unmount } = render(<HeroSprite heroId="mago-fuego" health={100} />)
    const surface = container.querySelector('.hero-sprite-frame')!
    Object.defineProperty(surface, 'animate', { value: animate })
    fireEvent.load(container.querySelector('img')!)
    rerender(<HeroSprite heroId="mago-fuego" health={100} />)
    expect(animate).not.toHaveBeenCalled()
    rerender(<HeroSprite heroId="mago-fuego" health={80} />)
    expect(animate).toHaveBeenCalledOnce()
    expect(animate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ backgroundPosition: spritePosition(fire, hit, 0) }),
      ]),
      { duration: (hit.count / 8) * 1000 },
    )
    unmount()
    expect(cancel).toHaveBeenCalledOnce()
  })

  it('EN-031: plays the attack once when its signal changes, never on the first render', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false })),
    )
    const animate = vi.fn(() => ({ cancel: vi.fn() }))
    const tank = heroSpriteSpec('guerrero-tanque')!
    const attack = spriteSequence(tank, 'north-west', 'attack')!
    const { container, rerender } = render(
      <HeroSprite heroId="guerrero-tanque" direction="north-west" attackSignal={3} />,
    )
    Object.defineProperty(container.querySelector('.hero-sprite-frame')!, 'animate', {
      value: animate,
    })
    fireEvent.load(container.querySelector('img')!)
    rerender(<HeroSprite heroId="guerrero-tanque" direction="north-west" attackSignal={3} />)
    expect(animate).not.toHaveBeenCalled()
    rerender(<HeroSprite heroId="guerrero-tanque" direction="north-west" attackSignal={7} />)
    expect(animate).toHaveBeenCalledOnce()
    expect(animate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ backgroundPosition: spritePosition(tank, attack, 0) }),
      ]),
      { duration: 1000 },
    )
  })
})
