import type { ReactNode } from 'react'
import clsx from 'clsx'
import { Link } from 'react-router'

import { NexusBrandHeader } from '@/components/ui/NexusBrandHeader'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

import './auth.css'

export type AuthSceneKind = 'gate' | 'oath'

export interface AuthSceneProps {
  /** `gate`: la Puerta de la Fortaleza; `oath`: la Sala del Juramento (registro). */
  readonly scene?: AuthSceneKind
  /** Enlace de vuelta, arriba a la izquierda. Sin el, solo queda el tema. */
  readonly back?: { readonly to: string; readonly label: string }
  /** Ancho maximo del contenido. */
  readonly width?: 'md' | 'lg' | 'xl'
  /** Desfile de heroes u otro decorado al pie de la escena. */
  readonly footer?: ReactNode
  readonly children: ReactNode
}

const WIDTH: Readonly<Record<NonNullable<AuthSceneProps['width']>, string>> = {
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-4xl',
}

/**
 * Escenario de las pantallas de Autenticacion (remaster EN-031): Login,
 * Registro, Recuperacion y los avisos de sesion. Pinta el fondo de PixelLab,
 * la barra superior (volver + tema), la marca y deja el contenido a la pagina,
 * que sigue siendo la duena de su `<main>`, sus textos y su accesibilidad.
 */
export const AuthScene = ({
  scene = 'gate',
  back,
  width = 'md',
  footer,
  children,
}: AuthSceneProps): React.JSX.Element => (
  <div className={clsx('auth-scene', `auth-scene--${scene}`)}>
    <div className={clsx('auth-column mx-auto w-full', WIDTH[width])}>
      <div className="flex items-center justify-between gap-3">
        {back === undefined ? (
          <span />
        ) : (
          <Link to={back.to} className="auth-back">
            {back.label}
          </Link>
        )}
        <ThemeToggle />
      </div>

      <div className="auth-brand mt-3">
        <NexusBrandHeader />
      </div>

      <div className="mt-6">{children}</div>
    </div>
    {footer !== undefined && <div className="auth-footer">{footer}</div>}
  </div>
)
