import { create } from 'zustand'

/**
 * Preferencia de la musica de batalla (EN-031). Va aparte de los efectos: se
 * puede silenciar la musica y seguir oyendo los golpes. ENCENDIDA por defecto,
 * pero nunca suena si el sonido general (`useSfxSettings`) esta apagado.
 * Mismo criterio de almacenamiento que `sfxStore.ts`.
 */
export const MUSIC_STORAGE_KEY = 'nexus-battles.music'

const readStored = (): boolean => {
  try {
    return globalThis.localStorage.getItem(MUSIC_STORAGE_KEY) !== 'off'
  } catch {
    return true
  }
}

interface MusicSettingsState {
  readonly enabled: boolean
  setEnabled: (enabled: boolean) => void
}

export const useMusicSettings = create<MusicSettingsState>((set) => ({
  enabled: readStored(),
  setEnabled: (enabled) => {
    try {
      globalThis.localStorage.setItem(MUSIC_STORAGE_KEY, enabled ? 'on' : 'off')
    } catch {
      // Sin almacenamiento la preferencia vale solo para esta sesion.
    }
    set({ enabled })
  },
}))
