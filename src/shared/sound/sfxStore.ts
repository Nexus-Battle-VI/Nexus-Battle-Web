import { create } from 'zustand'

/**
 * Preferencia de efectos de sonido (EN-031): APAGADOS por defecto.
 *
 * Mismo criterio que `@/shared/theme`: es estado de cliente global (una
 * preferencia de la persona), vive en Zustand y solo se persiste la propia
 * preferencia. Cualquier fallo de `localStorage` (modo privado, cuota) degrada
 * a "apagado" sin romper el arranque.
 */
export const SFX_STORAGE_KEY = 'nexus-battles.sfx'

const readStored = (): boolean => {
  try {
    return globalThis.localStorage.getItem(SFX_STORAGE_KEY) === 'on'
  } catch {
    return false
  }
}

interface SfxSettingsState {
  readonly enabled: boolean
  setEnabled: (enabled: boolean) => void
  toggle: () => void
}

export const useSfxSettings = create<SfxSettingsState>((set, get) => ({
  enabled: readStored(),
  setEnabled: (enabled) => {
    try {
      globalThis.localStorage.setItem(SFX_STORAGE_KEY, enabled ? 'on' : 'off')
    } catch {
      // Sin almacenamiento la preferencia vale solo para esta sesion.
    }
    set({ enabled })
  },
  toggle: () => {
    get().setEnabled(!get().enabled)
  },
}))
