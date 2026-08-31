import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { THEME_STORAGE_KEY, initTheme, readStoredTheme, systemTheme, useTheme } from './theme'

const LEGACY_KEY = 'nexus-battles.register-theme'

const resetAll = (): void => {
  globalThis.localStorage.clear()
  delete globalThis.document.documentElement.dataset.theme
  initTheme()
}

beforeEach(resetAll)
afterEach(resetAll)

describe('theme — fuente unica de verdad', () => {
  it('Light y Dark pueden seleccionarse explicitamente y quedan reflejados en <html>', () => {
    useTheme.getState().setTheme('dark')
    expect(useTheme.getState().theme).toBe('dark')
    expect(globalThis.document.documentElement.dataset.theme).toBe('dark')

    useTheme.getState().setTheme('light')
    expect(useTheme.getState().theme).toBe('light')
    expect(globalThis.document.documentElement.dataset.theme).toBe('light')
  })

  it('toggleTheme alterna entre claro y oscuro', () => {
    useTheme.getState().setTheme('light')
    useTheme.getState().toggleTheme()
    expect(useTheme.getState().theme).toBe('dark')
    useTheme.getState().toggleTheme()
    expect(useTheme.getState().theme).toBe('light')
  })

  it('conserva la preferencia elegida en una sola clave global', () => {
    useTheme.getState().setTheme('dark')
    expect(globalThis.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    // Solo el tema: ninguna otra clave.
    expect(globalThis.localStorage.length).toBe(1)
  })

  it('recupera la preferencia guardada al re-inicializar (simula recarga)', () => {
    globalThis.localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    initTheme()
    expect(useTheme.getState().theme).toBe('dark')
    expect(useTheme.getState().explicit).toBe(true)
  })

  it('migra la clave historica de HU-01 sin perder la preferencia', () => {
    globalThis.localStorage.clear()
    globalThis.localStorage.setItem(LEGACY_KEY, 'dark')

    expect(readStoredTheme()).toBe('dark')
    // La historica se retira y la global queda escrita.
    expect(globalThis.localStorage.getItem(LEGACY_KEY)).toBeNull()
    expect(globalThis.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')

    initTheme()
    expect(useTheme.getState().theme).toBe('dark')
  })

  it('sin preferencia guardada cae al tema del sistema y no escribe almacenamiento', () => {
    globalThis.localStorage.clear()
    initTheme()

    expect(readStoredTheme()).toBeNull()
    expect(useTheme.getState().theme).toBe(systemTheme())
    expect(useTheme.getState().explicit).toBe(false)
    expect(globalThis.localStorage.length).toBe(0)
  })
})
