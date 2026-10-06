/**
 * Manifest de assets aprobados para el remaster visual de "Mi Cuenta"
 * (Sprint 3). Correspondencia unica entre un concepto de la interfaz y sus
 * dos variantes reales (Dark "Guardian's Lodge" / Light "Royal Archive"),
 * derivadas de:
 *
 *   Sprint-3-Remaster-Visual/Mi Cuenta/{01-Dark,02-Light}/{01..10}-*
 *
 * Los PNG fuente de ese kit NUNCA se modifican; los derivados (recortes
 * individuales de cada hoja de sprites, detectados por limites de alpha y
 * verificados visualmente pieza por pieza) viven en
 * `public/assets/account/` dentro de este repo. Mismo criterio que
 * `features/commerce/marketplace/marketplaceAssets.ts` y
 * `features/battle-rooms/battleRemasterAssets.ts`: ningun componente escribe
 * una ruta `/assets/account/...` a mano.
 *
 * `01-Dark/07-Preferences/Fantasy Gothic UI Sprite Sheet.png` (el selector de
 * tema sol/luna) esta aprobado explicitamente por el propietario del producto
 * para esta implementacion — ver `themeToggleTrack.dark`.
 */

const BASE = '/assets/account'

export type AccountTheme = 'dark' | 'light'

type ByTheme<T> = Readonly<Record<AccountTheme, T>>

export const accountBackgrounds: ByTheme<string> = {
  dark: `${BASE}/backgrounds/bg-account-dark.png`,
  light: `${BASE}/backgrounds/bg-account-light.png`,
}

export const accountHero: Readonly<
  Record<
    'emblem' | 'titleBar' | 'backPlate' | 'divider' | 'cornerLeft' | 'cornerRight' | 'seal',
    ByTheme<string>
  >
> = {
  emblem: {
    dark: `${BASE}/hero-header/emblem-dark.png`,
    light: `${BASE}/hero-header/emblem-light.png`,
  },
  titleBar: {
    dark: `${BASE}/hero-header/title-bar-dark.png`,
    light: `${BASE}/hero-header/title-bar-light.png`,
  },
  backPlate: {
    dark: `${BASE}/hero-header/back-plate-dark.png`,
    light: `${BASE}/hero-header/back-plate-light.png`,
  },
  divider: {
    dark: `${BASE}/hero-header/divider-dark.png`,
    light: `${BASE}/hero-header/divider-light.png`,
  },
  cornerLeft: {
    dark: `${BASE}/hero-header/corner-left-dark.png`,
    light: `${BASE}/hero-header/corner-left-light.png`,
  },
  cornerRight: {
    dark: `${BASE}/hero-header/corner-right-dark.png`,
    light: `${BASE}/hero-header/corner-right-light.png`,
  },
  seal: {
    dark: `${BASE}/hero-header/seal-dark.png`,
    light: `${BASE}/hero-header/seal-light.png`,
  },
}

/**
 * `frame` es la pieza completa (border-image). `slice`/`width` acompañan ese
 * uso (mismo criterio que `battleFrames`/`marketplaceFrames`): el centro
 * transparente del PNG deja ver `--account-panel-bg` por debajo.
 */
export const accountSideNav: Readonly<{
  frame: ByTheme<{ src: string; slice: string; width: string }>
  itemDefault: ByTheme<string>
  itemHover: ByTheme<string>
  itemActive: ByTheme<string>
  dividerVertical: ByTheme<string>
  dividerHorizontal: ByTheme<string>
}> = {
  /* Ronda 2 (brief seccion 14): los remates (finial superior/inferior con
   * gema y cortina) de este marco son mucho mas gruesos que los rieles
   * laterales -no es un borde de grosor uniforme-. Un `slice` simetrico
   * (48px en los 4 lados) recortaba la mayor parte del ornamento del remate,
   * dejando visible solo una franja -de ahi "el remate no se aprecia
   * completo". `slice`/`width` usan DOS valores (vertical horizontal): el
   * primero cubre el remate superior+inferior completo (medido visualmente
   * sobre el PNG real, no adivinado), el segundo el riel lateral, mas
   * delgado. Los valores difieren por tema porque los PNG fuente tienen
   * proporciones distintas (340x692 Dark vs 328x588 Light). */
  frame: {
    dark: { src: `${BASE}/side-navigation/frame-dark.png`, slice: '170 55', width: '60px 16px' },
    light: {
      src: `${BASE}/side-navigation/frame-light.png`,
      slice: '150 70',
      width: '54px 18px',
    },
  },
  itemDefault: {
    dark: `${BASE}/side-navigation/item-default-dark.png`,
    light: `${BASE}/side-navigation/item-default-light.png`,
  },
  itemHover: {
    dark: `${BASE}/side-navigation/item-hover-dark.png`,
    light: `${BASE}/side-navigation/item-hover-light.png`,
  },
  itemActive: {
    dark: `${BASE}/side-navigation/item-active-dark.png`,
    light: `${BASE}/side-navigation/item-active-light.png`,
  },
  dividerVertical: {
    dark: `${BASE}/side-navigation/divider-vertical-dark.png`,
    light: `${BASE}/side-navigation/divider-vertical-light.png`,
  },
  dividerHorizontal: {
    dark: `${BASE}/side-navigation/divider-horizontal-dark.png`,
    light: `${BASE}/side-navigation/divider-horizontal-light.png`,
  },
}

export const accountPanel: Readonly<{
  frame: ByTheme<{ src: string; slice: string; width: string }>
  divider: ByTheme<string>
}> = {
  frame: {
    dark: { src: `${BASE}/content-panels/panel-frame-dark.png`, slice: '40', width: '18px' },
    light: { src: `${BASE}/content-panels/panel-frame-light.png`, slice: '40', width: '18px' },
  },
  divider: {
    dark: `${BASE}/content-panels/divider-dark.png`,
    light: `${BASE}/content-panels/divider-light.png`,
  },
}

/**
 * Las 7 secciones del jugador en Mi Cuenta, mas `admin` (ronda 2 del brief,
 * seccion 16/54/63: "Panel administrativo tambien debe tener icono").
 * `icon-admin-{dark,light}.png` se deriva de la misma hoja de
 * `05-Section-Icons` que los demas -una llave dorada/violeta, no usada por
 * ningun otro concepto-, siguiendo la sugerencia explicita del brief ("key /
 * administrative crest") en vez de generar arte nuevo.
 */
export type AccountSectionIconName =
  | 'profile'
  | 'security'
  | 'preferences'
  | 'statistics'
  | 'subscriptions'
  | 'paymentMethods'
  | 'privacy'
  | 'admin'

const SECTION_ICON_FILE: Readonly<Record<AccountSectionIconName, string>> = {
  profile: 'profile',
  security: 'security',
  preferences: 'preferences',
  statistics: 'statistics',
  subscriptions: 'subscriptions',
  paymentMethods: 'payment-methods',
  privacy: 'privacy',
  admin: 'admin',
}

export const accountSectionIcons: Readonly<Record<AccountSectionIconName, ByTheme<string>>> =
  Object.fromEntries(
    Object.entries(SECTION_ICON_FILE).map(([name, file]) => [
      name,
      {
        dark: `${BASE}/section-icons/icon-${file}-dark.png`,
        light: `${BASE}/section-icons/icon-${file}-light.png`,
      },
    ]),
  ) as Readonly<Record<AccountSectionIconName, ByTheme<string>>>

/**
 * Iconos de estadisticas/logros (ronda 3, brief seccion 49/50/51). Antes
 * `StatisticsPanel.tsx` usaba iconos genericos de Lucide (`Gamepad2`, `Swords`,
 * `Trophy`, `TrendingUp`) -regresion senalada explicitamente por el brief
 * ("no dejar estos iconos genericos"). Derivados de las MISMAS 2 hojas maestras
 * de `05-Section-Icons` ya usadas para `accountSectionIcons` (14 iconos por
 * tema, solo 8 estaban cableados) -no se genero arte nuevo, solo se recortaron
 * piezas ya aprobadas que todavia no se habian usado-: espada+yelmo
 * (gamesPlayed), sello/roseta de victoria (victories), grafico ascendente
 * (progress), orbita de gemas (firstVictory, ambas hojas), libro cerrado
 * (veteran, ambas hojas).
 */
export type AccountStatisticsIconName =
  'gamesPlayed' | 'victories' | 'progress' | 'firstVictory' | 'veteran'

const STATISTICS_ICON_FILE: Readonly<Record<AccountStatisticsIconName, string>> = {
  gamesPlayed: 'games-played',
  victories: 'victories',
  progress: 'progress',
  firstVictory: 'first-victory',
  veteran: 'veteran',
}

export const accountStatisticsIcons: Readonly<Record<AccountStatisticsIconName, ByTheme<string>>> =
  Object.fromEntries(
    Object.entries(STATISTICS_ICON_FILE).map(([name, file]) => [
      name,
      {
        dark: `${BASE}/section-icons/icon-${file}-dark.png`,
        light: `${BASE}/section-icons/icon-${file}-light.png`,
      },
    ]),
  ) as Readonly<Record<AccountStatisticsIconName, ByTheme<string>>>

export type AccountFormControlName =
  | 'inputDefault'
  | 'inputFocus'
  | 'inputError'
  | 'inputPassword'
  | 'checkboxUnchecked'
  | 'checkboxChecked'
  | 'eyeShow'
  | 'eyeHide'
  | 'radioUnchecked'
  | 'radioChecked'
  | 'toggleOff'
  | 'toggleOn'

const FORM_CONTROL_FILE: Readonly<Record<AccountFormControlName, string>> = {
  inputDefault: 'input-default',
  inputFocus: 'input-focus',
  inputError: 'input-error',
  inputPassword: 'input-password',
  checkboxUnchecked: 'checkbox-unchecked',
  checkboxChecked: 'checkbox-checked',
  eyeShow: 'eye-show',
  eyeHide: 'eye-hide',
  radioUnchecked: 'radio-unchecked',
  radioChecked: 'radio-checked',
  toggleOff: 'toggle-off',
  toggleOn: 'toggle-on',
}

export const accountFormControls: Readonly<Record<AccountFormControlName, ByTheme<string>>> =
  Object.fromEntries(
    Object.entries(FORM_CONTROL_FILE).map(([name, file]) => [
      name,
      {
        dark: `${BASE}/form-controls/${file}-dark.png`,
        light: `${BASE}/form-controls/${file}-light.png`,
      },
    ]),
  ) as Readonly<Record<AccountFormControlName, ByTheme<string>>>

export const accountPreferences: Readonly<{
  themeIcon: ByTheme<string>
  /**
   * Iconos REALES de sol/luna para las dos opciones del selector de tema
   * (ronda 2, brief seccion 32/33). Dark se deriva de
   * `01-Dark/07-Preferences/Fantasy Gothic UI Sprite Sheet.png` -el mismo
   * archivo cuyo selector completo ya estaba aprobado en `themeToggleTrack`-,
   * que ya trae un medallon de luna y uno de sol por separado. Light se
   * deriva del medallon de sol y el de luna que SI existen como piezas
   * propias en `account-preferences-kit-light-v01.png` (no son el mismo
   * recorte recoloreado: brief seccion 33, "no significa que debas
   * recolorear"). Reemplazan el `SunIcon`/`MoonIcon` SVG inline de la ronda 1
   * (brief seccion 32: "no los queremos... no inventar SVG nuevo").
   *
   * Ronda 4 (brief seccion 39-47): el recorte Dark original media 63x96px
   * -un rectangulo vertical angosto, NO el medallon circular compacto que
   * parece en Light (96x96/96x93)-. Causa: el sprite maestro
   * (`Fantasy Gothic UI Sprite Sheet.png`, 511x156) es una barra COMPLETAMENTE
   * opaca (sin transparencia real, confirmado por canal alfa: 251-253 en
   * cada esquina muestreada), asi que cualquier recorte cuadrado incluye algo
   * de madera/marco del fondo -eso no es evitable sin generar arte nuevo, que
   * el brief prohibe-, pero el recorte SI se puede centrar correctamente en
   * el anillo de bronce. Localizados por muestreo de pixeles sobre grilla
   * (no a ciegas): anillo de luna en x:[60,160] y:[28,128], anillo de sol en
   * x:[358,462] y:[28,128] -ambos ~100px de diametro, perfectamente
   * simetricos-. Re-derivados a 106x106 (cuadrado real) desde esos bounds.
   */
  themeOptionIcon: Readonly<{
    light: ByTheme<string>
    dark: ByTheme<string>
  }>
  /** Pieza decorativa detras del selector Claro/Oscuro real (botones HTML encima). */
  themeToggleTrack: ByTheme<string>
  languageIcon: ByTheme<string>
  divider: ByTheme<string>
  flags: Readonly<Record<'es' | 'en' | 'fr' | 'pt', ByTheme<string>>>
}> = {
  themeIcon: {
    dark: `${BASE}/preferences/theme-icon-dark.png`,
    light: `${BASE}/preferences/theme-icon-light.png`,
  },
  themeOptionIcon: {
    light: {
      dark: `${BASE}/preferences/theme-icon-sun-dark.png`,
      light: `${BASE}/preferences/theme-icon-sun-light.png`,
    },
    dark: {
      dark: `${BASE}/preferences/theme-icon-moon-dark.png`,
      light: `${BASE}/preferences/theme-icon-moon-light.png`,
    },
  },
  themeToggleTrack: {
    dark: `${BASE}/preferences/theme-toggle-track-dark.png`,
    light: `${BASE}/preferences/theme-toggle-track-light.png`,
  },
  languageIcon: {
    dark: `${BASE}/preferences/language-icon-dark.png`,
    light: `${BASE}/preferences/language-icon-light.png`,
  },
  divider: {
    dark: `${BASE}/preferences/divider-dark.png`,
    light: `${BASE}/preferences/divider-light.png`,
  },
  flags: {
    es: {
      dark: `${BASE}/preferences/flag-es-dark.png`,
      light: `${BASE}/preferences/flag-es-light.png`,
    },
    en: {
      dark: `${BASE}/preferences/flag-en-dark.png`,
      light: `${BASE}/preferences/flag-en-light.png`,
    },
    fr: {
      dark: `${BASE}/preferences/flag-fr-dark.png`,
      light: `${BASE}/preferences/flag-fr-light.png`,
    },
    pt: {
      dark: `${BASE}/preferences/flag-pt-dark.png`,
      light: `${BASE}/preferences/flag-pt-light.png`,
    },
  },
}

export const accountPrivacy: Readonly<{
  panelPlate: ByTheme<string>
  privacyBadge: ByTheme<string>
  personalDataBadge: ByTheme<string>
  lockIcon: ByTheme<string>
  deletionIcon: ByTheme<string>
  /**
   * Ronda 4 (brief seccion 52/65/76): se tipaba como pieza de `border-image`
   * (`{src, slice, width}`), pero el PNG real es un blason/crest compuesto
   * (escudo + cadenas + cristales, NO una franja uniforme) -estirarlo como
   * marco de 4 lados cortaba sus elementos ornamentales, exactamente el bug
   * que el brief describe ("el frame danger no muestra completamente sus
   * elementos ornamentales/cortinas"). Se usa como insignia pequeña junto al
   * titulo (como cualquier otro icono del modulo), nunca como marco
   * estirado.
   */
  dangerFrame: ByTheme<string>
  dangerPlate: ByTheme<string>
  successBadge: ByTheme<string>
  pendingBadge: ByTheme<string>
  exportIcon: Readonly<Record<'json' | 'xml' | 'pdf', ByTheme<string>>>
}> = {
  panelPlate: {
    dark: `${BASE}/privacy-export/panel-plate-dark.png`,
    light: `${BASE}/privacy-export/panel-plate-light.png`,
  },
  privacyBadge: {
    dark: `${BASE}/privacy-export/privacy-badge-dark.png`,
    light: `${BASE}/privacy-export/privacy-badge-light.png`,
  },
  personalDataBadge: {
    dark: `${BASE}/privacy-export/personal-data-badge-dark.png`,
    light: `${BASE}/privacy-export/personal-data-badge-light.png`,
  },
  lockIcon: {
    dark: `${BASE}/privacy-export/lock-icon-dark.png`,
    light: `${BASE}/privacy-export/lock-icon-light.png`,
  },
  deletionIcon: {
    dark: `${BASE}/privacy-export/deletion-icon-dark.png`,
    light: `${BASE}/privacy-export/deletion-icon-light.png`,
  },
  dangerFrame: {
    dark: `${BASE}/privacy-export/danger-frame-dark.png`,
    light: `${BASE}/privacy-export/danger-frame-light.png`,
  },
  dangerPlate: {
    dark: `${BASE}/privacy-export/danger-plate-dark.png`,
    light: `${BASE}/privacy-export/danger-plate-light.png`,
  },
  successBadge: {
    dark: `${BASE}/privacy-export/success-badge-dark.png`,
    light: `${BASE}/privacy-export/success-badge-light.png`,
  },
  pendingBadge: {
    dark: `${BASE}/privacy-export/pending-badge-dark.png`,
    light: `${BASE}/privacy-export/pending-badge-light.png`,
  },
  exportIcon: {
    json: {
      dark: `${BASE}/privacy-export/export-json-dark.png`,
      light: `${BASE}/privacy-export/export-json-light.png`,
    },
    xml: {
      dark: `${BASE}/privacy-export/export-xml-dark.png`,
      light: `${BASE}/privacy-export/export-xml-light.png`,
    },
    pdf: {
      dark: `${BASE}/privacy-export/export-pdf-dark.png`,
      light: `${BASE}/privacy-export/export-pdf-light.png`,
    },
  },
}

/** Decorativo, `background-image` de `::-webkit-scrollbar-thumb` — ver nota de robustez en `account.css`. */
export const accountScrollbarThumb: ByTheme<string> = {
  dark: `${BASE}/scrollbars/thumb-dark.png`,
  light: `${BASE}/scrollbars/thumb-light.png`,
}

export const accountDecorations: Readonly<{ corner: ByTheme<string>; gemAccent: ByTheme<string> }> =
  {
    corner: {
      dark: `${BASE}/decorations/corner-dark.png`,
      light: `${BASE}/decorations/corner-light.png`,
    },
    gemAccent: {
      dark: `${BASE}/decorations/gem-accent-dark.png`,
      light: `${BASE}/decorations/gem-accent-light.png`,
    },
  }
