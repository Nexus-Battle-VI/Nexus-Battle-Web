/** Central asset manifest for the approved EN-029 Auction visual kit. */
export type AuctionVisualTheme = 'light' | 'dark'

const root = '/assets/auction'

const dark = {
  background: `${root}/dark/backgrounds/auction-hall.jpg`,
  hero: `${root}/dark/headers/hero-wide.png`,
  cards: { frame: `${root}/dark/cards/auction-card-frame.png` },
  controls: {
    panel: `${root}/dark/controls/operation-panel.png`,
    button: `${root}/dark/controls/button-frame.png`,
  },
  filters: {
    search: `${root}/dark/filters/search-frame.png`,
    field: `${root}/dark/filters/field-frame.png`,
  },
  badges: {
    success: `${root}/dark/badges/success-frame.png`,
    warning: `${root}/dark/badges/warning-frame.png`,
    danger: `${root}/dark/badges/danger-frame.png`,
  },
  timer: `${root}/dark/timers/timer-frame.png`,
  decorations: { divider: `${root}/dark/decorations/section-divider.png` },
} as const

const light = {
  background: `${root}/light/backgrounds/auction-gallery.jpg`,
  hero: `${root}/light/headers/hero-wide.png`,
  cards: { frame: `${root}/light/cards/auction-card-frame.png` },
  controls: {
    panel: `${root}/light/controls/operation-panel.png`,
    button: `${root}/light/controls/button-frame.png`,
  },
  filters: {
    search: `${root}/light/filters/search-frame.png`,
    field: `${root}/light/filters/field-frame.png`,
  },
  badges: {
    success: `${root}/light/badges/success-frame.png`,
    warning: `${root}/light/badges/warning-frame.png`,
    danger: `${root}/light/badges/danger-frame.png`,
  },
  timer: `${root}/light/timers/timer-frame.png`,
  decorations: { divider: `${root}/light/decorations/section-divider.png` },
} as const

export const auctionRemasterAssets = {
  dark,
  light,
  shared: {
    icons: {
      timer: `${root}/shared/icons/timer.png`,
      credits: `${root}/shared/icons/credits.png`,
    },
  },
} as const

/** Returns one approved theme branch; the global theme remains the only theme authority. */
export const auctionAssetsFor = (theme: AuctionVisualTheme) => auctionRemasterAssets[theme]
