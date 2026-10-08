import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HeroSprite } from './HeroSprite'
import { HERO_IDS } from './hero-ids'
import { heroSpriteSpec, spritePosition, spriteSequence } from './hero-sprite'

describe('Original hero sprites', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('covers exactly eight official heroes and keeps all 338 exported frames inside the PNG', () => {
    const provenance = JSON.parse(
      readFileSync(
        path.join(process.cwd(), 'public/assets/heroes/sprites/provenance.json'),
        'utf8',
      ),
    ) as { retained: { character_id: string; png_sha256: string; json_sha256: string }[] }
    let frames = 0
    for (const id of HERO_IDS) {
      const spec = heroSpriteSpec(id)!
      const png = readFileSync(path.join(process.cwd(), 'public', spec.image))
      const original = provenance.retained.find(
        (source) => source.character_id === spec.characterId,
      )!
      expect(createHash('sha256').update(png).digest('hex')).toBe(original.png_sha256)
      const metadata = readFileSync(
        path.join(process.cwd(), 'public', spec.image.replace(/\.png$/u, '.json')),
      )
      expect(createHash('sha256').update(metadata).digest('hex')).toBe(original.json_sha256)
      expect(png.readUInt32BE(16)).toBe(spec.sheet.width)
      expect(png.readUInt32BE(20)).toBe(spec.sheet.height)
      for (const animation of spec.animations) {
        for (const sequence of Object.values(animation.directions)) {
          expect((sequence.col + sequence.count) * spec.cell.width).toBeLessThanOrEqual(
            spec.sheet.width,
          )
          expect((sequence.row + 1) * spec.cell.height).toBeLessThanOrEqual(spec.sheet.height)
          frames += sequence.count
        }
      }
    }
    expect(frames).toBe(338)
    expect(heroSpriteSpec('unknown')).toBeNull()
  })

  it('keeps the requested facing when a hero lacks that idle or hit; the medic stays a pose', () => {
    const tank = heroSpriteSpec('guerrero-tanque')!
    expect(spriteSequence(tank, 'south-west', 'idle')).toEqual({ row: 0, col: 7, count: 1 })
    expect(spriteSequence(tank, 'north-west', 'hit')).toBeNull()
    const medic = heroSpriteSpec('medico')!
    expect(spriteSequence(medic, 'south-east', 'idle')?.count).toBe(1)
    expect(spriteSequence(medic, 'south-east', 'hit')).toBeNull()
  })

  it('maps the original cell origin and final idle frame without cropping or mirroring', () => {
    const fire = heroSpriteSpec('mago-fuego')!
    const idle = spriteSequence(fire, 'south-east', 'idle')!
    expect(spritePosition(fire, idle, 0)).toBe('0% 62.5%')
    expect(spritePosition(fire, idle, 7)).toBe('100% 62.5%')
  })

  it('shows a static accessible medic, and a safe fallback when the image cannot load', () => {
    const { container } = render(<HeroSprite heroId="medico" />)
    expect(screen.getByRole('img', { name: 'Médico' })).toBeInTheDocument()
    expect(container.querySelector('.hero-sprite-frame')).toHaveAttribute('data-animated', 'false')
    fireEvent.error(container.querySelector('img')!)
    expect(container.querySelector('.hero-sprite')).toBeNull()
    expect(screen.getByRole('img', { name: 'Médico' })).toBeInTheDocument()
  })

  it('plays a hit only after observed health decreases and cancels it on unmount', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false })),
    )
    const cancel = vi.fn()
    const animate = vi.fn(() => ({ cancel }))
    const { container, rerender, unmount } = render(<HeroSprite heroId="mago-fuego" health={100} />)
    const surface = container.querySelector('.hero-sprite-frame')!
    Object.defineProperty(surface, 'animate', { value: animate })
    fireEvent.load(container.querySelector('img')!)
    rerender(<HeroSprite heroId="mago-fuego" health={100} />)
    expect(animate).not.toHaveBeenCalled()
    rerender(<HeroSprite heroId="mago-fuego" health={80} />)
    expect(animate).toHaveBeenCalledOnce()
    expect(animate).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ backgroundPosition: '0% 12.5%' })]),
      { duration: 750 },
    )
    unmount()
    expect(cancel).toHaveBeenCalledOnce()
  })
})
