import { useEffect, useRef } from 'react'

import {
  playBattleSfx,
  startBattleMusic,
  stopBattleMusic,
  type BattleSfxName,
} from '@/shared/sound'

import type { LastAttack, LastEffect, LastHealSkill, LastSkill } from './battleReducer'
import { describeResult } from './resultPresentation'
import type { BattleResult } from './types'

export interface BattleAudioInput {
  readonly lastAttack: LastAttack | null
  readonly lastSkill: LastSkill | null
  readonly lastHealSkill: LastHealSkill | null
  readonly lastEffect: LastEffect | null
  readonly result: BattleResult | null
  readonly subject: string | null
  readonly finished: boolean
  readonly isMyTurn: boolean
  /** Cambia con cada turno que Combat cierra: distingue "otra vez mi turno" de un re-render. */
  readonly turnsCompleted: number
}

interface Cue {
  readonly seq: number
  readonly sound: BattleSfxName
}

const attackSound = (attack: LastAttack): BattleSfxName => {
  if (!attack.resolution.effective || attack.resolution.appliedDamage === 0) return 'block'
  return attack.resolution.effect === 'CRITICAL_DAMAGE' ? 'critical' : 'attack'
}

/** El efecto de la accion MAS RECIENTE que publico Combat (la de mayor `seq`). */
const latestCue = ({
  lastAttack,
  lastSkill,
  lastHealSkill,
  lastEffect,
}: BattleAudioInput): Cue | null => {
  const cues: readonly (Cue | null)[] = [
    lastAttack === null ? null : { seq: lastAttack.seq, sound: attackSound(lastAttack) },
    lastSkill === null ? null : { seq: lastSkill.seq, sound: 'skill' },
    lastHealSkill === null ? null : { seq: lastHealSkill.seq, sound: 'heal' },
    lastEffect === null
      ? null
      : { seq: lastEffect.seq, sound: lastEffect.kind === 'epic' ? 'epic' : 'skill' },
  ]

  return cues
    .filter((cue) => cue !== null)
    .reduce<Cue | null>(
      (latest, cue) => (latest === null || cue.seq > latest.seq ? cue : latest),
      null,
    )
}

/**
 * EN-031: musica de batalla mientras dura el combate y un efecto por cada accion
 * publicada, con una fanfarria de victoria o derrota al final. Lo que ya estaba
 * en pantalla al montar (p. ej. al reconectar) no vuelve a sonar.
 */
export const useBattleAudio = (input: BattleAudioInput): void => {
  const { finished, result, subject, isMyTurn, turnsCompleted } = input
  const cue = latestCue(input)
  const heardSeq = useRef(cue?.seq ?? 0)
  const heardResult = useRef(result !== null)
  const heardTurn = useRef(isMyTurn ? turnsCompleted : -1)

  useEffect(() => {
    if (finished) return
    startBattleMusic()
    return () => {
      stopBattleMusic()
    }
  }, [finished])

  const cueSeq = cue?.seq ?? null
  const cueSound = cue?.sound ?? null

  useEffect(() => {
    if (cueSeq === null || cueSound === null || cueSeq <= heardSeq.current) return
    heardSeq.current = cueSeq
    playBattleSfx(cueSound)
  }, [cueSeq, cueSound])

  useEffect(() => {
    if (!isMyTurn || finished || heardTurn.current === turnsCompleted) return
    heardTurn.current = turnsCompleted
    playBattleSfx('turn')
  }, [isMyTurn, finished, turnsCompleted])

  useEffect(() => {
    if (result === null || heardResult.current) return
    heardResult.current = true
    const { tone } = describeResult(result, subject)
    if (tone === 'won') playBattleSfx('victory')
    else if (tone === 'lost') playBattleSfx('defeat')
  }, [result, subject])
}
