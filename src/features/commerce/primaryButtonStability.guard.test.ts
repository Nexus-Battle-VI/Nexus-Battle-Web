import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * 9a pasada (QA visual final) — guard de regresion sobre el CSS fuente, mismo
 * patron que `noClientAuthority.test.ts` (lee el archivo de produccion y
 * falla si reaparece algo prohibido, en vez de confiar en un snapshot visual
 * o en memoria de que "ya se arreglo una vez").
 *
 * Richard reporto DOS veces que `.mk-btn-primary` ("Añadir al carrito",
 * "Proceder al pago") seguia "hundiendose": la 1a vez porque `:hover`
 * cambiaba de imagen (`border-image-source`) a un PNG con recorte distinto;
 * la 2a vez porque `:active` y `:disabled` SEGUIAN haciendolo aunque
 * `:hover` ya estaba arreglado. Este guard cubre los TRES estados a la vez
 * para que no se pueda reintroducir el swap en ninguno sin que un test
 * falle, sea cual sea el motivo del siguiente cambio.
 */
const CSS_PATH = path.resolve(__dirname, 'commerce.css')

const readCssWithoutComments = (): string =>
  readFileSync(CSS_PATH, 'utf8').replace(/\/\*[\s\S]*?\*\//gu, '')

/**
 * Extrae el cuerpo `{ ... }` del bloque cuya lista de selectores (separados
 * por coma, un selector real puede compartir cuerpo con otros -p. ej.
 * `.ec-btn-compact:hover, .ec-btn-pill:hover { ... }`-) incluye `selector`
 * EXACTO como uno de sus elementos.
 */
const ruleBodyFor = (css: string, selector: string): string => {
  const blocks = css.matchAll(/([^{}]+)\{([^}]*)\}/gu)
  for (const block of blocks) {
    const header = (block[1] ?? '').trim()
    const selectors = header.split(',').map((entry) => entry.replace(/\s+/gu, ' ').trim())
    if (selectors.includes(selector)) {
      return block[2] ?? ''
    }
  }
  throw new Error(`No se encontro la regla "${selector}" en commerce.css`)
}

describe('Botones primarios de E-commerce — guard de estabilidad geometrica', () => {
  const css = readCssWithoutComments()

  it.each([
    '.mk-btn-primary:hover:not(:disabled)',
    '.mk-btn-primary:active:not(:disabled)',
    '.mk-btn-primary:disabled',
  ])('%s nunca declara transform/translate/scale', (selector) => {
    const body = ruleBodyFor(css, selector)
    expect(body).not.toMatch(/transform\s*:/u)
    expect(body).not.toMatch(/translate/u)
    expect(body).not.toMatch(/\bscale\s*\(/u)
  })

  it.each([
    '.mk-btn-primary:hover:not(:disabled)',
    '.mk-btn-primary:active:not(:disabled)',
    '.mk-btn-primary:disabled',
  ])('%s nunca cambia border-image-source (sin frame-swap)', (selector) => {
    const body = ruleBodyFor(css, selector)
    expect(body).not.toMatch(/border-image-source/u)
  })

  it.each([
    '.mk-btn-primary:hover:not(:disabled)',
    '.mk-btn-primary:active:not(:disabled)',
    '.mk-btn-primary:disabled',
  ])('%s nunca cambia box/width/height/padding/margin/border-width', (selector) => {
    const body = ruleBodyFor(css, selector)
    expect(body).not.toMatch(/\b(width|height|padding|margin|border-width)\s*:/u)
  })

  it('la imagen default de Dark sigue existiendo (unico cambio de imagen permitido: por tema, no por interaccion)', () => {
    const body = ruleBodyFor(css, ":root[data-theme='dark'] .mk-btn-primary")
    expect(body).toMatch(/border-image-source/u)
  })

  /*
   * 9a pasada (STEP 12, punto J del brief): esta pasada NO implementa un
   * toggle de clase en `document.documentElement`/`<body>` en JS -no hace
   * falta un efecto de montaje/desmontaje para "limpiar": el scrollbar de
   * pagina se tematiza con `:root:has(.commerce-page)`, un selector CSS puro
   * que deja de aplicar automaticamente en cuanto `.commerce-page` sale del
   * DOM (al salir de E-commerce). No hay estado de JS que pueda quedar
   * "pegado" tras desmontar, asi que no existe el escenario de fuga que
   * pediria un test de montaje/desmontaje -se verifica aqui, por
   * construccion, que la regla de la barra de pagina esta condicionada a
   * `:has(.commerce-page)` y no es un `:root`/`html` global.
   */
  it('el scrollbar de pagina esta condicionado a .commerce-page (nunca una regla global de :root/html)', () => {
    expect(css).toMatch(/:root:has\(\.commerce-page\)\s*\{/u)
    expect(css).toMatch(/:root:has\(\.commerce-page\)::-webkit-scrollbar\s*\{/u)
    // Ninguna version "pelada" (`:root {` o `html {`, SIN `:has`) define
    // directamente `scrollbar-color`/`::-webkit-scrollbar` en este archivo.
    expect(css).not.toMatch(/^:root\s*\{[^}]*scrollbar-color/mu)
    expect(css).not.toMatch(/^html[\s{]/mu)
  })

  it('la familia .ec-btn-compact/.ec-btn-pill ("Ver detalle", paginacion, "Volver al carrito", "Agregar imagen") tampoco usa transform en hover/active', () => {
    for (const selector of [
      '.ec-btn-compact:hover:not(:disabled)',
      '.ec-btn-pill:hover:not(:disabled)',
    ]) {
      const body = ruleBodyFor(css, selector)
      expect(body).not.toMatch(/transform\s*:/u)
      expect(body).not.toMatch(/\bscale\s*\(/u)
    }
  })
})
