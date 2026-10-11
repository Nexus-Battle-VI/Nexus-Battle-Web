import { useEffect } from 'react'

export type WorldVariant = 'full' | 'dim'

/**
 * Mundo vivo de fondo (EN-031): cielo, nubes que derivan, colinas del primer
 * plano y brasas (Dark) o polen (Light). Fijo detras de TODO el armazon, de
 * modo que se ve alrededor de la tarjeta de cada modulo y bajo la cabecera.
 *
 * Decorativo (`aria-hidden`). Todo el movimiento es CSS (`shell.css`) sobre
 * `transform`/`opacity`: se detiene con `prefers-reduced-motion` y se pausa
 * con la pestana oculta (`data-page-hidden` en `<html>`, ver abajo).
 *
 * `dim` oscurece el mundo y apaga las particulas en los modulos que ya pintan
 * su propio escenario, para que el fondo no compita con ellos.
 */
export const WorldBackdrop = ({
  variant,
}: {
  readonly variant: WorldVariant
}): React.JSX.Element => {
  useEffect(() => {
    const root = document.documentElement
    const sync = (): void => {
      if (document.hidden) root.dataset.pageHidden = 'true'
      else delete root.dataset.pageHidden
    }
    sync()
    document.addEventListener('visibilitychange', sync)
    return () => {
      document.removeEventListener('visibilitychange', sync)
      delete root.dataset.pageHidden
    }
  }, [])

  return (
    <div className="nb-world" data-variant={variant} aria-hidden="true">
      <div className="nb-world__sky" />
      <div className="nb-world__clouds" />
      <div className="nb-world__mid" />
      <div className="nb-world__embers" />
    </div>
  )
}
