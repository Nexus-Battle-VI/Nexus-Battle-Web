import { useState } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Logotipo grafico de "THE NEXUS BATTLES VI — RETURN OF THE WARRIORS".
 *
 * Servido desde `public/assets/logo.png`, con un lockup textual de respaldo si
 * el archivo falla: la pantalla nunca depende de la imagen para seguir siendo
 * legible. Es el UNICO encabezado de marca de las pantallas de Autenticacion
 * (Login, Registro, Recuperacion), que lo pintan a traves de `AuthScene`.
 */
const LOGO_SRC = '/assets/logo.png'

export const NexusBrandHeader = (): React.JSX.Element => {
  const [logoFailed, setLogoFailed] = useState(false)
  const { t } = useTranslation()

  return (
    <header className="text-center">
      <p className="text-[0.65rem] uppercase tracking-[0.3em] text-muted">
        {t('app:brand.presents')}
      </p>

      {logoFailed ? (
        <>
          <p className="mt-1 text-xl font-semibold uppercase tracking-[0.16em] text-ink">
            The Nexus Battles VI
          </p>
          <p className="text-xs uppercase tracking-[0.3em] text-brand">Return of the Warriors</p>
          <span
            aria-hidden="true"
            className="mx-auto mt-2 block h-0.5 w-16 rounded-full bg-brand"
          />
        </>
      ) : (
        <img
          src={LOGO_SRC}
          alt="The Nexus Battles VI — Return of the Warriors"
          width={1600}
          height={600}
          // El asset es un banner ancho (~2.67:1), no un icono: necesita mas
          // ancho que un logo cuadrado para que "RETURN OF THE WARRIORS" siga
          // siendo legible a este tamano.
          className="mx-auto mt-1 h-auto w-[280px] max-w-full sm:w-[420px]"
          onError={() => {
            setLogoFailed(true)
          }}
        />
      )}
    </header>
  )
}
