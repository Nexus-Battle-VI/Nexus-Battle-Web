import { useTranslation } from 'react-i18next'
import clsx from 'clsx'

import { MarketplacePixelIcon } from '@/features/commerce/marketplace/MarketplacePixelIcon'
import type { MarketplaceIconName } from '@/features/commerce/marketplace/marketplaceAssets'
import {
  SHOWCASE_PRODUCT_TYPES,
  PRODUCT_TYPE_LABELS,
  NO_FILTERS,
  type Currency,
  type ShowcaseFilters,
  type ShowcaseProductType,
} from './api'

export interface ShowcaseFiltersBarProps {
  readonly filters: ShowcaseFilters
  readonly onChange: (filters: ShowcaseFilters) => void
}
const FIELD =
  'w-full min-w-0 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50'
const toAmount = (raw: string): number | null =>
  raw.trim() === '' ? null : Math.round(Number(raw) * 100)

/** Icono PixelLab de categoria por tipo (`Icons/ecommerce-icons-categories-*`). */
const TYPE_ICON: Readonly<Record<ShowcaseProductType, MarketplaceIconName>> = {
  HEROE: 'hero',
  HABILIDAD: 'ability',
  ARMA: 'weapon',
  ARMADURA: 'armor',
}

export const ShowcaseFiltersBar = ({
  filters,
  onChange,
}: ShowcaseFiltersBarProps): React.JSX.Element => {
  const { t } = useTranslation()

  return (
    <aside aria-label={t('commerce:filters.label')} className="commerce-filters mk-panel">
      {/*
        6a pasada — bug real en Light: los iconos `filter`/`refresh` de la
        hoja Light de PixelLab no son cuadrados como los de Dark (la placa
        plateada del icono se dibuja como una pastilla ancha, ~98x52px,
        contra los ~41x41px cuadrados de Dark). `MarketplacePixelIcon` fija
        el ALTO y deja el ancho automatico (asi no deforma el pixel art), asi
        que ese mismo icono termina renderizando casi 2x mas ancho en Light
        que en Dark -y en un header angosto (~220-280px) eso empujaba
        "Limpiar" hasta pisar el titulo-. `.mk-pixel-icon--header` topa el
        ancho SOLO en estos dos iconos del header (no en los del rail de
        categorias, que ya estaban bien) con `object-fit: contain`, para que
        el icono se vea completo y pequeño en vez de recortado o gigante.
      */}
      <div className="commerce-filter-header">
        {/*
          7a pasada — "FILTRO" en mayusculas via `uppercase` + fuente display
          no cabia completo en el rail angosto (216px) y leia como un titulo
          de seccion mayor (reservado a E-COMMERCE/VITRINA/DETALLE DEL
          PRODUCTO). Esta etiqueta es UI secundaria, no un titulo de modulo:
          usa la fuente UI normal, sin forzar mayusculas (el texto real ya
          viene como "Filtro", solo la F mayuscula), y el mismo tamaño
          compacto que "Limpiar" al lado.
        */}
        <h3 className="flex min-w-0 items-center gap-2 text-xs font-semibold text-ink">
          <MarketplacePixelIcon icon="filter" size="sm" className="mk-pixel-icon--header" />
          <span className="truncate">{t('commerce:filters.title')}</span>
        </h3>
        <button
          type="button"
          onClick={() => {
            onChange(NO_FILTERS)
          }}
          className="flex shrink-0 items-center gap-1 rounded text-xs text-brand underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-brand"
        >
          <MarketplacePixelIcon icon="refresh" size="sm" className="mk-pixel-icon--header" />
          {t('commerce:filters.clear')}
        </button>
      </div>
      <div className="flex min-w-0 flex-col gap-1.5 text-xs text-muted">
        <span className="commerce-filter-row">
          <MarketplacePixelIcon icon="all" size="sm" />
          {t('commerce:filters.type')}
        </span>
        {/*
          Rail de categorias (4a pasada): reemplaza el `<select>` nativo por
          botones reales con icono PixelLab + label -misma decision UX que el
          resto del filtro (icono nunca sustituye texto)-. `filters.type`
          sigue siendo el mismo estado que consumia el `<select>`: `null`
          para "Todos", o uno de `SHOWCASE_PRODUCT_TYPES` en caso contrario.
          No cambia la API ni el query hacia Catalog.
        */}
        <div role="group" aria-label={t('commerce:filters.type')} className="commerce-type-rail">
          <button
            type="button"
            aria-pressed={filters.type === null}
            onClick={() => {
              onChange({ ...filters, type: null })
            }}
            className={clsx('commerce-type-option', filters.type === null && 'is-active')}
          >
            <MarketplacePixelIcon icon="all" size="sm" />
            {t('commerce:filters.allTypes')}
          </button>
          {SHOWCASE_PRODUCT_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={filters.type === type}
              onClick={() => {
                onChange({ ...filters, type })
              }}
              className={clsx('commerce-type-option', filters.type === type && 'is-active')}
            >
              <MarketplacePixelIcon icon={TYPE_ICON[type]} size="sm" />
              {PRODUCT_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>
      <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted">
        <span className="commerce-filter-row">
          <MarketplacePixelIcon icon="tag" size="sm" />
          {t('commerce:filters.currency')}
        </span>
        <select
          value={filters.currency ?? ''}
          onChange={(event) => {
            const currency = event.target.value === '' ? null : (event.target.value as Currency)
            onChange({
              ...filters,
              currency,
              ...(currency === null ? { minPrice: null, maxPrice: null } : {}),
            })
          }}
          className={FIELD}
        >
          <option value="">{t('commerce:filters.allCurrencies')}</option>
          <option value="COP">COP</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
        </select>
      </label>
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="commerce-filter-row">
          <MarketplacePixelIcon icon="rarity" size="sm" />
          {t('commerce:filters.priceRange')}
        </span>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted">
            <span className="commerce-price-label">{t('commerce:filters.minPrice')}</span>
            <input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              disabled={filters.currency === null}
              value={filters.minPrice === null ? '' : String(filters.minPrice / 100)}
              onChange={(event) => {
                onChange({ ...filters, minPrice: toAmount(event.target.value) })
              }}
              className={FIELD}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted">
            <span className="commerce-price-label">{t('commerce:filters.maxPrice')}</span>
            <input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              disabled={filters.currency === null}
              value={filters.maxPrice === null ? '' : String(filters.maxPrice / 100)}
              onChange={(event) => {
                onChange({ ...filters, maxPrice: toAmount(event.target.value) })
              }}
              className={FIELD}
            />
          </label>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-muted">
        {filters.currency === null
          ? t('commerce:filters.currencyHint')
          : t('commerce:filters.currencySelected')}
      </p>
      <p className="commerce-filter-footnote text-xs leading-relaxed text-muted">
        {t('commerce:filters.footnote')}
      </p>
    </aside>
  )
}
