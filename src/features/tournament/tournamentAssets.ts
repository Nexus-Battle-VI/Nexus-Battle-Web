import type { CSSProperties } from 'react'
import { useTheme } from '@/shared/theme'
import {
  accountFormControls,
  accountHero,
  accountPanel,
  accountSectionIcons,
} from '@/features/account/accountRemasterAssets'
import {
  battleBackgrounds,
  battleDecorations,
  battleFrames,
  battleIcons,
} from '@/features/battle-rooms/battleRemasterAssets'
import {
  marketplaceIcons,
  marketplacePrimaryButton,
} from '@/features/commerce/marketplace/marketplaceAssets'

/** Reuse the current manifests; no parallel filenames or replacement artwork. */
export const tournamentIcons = {
  arena: battleIcons.lobby,
  team: accountSectionIcons.profile,
  bracket: battleIcons.pvp,
  encounters: marketplaceIcons.history,
  prize: battleIcons.victory,
  transmission: marketplaceIcons.view,
  create: battleIcons.createJoin,
  calendar: battleIcons.timer,
  credits: battleIcons.credits,
  confirm: marketplaceIcons.check,
  next: marketplaceIcons.next,
  back: marketplaceIcons.previous,
  security: accountSectionIcons.security,
  empty: battleIcons.roomClosed,
  payment: accountSectionIcons.paymentMethods,
} as const
export type TournamentIconName = keyof typeof tournamentIcons

export const tournamentAssets = {
  background: battleBackgrounds.lobby,
  panel: accountPanel.frame,
  card: battleFrames.combatant,
  title: accountHero.titleBar,
  divider: battleDecorations.sectionDivider,
  turnRing: battleDecorations.turnRing,
  vs: battleDecorations.vsDivider,
  reward: battleDecorations.rewardAura,
  input: accountFormControls.inputDefault,
  inputFocus: accountFormControls.inputFocus,
  inputError: accountFormControls.inputError,
  button: marketplacePrimaryButton,
} as const

const image = (source: string): string => `url("${source}")`
export function useTournamentAssets(): CSSProperties {
  const theme = useTheme((state) => state.theme)
  const panel = tournamentAssets.panel[theme]
  return {
    '--tournament-background': image(tournamentAssets.background[theme]),
    '--tournament-frame': image(panel.src),
    '--tournament-frame-slice': panel.slice,
    '--tournament-frame-width': panel.width,
    '--tournament-card-frame': image(tournamentAssets.card[theme].src),
    '--tournament-title': image(tournamentAssets.title[theme]),
    '--tournament-divider': image(tournamentAssets.divider[theme]),
    '--tournament-turn-ring': image(tournamentAssets.turnRing[theme]),
    '--tournament-vs': image(tournamentAssets.vs[theme]),
    '--tournament-reward': image(tournamentAssets.reward[theme]),
    '--tournament-input': image(tournamentAssets.input[theme]),
    '--tournament-input-focus': image(tournamentAssets.inputFocus[theme]),
    '--tournament-input-error': image(tournamentAssets.inputError[theme]),
    '--tournament-button': image(tournamentAssets.button[theme].default),
    '--tournament-button-hover': image(tournamentAssets.button[theme].hover),
    '--tournament-button-active': image(tournamentAssets.button[theme].active),
    '--tournament-button-disabled': image(tournamentAssets.button[theme].disabled),
  } as CSSProperties
}
