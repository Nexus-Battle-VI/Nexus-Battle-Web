import clsx from 'clsx'

import type { MissionCategory } from '../missionApi'

/**
 * Ilustraciones de las misiones (diseño «misiones jugables», P-J11). Missions
 * guarda en `imageRef` el nombre de la imagen; aquí cada nombre es una escena SVG
 * propia, sin archivos ni servicios externos. Un nombre desconocido, o ninguno,
 * usa la escena de su categoría: una misión nueva siempre tiene imagen.
 *
 * Son decorativas: el nombre de la misión ya está en el texto, así que el SVG va
 * con `aria-hidden`.
 */
type Scene = () => React.JSX.Element

const Camino: Scene = () => (
  <>
    <defs>
      <linearGradient id="art-camino-cielo" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#3b1d5a" />
        <stop offset="0.6" stopColor="#c2566b" />
        <stop offset="1" stopColor="#f2a65a" />
      </linearGradient>
    </defs>
    <rect width="320" height="120" fill="url(#art-camino-cielo)" />
    <circle cx="250" cy="70" r="16" fill="#ffd28a" opacity="0.9" />
    <path d="M0 95 Q80 70 160 88 T320 80 V120 H0 Z" fill="#2c1f3d" />
    <path d="M196 64 h36 v-6 h-4 v-10 l-14 -8 l-14 8 v10 h-4 Z" fill="#1c1428" />
    <path d="M150 120 C170 105 190 95 214 72 L220 74 C200 98 186 110 176 120 Z" fill="#8a6b4f" />
    <path d="M20 96 l8 -24 l8 24 Z M44 98 l10 -30 l10 30 Z M280 92 l7 -20 l7 20 Z" fill="#1c1428" />
  </>
)

const Templo: Scene = () => (
  <>
    <defs>
      <linearGradient id="art-templo-cielo" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#0f2a24" />
        <stop offset="1" stopColor="#2f5a44" />
      </linearGradient>
      <radialGradient id="art-templo-luz" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#ffe9a8" />
        <stop offset="1" stopColor="#ffe9a8" stopOpacity="0" />
      </radialGradient>
    </defs>
    <rect width="320" height="120" fill="url(#art-templo-cielo)" />
    <path d="M0 120 V70 l20 -30 l20 30 l18 -26 l18 26 V120 Z" fill="#0b1f1a" />
    <path d="M250 120 V72 l18 -28 l18 28 l16 -24 l18 24 V120 Z" fill="#0b1f1a" />
    <path d="M100 58 L160 30 L220 58 Z" fill="#6f7f6a" />
    <rect x="104" y="58" width="112" height="8" fill="#5c6b58" />
    <g fill="#8a9884">
      <rect x="112" y="66" width="10" height="42" />
      <rect x="134" y="66" width="10" height="42" />
      <rect x="176" y="66" width="10" height="42" />
      <rect x="198" y="66" width="10" height="42" />
    </g>
    <rect x="150" y="76" width="20" height="32" fill="#ffd978" />
    <circle cx="160" cy="92" r="30" fill="url(#art-templo-luz)" />
    <rect x="96" y="108" width="128" height="12" fill="#4a5646" />
  </>
)

const Camara: Scene = () => (
  <>
    <defs>
      <radialGradient id="art-camara-sello" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#8fe3ff" />
        <stop offset="0.5" stopColor="#3aa6d8" stopOpacity="0.6" />
        <stop offset="1" stopColor="#12324a" stopOpacity="0" />
      </radialGradient>
    </defs>
    <rect width="320" height="120" fill="#0d1622" />
    <path d="M0 0 H320 V24 Q160 44 0 24 Z" fill="#162436" />
    <circle cx="160" cy="68" r="48" fill="url(#art-camara-sello)" />
    <circle cx="160" cy="68" r="26" fill="none" stroke="#bdf0ff" strokeWidth="2" />
    <path
      d="M160 46 L166 62 L182 68 L166 74 L160 90 L154 74 L138 68 L154 62 Z"
      fill="#e6fbff"
      opacity="0.85"
    />
    <g fill="#223449">
      <rect x="20" y="96" width="60" height="6" />
      <rect x="30" y="102" width="60" height="6" />
      <rect x="40" y="108" width="60" height="12" />
      <rect x="240" y="30" width="16" height="90" />
      <rect x="64" y="30" width="16" height="66" />
    </g>
  </>
)

const Arena: Scene = () => (
  <>
    <defs>
      <linearGradient id="art-arena-cielo" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#5a1414" />
        <stop offset="1" stopColor="#d8743a" />
      </linearGradient>
    </defs>
    <rect width="320" height="120" fill="url(#art-arena-cielo)" />
    <path d="M20 120 V52 Q160 20 300 52 V120 Z" fill="#3a1a12" />
    <g fill="#d8743a" opacity="0.55">
      <path d="M44 120 V78 a10 10 0 0 1 20 0 V120 Z" />
      <path d="M84 120 V70 a10 10 0 0 1 20 0 V120 Z" />
      <path d="M124 120 V66 a10 10 0 0 1 20 0 V120 Z" />
      <path d="M176 120 V66 a10 10 0 0 1 20 0 V120 Z" />
      <path d="M216 120 V70 a10 10 0 0 1 20 0 V120 Z" />
      <path d="M256 120 V78 a10 10 0 0 1 20 0 V120 Z" />
    </g>
    <g stroke="#f4d9a6" strokeWidth="4" strokeLinecap="round">
      <path d="M140 34 L180 74" />
      <path d="M180 34 L140 74" />
    </g>
    <rect x="0" y="108" width="320" height="12" fill="#caa06a" />
  </>
)

const Bosque: Scene = () => (
  <>
    <defs>
      <linearGradient id="art-bosque-cielo" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#111a2e" />
        <stop offset="1" stopColor="#3d5a6b" />
      </linearGradient>
    </defs>
    <rect width="320" height="120" fill="url(#art-bosque-cielo)" />
    <circle cx="258" cy="28" r="12" fill="#e7f0f7" />
    <path d="M0 120 V80 l14 -34 l14 34 l14 -44 l14 44 l14 -30 l14 30 V120 Z" fill="#23384a" />
    <path
      d="M200 120 V76 l16 -42 l16 42 l14 -32 l14 32 l16 -40 l16 40 l12 -28 l16 28 V120 Z"
      fill="#23384a"
    />
    <path d="M60 120 V92 l18 -40 l18 40 l16 -30 l16 30 l18 -38 l18 38 V120 Z" fill="#152534" />
    <rect x="0" y="92" width="320" height="10" fill="#cfe2ee" opacity="0.25" />
    <rect x="0" y="104" width="320" height="16" fill="#0c1621" />
  </>
)

const SCENES: Readonly<Record<string, Scene>> = {
  'mision-camino-templo': Camino,
  'mision-templo-olvidado': Templo,
  'mision-camara-sellada': Camara,
  'mision-arena-caidos': Arena,
  'mision-travesia-bosque': Bosque,
}

const BY_CATEGORY: Readonly<Record<MissionCategory, Scene>> = {
  STORY: Templo,
  CHALLENGE: Arena,
  EXPLORATION: Bosque,
}

/** La escena de una misión: la de su imagen o, si no se conoce, la de su categoría. */
const sceneNameOf = (imageRef: string | null, category: MissionCategory | null): string =>
  imageRef !== null && imageRef in SCENES ? imageRef : `categoria-${category ?? 'STORY'}`

export interface MissionArtProps {
  readonly imageRef: string | null
  readonly category: MissionCategory | null
  readonly className?: string
}

export const MissionArt = ({
  imageRef,
  category,
  className,
}: MissionArtProps): React.JSX.Element => {
  const Scene =
    (imageRef === null ? undefined : SCENES[imageRef]) ?? BY_CATEGORY[category ?? 'STORY']
  return (
    <svg
      viewBox="0 0 320 120"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      data-scene={sceneNameOf(imageRef, category)}
      className={clsx('block w-full', className)}
    >
      <Scene />
    </svg>
  )
}
