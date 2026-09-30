import { useId } from 'react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import { Avatar } from '@/components/ui/Avatar'
import { heroIdFromSubtype } from '@/features/player-inventory/equipment/heroSubtype'
import { avatarPathForSubject } from '@/shared/avatar'
import { Hero3D } from '@/shared/visual-library/heroes'

import '../battle-rooms.css'
import { combatantName } from './presentation'
import type { BattleView, TurnOrderEntry } from './types'

interface CombatantCardProps {
  readonly entry: TurnOrderEntry
  readonly isSelf: boolean
  readonly isActive: boolean
  /** Cuantos participantes hay en su lado: decide el tamano del heroe, sin casos por nombre. */
  readonly sideSize: number
  /** `true` si este combatiente es un objetivo valido para el ataque actual (HU-18/21). */
  readonly isTargetable: boolean
  readonly isTargetSelected: boolean
  readonly onSelectTarget?: ((entry: TurnOrderEntry) => void) | undefined
}

/**
 * Ancho maximo del heroe segun cuantos comparten lado: prominente en 1 contra 1, mas
 * compacto conforme crece el equipo. En pantallas amplias tambien lo acota la altura de la
 * ventana (`vh`), para que ambos heroes quepan sin desplazarse dentro de la arena.
 */
const heroWidth = (sideSize: number): string =>
  sideSize <= 1
    ? 'max-w-32 sm:max-w-36 md:max-w-[min(9rem,20vh)] 2xl:max-w-[min(11rem,22vh)]'
    : sideSize === 2
      ? 'max-w-24 sm:max-w-28 md:max-w-[min(7rem,15vh)] 2xl:max-w-[min(8rem,17vh)]'
      : 'max-w-20 sm:max-w-24 lg:max-w-[min(5.5rem,12vh)] 2xl:max-w-[min(6.5rem,13vh)]'

/** Columnas de un lado: una sola en movil (nunca dos heroes diminutos a 320 px) y hasta tres desde `sm`. */
const sideColumns = (sideSize: number): string =>
  sideSize <= 1
    ? 'grid-cols-1'
    : sideSize === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : 'grid-cols-1 sm:grid-cols-3'

/**
 * Un combatiente SOBRE el campo de batalla: su heroe (modelo real de la biblioteca visual, o un
 * marcador cuando no hay heroe conocido -- p. ej. un oponente IA), un nameplate compacto (nombre +
 * insignias minimas) debajo. SIN caja opaca detras -- el heroe se ve sobre el fondo de la arena
 * (remaster visual Sprint 3, 2a pasada, seccion 20 del brief: "el modelo debe respirar
 * visualmente"). La Vida y el Poder viven en la columna de estado del HUD (`BattleStatusList`),
 * no aqui.
 *
 * NUNCA muestra `playerId`, `heroId` ni ningun identificador tecnico. El equipo no se repite en
 * cada tarjeta: ya lo dice el titulo del lado (y el `aria-label`, para lectores de pantalla).
 *
 * Cuando es un objetivo valido (`isTargetable`), el AREA DEL HEROE es el control real
 * (`<button>`): un clic aqui selecciona el mismo objetivo que el `AttackPanel`/`SkillList` (estado
 * compartido, elevado a `BattleScreen`) -- sin mover geometria, sin capas nuevas.
 */
const CombatantCard = ({
  entry,
  isSelf,
  isActive,
  sideSize,
  isTargetable,
  isTargetSelected,
  onSelectTarget,
}: CombatantCardProps): React.JSX.Element => {
  const modelId = entry.heroSubtype === null ? null : heroIdFromSubtype(entry.heroSubtype)
  const name = combatantName(entry)
  const { t } = useTranslation()

  const model = (
    <div className={clsx('br-combatant-model w-full', heroWidth(sideSize))}>
      {modelId === null ? (
        <div
          role="img"
          aria-label={name}
          className="flex aspect-square w-full items-center justify-center rounded-md bg-surface-raised/70 text-2xl font-bold text-muted"
        >
          {name.charAt(0).toUpperCase()}
        </div>
      ) : (
        <Hero3D heroId={modelId} className="text-center" />
      )}
    </div>
  )

  return (
    <li
      aria-label={t('battle:battle.combatantLabel', {
        name,
        you: isSelf ? ` ${t('battle:you')}` : '',
        team: entry.teamLabel,
        current: isActive ? t('battle:battle.currentSuffix') : '',
      })}
      className={clsx('br-combatant', isActive && 'br-combatant--active')}
    >
      {isTargetable ? (
        <button
          type="button"
          data-selected={isTargetSelected}
          aria-pressed={isTargetSelected}
          aria-label={t('battle:attack.selectTarget', { name })}
          className="br-combatant-target"
          onClick={() => {
            onSelectTarget?.(entry)
          }}
        >
          {model}
        </button>
      ) : (
        model
      )}
      <div className="br-nameplate">
        {/* El avatar es del JUGADOR, no del heroe: acompana al nombre sin sustituir al
            modelo. Decorativo (el nombre ya se lee); una IA no tiene avatar. */}
        <Avatar
          avatarUrl={entry.kind === 'HUMAN' ? avatarPathForSubject(entry.playerId) : null}
          alt=""
          initials={name.charAt(0).toUpperCase()}
          size="sm"
        />
        <span className="min-w-0 truncate font-semibold">{name}</span>
        {isSelf && (
          <span
            style={{ color: 'var(--br-accent)' }}
            className="shrink-0 text-[10px] font-medium uppercase tracking-wide"
          >
            {t('battle:youBadge')}
          </span>
        )}
        {/* Pasada final (secciones 5-8, 82 del brief): el chip "TURNO ACTUAL"
            era redundante con "Turno de X"/"Tu turno" del Nexus Arena (arriba)
            -- y, al aparecer/desaparecer segun `isActive`, era la UNICA pieza
            de contenido que variaba entre dos renders con el mismo `entries`
            pero distinto turno, lo que bastaba para desestabilizar el ancho
            del nameplate. Se quita del heroe por completo; el aro/aura
            (`.br-combatant--active`, ver battle-rooms.css) sigue siendo la
            unica decoracion de turno aqui, y siempre fue un overlay absoluto
            sin efecto en el layout. */}
      </div>
    </li>
  )
}

export interface ArenaSideProps {
  /** Titulo corto del lado («Rival», «Tu héroe», «Tu equipo»). */
  readonly title: string
  readonly entries: readonly TurnOrderEntry[]
  readonly isSelf: (entry: TurnOrderEntry) => boolean
  readonly isCurrent: (entry: TurnOrderEntry) => boolean
  /** HU-18/21 (remaster 2a pasada): objetivo seleccionable directamente sobre el heroe. */
  readonly isTargetable?: (entry: TurnOrderEntry) => boolean
  readonly isTargetSelected?: (entry: TurnOrderEntry) => boolean
  readonly onSelectTarget?: (entry: TurnOrderEntry) => void
}

/**
 * Un lado de la arena. Las tarjetas se reparten en una rejilla propia (1, 2 o 3 columnas) que
 * no depende de nombres ni de casos por modalidad: solo de cuantos participantes trae.
 */
export const ArenaSide = ({
  title,
  entries,
  isSelf,
  isCurrent,
  isTargetable,
  isTargetSelected,
  onSelectTarget,
}: ArenaSideProps): React.JSX.Element => {
  const headingId = useId()

  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-2">
      {/* 8a pasada (secciones 5-9 del brief): "TU EQUIPO"/"RIVAL" se quitan
          de la vista sobre el piso de la arena -- la lectura espacial
          (izquierda = mi equipo, derecha = rival) ya es evidente, y el dato
          real (el nombre de cada heroe) sigue ahi. El titulo sigue
          existiendo para lectores de pantalla (`aria-labelledby`), solo
          deja de ser texto VISIBLE. */}
      <h2 id={headingId} className="sr-only">
        {title}
      </h2>
      <ul
        /* 10a pasada (secciones 20-23 del brief): la CANTIDAD real de
           combatientes de este lado -- nunca un nombre de heroe -- decide si
           aplica el ajuste extra de 3v3 (ver `.br-arena-side
           ul[data-side-size='3']` en `battle-rooms.css`). */
        data-side-size={entries.length}
        className={clsx(
          'grid flex-1 gap-2',
          sideColumns(entries.length),
          /* CAUSA RAIZ real del layout shift (pasada final, secciones 3-4
             del brief): este `<ul>` es el UNICO hijo (aparte del `<h2
             class="sr-only">`, sin tamano) de la `<section>` de
             `ArenaSide`, que a su vez es un flex-item de `.br-arena-side`
             SIN `flex-grow` propio -- su ancho, por defecto, es el
             "max-content" de su contenido. Con `max-width` (el ajuste de la
             9a/10a pasada) el `<ul>` seguia sin un ancho PROPIO: cualquier
             diferencia de contenido entre dos renders (antes, el chip
             "TURNO ACTUAL"; en general, nombres de distinta longitud)
             cambiaba el max-content del `<ul>`, cambiaba el ancho de TODA la
             `<section>`, y como `.br-arena-side--mine/--enemy` usa
             `justify-content: flex-end/flex-start` para pegar ese bloque
             contra el VS, un bloque con ancho distinto queda en una posicion
             distinta -- el equipo ENTERO se corria, no solo un heroe.
             `width` (no `max-width`) fija ese ancho a un valor SIEMPRE igual
             sin importar el contenido: la `<section>` y el bloque completo
             dejan de depender de nada que cambie por turno. */
          entries.length <= 1 && 'mx-auto w-[10rem]',
          entries.length === 2 && 'sm:mx-auto sm:w-[clamp(13rem,32vw,17rem)]',
          entries.length === 3 && 'sm:mx-auto sm:w-[clamp(18rem,44vw,24rem)]',
        )}
      >
        {entries.map((entry) => (
          <CombatantCard
            key={entry.position}
            entry={entry}
            isSelf={isSelf(entry)}
            isActive={isCurrent(entry)}
            sideSize={entries.length}
            isTargetable={isTargetable?.(entry) ?? false}
            isTargetSelected={isTargetSelected?.(entry) ?? false}
            onSelectTarget={onSelectTarget}
          />
        ))}
      </ul>
    </section>
  )
}

/** Re-exportado para que `BattleScreen` calcule Vida/Poder para la columna de estado (HUD). */
export type { BattleView }
