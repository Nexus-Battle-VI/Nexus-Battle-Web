/**
 * Manifest de assets PixelLab aprobados para el remaster visual de E-commerce
 * (Sprint 3). Correspondencia unica entre un concepto de la interfaz y sus
 * dos variantes reales (Dark/Light), derivadas de:
 *
 *   Sprint-3-Remaster-Visual/Ecommerce/02-PixelLab/{Backgrounds,Frames,Buttons,Icons}
 *
 * Los PNG fuente NUNCA se modifican; los derivados (recortes individuales de
 * cada hoja de sprites) viven en `public/assets/ecommerce/` dentro de este
 * repo. Ver el informe de esta corrección para la tabla completa
 * original -> derivado -> componente.
 *
 * Ningun componente debe escribir una ruta `/assets/ecommerce/...` a mano:
 * siempre a traves de este archivo, para que exista un unico lugar que sepa
 * que archivo real corresponde a que concepto.
 */

const BASE = '/assets/ecommerce'

export type MarketplaceTheme = 'dark' | 'light'

export type MarketplaceIconName =
  | 'search'
  | 'filter'
  | 'refresh'
  | 'previous'
  | 'next'
  | 'view'
  | 'history'
  | 'close'
  | 'cart'
  | 'cartPremium'
  | 'wishlistOutline'
  | 'wishlistFilled'
  | 'rarity'
  | 'tag'
  | 'sparkle'
  | 'check'
  | 'all'
  | 'hero'
  | 'weapon'
  | 'armor'
  | 'ability'
  | 'chest'
  | 'sort'

type ByTheme<T> = Readonly<Record<MarketplaceTheme, T>>

const icon = (group: 'utility' | 'commerce' | 'categories', name: string): ByTheme<string> => ({
  dark: `${BASE}/icons/${group}-dark-${name}.png`,
  light: `${BASE}/icons/${group}-light-${name}.png`,
})

/** Icono PixelLab por concepto. Cada PNG ya trae su propio marco/placa: no se envuelve en otro shell. */
export const marketplaceIcons: Readonly<Record<MarketplaceIconName, ByTheme<string>>> = {
  search: icon('utility', 'search'),
  filter: icon('utility', 'filter'),
  refresh: icon('utility', 'refresh'),
  previous: icon('utility', 'previous'),
  next: icon('utility', 'next'),
  view: icon('utility', 'view'),
  history: icon('utility', 'history'),
  close: icon('utility', 'close'),
  cart: icon('commerce', 'cart'),
  cartPremium: icon('commerce', 'cart-premium'),
  wishlistOutline: icon('commerce', 'wishlist-outline'),
  wishlistFilled: icon('commerce', 'wishlist-filled'),
  rarity: icon('commerce', 'rarity'),
  tag: icon('commerce', 'tag'),
  sparkle: icon('commerce', 'sparkle'),
  check: icon('commerce', 'check'),
  all: icon('categories', 'all'),
  hero: icon('categories', 'hero'),
  weapon: icon('categories', 'weapon'),
  armor: icon('categories', 'armor'),
  ability: icon('categories', 'ability'),
  chest: icon('categories', 'chest'),
  sort: icon('categories', 'sort'),
}

export const marketplaceBackgrounds: ByTheme<string> = {
  dark: `${BASE}/backgrounds/marketplace-dark.png`,
  light: `${BASE}/backgrounds/marketplace-light.png`,
}

/**
 * Frames reales (`Frames/ecommerce-product-card-*`, `ecommerce-section-panel-*`).
 * `product-card-light` es un derivado recortado de `ecommerce-light-ui-kit-v1.png`
 * (no existe un PNG "product-card-light" independiente en el set aprobado): ver
 * el informe, seccion de manifest, para la justificacion.
 *
 * `slice` es el borde del recorte fuente en pixeles (para `border-image-slice`);
 * `width` es el ancho renderizado del borde en la pantalla.
 */
export const marketplaceFrames: Readonly<
  Record<'productCard' | 'sectionPanel', ByTheme<{ src: string; slice: string; width: string }>>
> = {
  productCard: {
    dark: { src: `${BASE}/frames/product-card-dark.png`, slice: '32', width: '16px' },
    light: { src: `${BASE}/frames/product-card-light.png`, slice: '24', width: '14px' },
  },
  sectionPanel: {
    dark: { src: `${BASE}/frames/section-panel-dark.png`, slice: '41 54', width: '18px 22px' },
    light: { src: `${BASE}/frames/section-panel-light.png`, slice: '40 41', width: '16px 18px' },
  },
}

/** Botones primarios: 4 estados reales (default/hover/active/disabled), sin texto quemado. */
export const marketplacePrimaryButton: ByTheme<Record<'default' | 'hover' | 'active' | 'disabled', string>> = {
  dark: {
    default: `${BASE}/buttons/primary-dark-default.png`,
    hover: `${BASE}/buttons/primary-dark-hover.png`,
    active: `${BASE}/buttons/primary-dark-active.png`,
    disabled: `${BASE}/buttons/primary-dark-disabled.png`,
  },
  light: {
    default: `${BASE}/buttons/primary-light-default.png`,
    hover: `${BASE}/buttons/primary-light-hover.png`,
    active: `${BASE}/buttons/primary-light-active.png`,
    disabled: `${BASE}/buttons/primary-light-disabled.png`,
  },
}

/**
 * Botones secundarios de texto ("VIEW DETAILS" en el sprite original): el
 * texto quemado NUNCA se reutiliza. Se consumen via `border-image` con un
 * recorte de borde angosto (`slice`) que deliberadamente EXCLUYE el centro
 * donde vive el texto del sprite; el centro real lo pone el HTML/i18n.
 */
export const marketplaceSecondaryButton: ByTheme<{ default: string; hover: string; slice: string }> = {
  dark: {
    default: `${BASE}/buttons/secondary-dark-default.png`,
    hover: `${BASE}/buttons/secondary-dark-hover.png`,
    slice: '18',
  },
  light: {
    default: `${BASE}/buttons/secondary-light-default.png`,
    hover: `${BASE}/buttons/secondary-light-hover.png`,
    slice: '18',
  },
}

/** Botones de flecha (paginacion), sin texto: se usan como imagen completa, no 9-slice. */
export const marketplaceArrowButton: ByTheme<{ prev: string; next: string }> = {
  dark: {
    prev: `${BASE}/buttons/secondary-dark-prev.png`,
    next: `${BASE}/buttons/secondary-dark-next.png`,
  },
  light: {
    prev: `${BASE}/buttons/secondary-light-prev.png`,
    next: `${BASE}/buttons/secondary-light-next.png`,
  },
}
