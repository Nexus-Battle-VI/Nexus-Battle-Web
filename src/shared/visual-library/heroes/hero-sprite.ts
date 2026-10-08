import catalog from './hero-sprites.json'
import { HERO_IDS, type HeroId } from './hero-ids'

export type SpriteDirection =
  'south' | 'south-east' | 'east' | 'north-east' | 'north' | 'north-west' | 'west' | 'south-west'
export interface SpriteSequence {
  readonly row: number
  readonly col: number
  readonly count: number
}
interface SpriteAnimation {
  readonly kind: string
  readonly directions: Partial<Record<SpriteDirection, SpriteSequence>>
}
export interface HeroSpriteSpec {
  readonly name: string
  readonly characterId: string
  readonly image: string
  readonly cell: { readonly width: number; readonly height: number }
  readonly sheet: { readonly width: number; readonly height: number }
  readonly animations: readonly SpriteAnimation[]
}
const sprites: Readonly<Record<HeroId, HeroSpriteSpec>> = catalog

export const heroSpriteSpec = (id: string): HeroSpriteSpec | null =>
  (HERO_IDS as readonly string[]).includes(id) ? sprites[id as HeroId] : null

/** Never mirrors an export or substitutes a different facing for a missing animation. */
export const spriteSequence = (
  spec: HeroSpriteSpec,
  direction: SpriteDirection,
  kind: 'idle' | 'hit',
): SpriteSequence | null =>
  spec.animations.find((animation) => animation.kind === kind)?.directions[direction] ??
  (kind === 'idle'
    ? (spec.animations.find((animation) => animation.kind === 'poses')?.directions[direction] ??
      null)
    : null)

export const spritePosition = (
  spec: HeroSpriteSpec,
  sequence: SpriteSequence,
  frame: number,
): string =>
  `${String(((sequence.col + frame) / (spec.sheet.width / spec.cell.width - 1)) * 100)}% ${String((sequence.row / (spec.sheet.height / spec.cell.height - 1 || 1)) * 100)}%`
