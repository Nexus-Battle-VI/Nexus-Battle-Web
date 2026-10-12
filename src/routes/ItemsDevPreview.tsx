import { useState } from 'react'

import { HERO_IDS, HeroSprite } from '@/shared/visual-library/heroes'
import { ItemSprite } from '@/shared/visual-library/items/ItemSprite'
import { ITEM_SPRITE_SLUGS, itemSpriteFor } from '@/shared/visual-library/items/item-sprites'
import { PRODUCT_CATALOG } from '@/shared/visual-library/products'

/**
 * Vista previa de desarrollo de los sprites animados (EN-031): los ocho heroes y
 * todos los productos, habilidades y epicas con arte, mas los productos oficiales
 * que todavia no lo tienen. NO ES UNA PANTALLA DEL PRODUCTO; solo existe con
 * `import.meta.env.DEV` (`sprites-vista-previa`).
 */
export const ItemsDevPreview = (): React.JSX.Element => {
  const [animated, setAnimated] = useState(true)
  const missing = PRODUCT_CATALOG.filter((entry) => itemSpriteFor({ name: entry.name }) === null)

  return (
    <div data-testid="sprites-vista-previa" className="flex flex-col gap-6">
      <section className="rounded-xl border border-border bg-surface-raised/90 p-5">
        <h1 className="text-xl font-semibold text-ink">Vista previa EN-031 · Sprites</h1>
        <p className="mt-1 text-sm text-muted">
          {ITEM_SPRITE_SLUGS.length} sprites de productos · {HERO_IDS.length} héroes ·{' '}
          {missing.length} productos oficiales sin arte
        </p>
        <label className="mt-3 inline-flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={animated}
            onChange={(event) => {
              setAnimated(event.target.checked)
            }}
          />
          Animados
        </label>
      </section>

      <section className="rounded-xl border border-border bg-surface-raised/90 p-5">
        <h2 className="mb-3 font-semibold text-ink">Héroes</h2>
        <ul className="grid grid-cols-4 gap-4 sm:grid-cols-8">
          {HERO_IDS.map((heroId) => (
            <li key={heroId} className="flex flex-col items-center gap-1 text-xs text-muted">
              <span className="block w-20">
                <HeroSprite heroId={heroId} />
              </span>
              {heroId}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-surface-raised/90 p-5">
        <h2 className="mb-3 font-semibold text-ink">Productos, habilidades y épicas</h2>
        <ul className="grid grid-cols-3 gap-4 sm:grid-cols-6 lg:grid-cols-10">
          {ITEM_SPRITE_SLUGS.map((slug) => {
            const spec = itemSpriteFor({ name: slug })

            return spec === null ? null : (
              <li
                key={slug}
                className="flex flex-col items-center gap-1 text-center text-[11px] text-muted"
              >
                <span className="block h-16 w-16">
                  <ItemSprite spec={spec} label={slug} animated={animated} />
                </span>
                {slug}
              </li>
            )
          })}
        </ul>
      </section>

      {missing.length > 0 && (
        <section className="rounded-xl border border-danger/40 bg-surface-raised/90 p-5">
          <h2 className="mb-2 font-semibold text-danger">Oficiales sin arte</h2>
          <p className="text-sm text-muted">{missing.map((entry) => entry.name).join(' · ')}</p>
        </section>
      )}
    </div>
  )
}
