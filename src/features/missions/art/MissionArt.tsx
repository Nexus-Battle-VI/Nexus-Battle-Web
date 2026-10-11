import clsx from 'clsx'

import { useTheme } from '@/shared/theme'

import type { MissionCategory } from '../missionApi'
import { missionScenes } from '../missionsRemasterAssets'

/**
 * Ilustraciones de las misiones (diseño «misiones jugables», P-J11; remaster
 * EN-031). Missions guarda en `imageRef` el nombre de la escena; aquí cada
 * nombre es una escena de PixelLab servida desde los recursos del proyecto,
 * con su variante Dark y Light. Un nombre desconocido, o ninguno, usa la
 * escena de su categoría: una misión nueva siempre tiene imagen.
 *
 * Se pinta dentro de un `svg` con `preserveAspectRatio="xMidYMid slice"`: la
 * escena llena cualquier caja (tarjeta, cabecera, escenario) sin deformarse,
 * y el pixel art se escala sin suavizado.
 *
 * Son decorativas: el nombre de la misión ya está en el texto, así que el SVG va
 * con `aria-hidden`.
 */
const BY_CATEGORY: Readonly<Record<MissionCategory, string>> = {
  STORY: 'mision-templo-olvidado',
  CHALLENGE: 'mision-arena-caidos',
  EXPLORATION: 'mision-travesia-bosque',
}

const knownScene = (imageRef: string | null): string | null =>
  imageRef !== null && imageRef in missionScenes ? imageRef : null

/** La escena de una misión: la de su imagen o, si no se conoce, la de su categoría. */
const sceneNameOf = (imageRef: string | null, category: MissionCategory | null): string =>
  knownScene(imageRef) ?? `categoria-${category ?? 'STORY'}`

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
  const theme = useTheme((state) => state.theme)
  const scene = missionScenes[knownScene(imageRef) ?? BY_CATEGORY[category ?? 'STORY']]
  return (
    <svg
      viewBox="0 0 688 384"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      data-scene={sceneNameOf(imageRef, category)}
      className={clsx('block w-full bg-[#120f18]', className)}
    >
      {scene !== undefined && (
        <image
          href={scene[theme]}
          width="688"
          height="384"
          preserveAspectRatio="xMidYMid slice"
          style={{ imageRendering: 'pixelated' }}
        />
      )}
    </svg>
  )
}
