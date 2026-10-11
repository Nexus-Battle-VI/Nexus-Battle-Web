import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import { HeroSprite } from '@/shared/visual-library/heroes'
import { heroIdFromSubtype } from '@/shared/visual-library/heroes/hero-subtype'

import type { ProgressEntry } from '../missionPlayApi'
import { MissionPixelIcon } from '../MissionPixelIcon'
import { enemySpriteFor, type EnemySpriteSpec } from '../missionsRemasterAssets'
import { stageAt, type StageBeat, type StageEnemy } from './stage'
import { useDioramaPlayback } from './useDioramaPlayback'

export interface MissionDioramaProps {
  readonly entries: readonly ProgressEntry[]
  /** La escena de la mision (`MissionArt`), que llena el escenario. */
  readonly scene: ReactNode
  readonly heroName: string
  /** Subtipo del heroe (`GUERRERO_TANQUE`...), para elegir su sprite. */
  readonly heroSubtype: string | null
  readonly heroMaxHealth: number | null
}

/** Ancho de una barra de vida: las cifras son las que publica Missions. */
const meterWidth = (health: number | null, maxHealth: number | null): string =>
  health === null || maxHealth === null || maxHealth <= 0
    ? '100%'
    : `min(100%, ${String((health * 100) / maxHealth)}%)`

const HudMeter = ({
  name,
  health,
  maxHealth,
  align,
}: {
  readonly name: string
  readonly health: number | null
  readonly maxHealth: number | null
  readonly align: 'start' | 'end'
}): React.JSX.Element => (
  <div
    data-side={align === 'end' ? 'enemy' : 'hero'}
    className={clsx('msn-stage-hud-unit', align === 'end' && 'items-end text-right')}
  >
    <span className="msn-stage-hud-name">{name}</span>
    <div className="msn-meter msn-meter--health w-full">
      <div style={{ width: meterWidth(health, maxHealth) }} />
    </div>
  </div>
)

const EnemyFigure = ({
  enemy,
  sprite,
  beat,
}: {
  readonly enemy: StageEnemy
  readonly sprite: EnemySpriteSpec
  readonly beat: StageBeat | null
}): React.JSX.Element => {
  const attackStrip = beat?.kind === 'enemyStrike' ? sprite.attack : null
  const attacking = attackStrip !== null
  const frames = attacking ? sprite.frames.attack : sprite.frames.idle
  const style = {
    '--msn-frames': String(frames),
    '--msn-frames-steps': String(frames - 1),
    backgroundImage: `url("${attackStrip ?? sprite.idle}")`,
    backgroundSize: `${String(frames * 100)}% 100%`,
  } as CSSProperties
  return (
    <div
      key={attacking ? `attack-${String(beat?.seq)}` : `idle-${enemy.name}`}
      className={clsx(
        'msn-stage-enemy',
        `msn-stage-enemy--${enemy.role}`,
        enemy.enraged && 'msn-stage-enemy--enraged',
        enemy.defeated && 'msn-stage-enemy--defeated',
      )}
      data-beat={beat?.kind}
    >
      <span
        className={clsx(
          'msn-stage-strip',
          attacking
            ? 'msn-stage-strip--once'
            : frames > 1
              ? 'msn-stage-strip--loop'
              : 'msn-stage-strip--bob',
        )}
        style={style}
      />
    </div>
  )
}

/** Cifra o palabra que flota sobre quien recibe el golpe, una vez por momento. */
const FloatingText = ({ beat }: { readonly beat: StageBeat }): React.JSX.Element | null => {
  const { t } = useTranslation()
  const crit = beat.critical ? ` ${t('missions:remaster.critical')}` : ''
  switch (beat.kind) {
    case 'heroStrike':
      return (
        <span key={beat.seq} className="msn-float msn-float--enemy msn-float--damage">
          −{beat.damage ?? 0}
          {crit}
        </span>
      )
    case 'enemyStrike':
      return (
        <span key={beat.seq} className="msn-float msn-float--hero msn-float--damage">
          −{beat.damage ?? 0}
          {crit}
        </span>
      )
    case 'heroMiss':
      return (
        <span key={beat.seq} className="msn-float msn-float--enemy">
          {t('missions:remaster.miss')}
        </span>
      )
    case 'enemyMiss':
      return (
        <span key={beat.seq} className="msn-float msn-float--hero">
          {t('missions:remaster.miss')}
        </span>
      )
    case 'heal':
      return (
        <span key={beat.seq} className="msn-float msn-float--hero msn-float--heal">
          +{beat.amount ?? 0}
        </span>
      )
    case 'heroAbility':
      return beat.ability === null ? null : (
        <span key={beat.seq} className="msn-float msn-float--hero msn-float--ability">
          {beat.ability}
        </span>
      )
    case 'guard':
      return (
        <span key={beat.seq} className="msn-float msn-float--enemy msn-float--guard">
          <MissionPixelIcon icon="difficulty" size="md" />
        </span>
      )
    default:
      return null
  }
}

/**
 * Diorama de la mision en curso (remaster EN-031): reproduce, sobre la escena
 * de la mision, la MISMA bitacora que la lista accesible de debajo. Es solo
 * presentacion: el escenario va con `aria-hidden` y todo lo que muestra ya
 * esta, en palabras, en la bitacora (`aria-live`). Con movimiento reducido no
 * anima; ademas, cualquiera puede pausarlo.
 */
export const MissionDiorama = ({
  entries,
  scene,
  heroName,
  heroSubtype,
  heroMaxHealth,
}: MissionDioramaProps): React.JSX.Element => {
  const { t } = useTranslation()
  const [paused, setPaused] = useState(false)
  const { played, reducedMotion } = useDioramaPlayback(entries.length, paused)
  const stage = useMemo(
    () => stageAt(entries, played, heroMaxHealth),
    [entries, played, heroMaxHealth],
  )
  const heroModel = heroSubtype === null ? null : heroIdFromSubtype(heroSubtype)
  const beat = reducedMotion ? null : stage.beat
  const heroBeat =
    beat?.kind === 'heroStrike' || beat?.kind === 'heroMiss' || beat?.kind === 'heroAbility'
      ? beat.kind
      : beat?.kind === 'heal' || beat?.kind === 'recover'
        ? 'heal'
        : undefined

  return (
    <div className="msn-diorama flex flex-col gap-2">
      <div
        aria-hidden="true"
        className={clsx('msn-stage', reducedMotion && 'msn-stage--still')}
        data-paused={paused}
      >
        <div className="msn-stage-scene">{scene}</div>

        <div className="msn-stage-hud">
          <HudMeter
            name={heroName}
            health={stage.heroHealth}
            maxHealth={heroMaxHealth}
            align="start"
          />
          {stage.encounter !== null && (
            <span className="msn-stage-encounter">
              {stage.boss
                ? t('missions:remaster.bossEncounter', { n: stage.encounter })
                : t('missions:remaster.encounter', { n: stage.encounter })}
            </span>
          )}
          {stage.enemy !== null && (
            <HudMeter
              name={stage.enemy.name}
              health={stage.enemy.health}
              maxHealth={stage.enemy.maxHealth}
              align="end"
            />
          )}
        </div>

        <div
          key={heroBeat === undefined ? 'hero' : `hero-${String(beat?.seq)}`}
          className="msn-stage-hero"
          data-beat={heroBeat}
        >
          {heroModel === null ? (
            <span className="msn-stage-enemy-fallback">
              <MissionPixelIcon icon="hero" size="xl" />
            </span>
          ) : (
            <HeroSprite
              heroId={heroModel}
              direction="south-east"
              health={stage.heroHealth ?? undefined}
            />
          )}
        </div>

        {stage.enemy !== null && (
          <EnemyFigure
            enemy={stage.enemy}
            sprite={enemySpriteFor(stage.enemy.name, stage.enemy.role)}
            beat={beat}
          />
        )}

        {beat !== null && <FloatingText beat={beat} />}

        {beat?.kind === 'encounter' && stage.encounter !== null && (
          <span key={beat.seq} className="msn-stage-callout">
            {stage.boss
              ? t('missions:remaster.bossEncounter', { n: stage.encounter })
              : t('missions:remaster.encounter', { n: stage.encounter })}
          </span>
        )}

        {stage.outcome !== null && (
          <span
            className={clsx(
              'msn-stage-outcome',
              stage.outcome === 'victory'
                ? 'msn-stage-outcome--victory'
                : 'msn-stage-outcome--defeat',
            )}
          >
            <MissionPixelIcon icon={stage.outcome === 'victory' ? 'victory' : 'defeat'} size="xl" />
            {stage.outcome === 'victory'
              ? t('missions:remaster.victory')
              : t('missions:remaster.defeat')}
          </span>
        )}
      </div>
      {!reducedMotion && (
        <button
          type="button"
          className="msn-btn-link self-end text-xs"
          onClick={() => {
            setPaused((value) => !value)
          }}
        >
          {paused ? t('missions:remaster.resumeAnimation') : t('missions:remaster.pauseAnimation')}
        </button>
      )}
    </div>
  )
}
