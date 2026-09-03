import { useState } from 'react'

import type { AvailableHero } from './heroSelectionApi'
import { HeroSelectionView } from './HeroSelectionView'
import { useAvailableHeroes, useHeroSelection, useSelectHero } from './useHeroSelection'

/**
 * Selección y preparación inicial del héroe (HU-07, RF-07).
 *
 * VIVE EN LA RAÍZ DE `player-inventory` Y NO EN UNA SUBCARPETA PROPIA. HU-07
 * reutiliza módulos de HU-28 (`./equipment/*`), y la regla de arquitectura del
 * proyecto prohíbe los imports `../otra-carpeta/`: desde una subcarpeta
 * hermana, cada uso de HU-28 sería exactamente ese patrón. Aplanar mantiene la
 * reutilización explícita —que es lo que la TASK HU-07.2 pide— sin relajar una
 * regla compartida.
 *
 * QUÉ DECIDE ESTA PANTALLA Y QUÉ NO. Aquí se elige con qué héroe se va a jugar
 * y se ve con qué entraría. **No se equipa**: eso es HU-28 y vive en «Mi
 * Inventario», adonde lleva el botón del pie. Construir aquí una segunda
 * interacción de equipamiento duplicaría reglas en el cliente, que es el riesgo
 * que la TASK HU-07.3 enumera primero.
 *
 * NINGUNA REGLA VIVE EN EL CLIENTE. Los héroes disponibles, los límites 2/6/2 y
 * si la configuración está lista los decide el servicio; esta pantalla los
 * presenta. Por eso `readiness` se muestra tal cual llega, con el motivo que
 * envía el servicio, en lugar de recalcularlo aquí.
 *
 * LO ELEGIDO SE DERIVA, NO SE DUPLICA. El héroe resaltado sale de lo que el
 * servicio marca como preparado, y solo se mantiene en estado local la elección
 * que quien juega acaba de hacer y todavía no se ha guardado. Guardar una copia
 * del héroe seleccionado obligaría a sincronizarla con la respuesta y abriría la
 * puerta a que la pantalla enseñara un héroe y el servicio tuviera otro.
 */
export const HeroSelectionPage = (): React.JSX.Element => {
  const heroesQuery = useAvailableHeroes()
  const selectionQuery = useHeroSelection()
  const seleccion = useSelectHero()

  // Solo la elección en curso. La verdad sigue siendo la respuesta del servicio.
  const [enCurso, setEnCurso] = useState<string | null>(null)

  const heroes = heroesQuery.data ?? []
  const seleccionado = selectionQuery.data ?? null
  const referenciaActiva =
    enCurso ??
    seleccionado?.configuration.hero.reference ??
    heroes.find((hero) => hero.selected)?.reference ??
    null

  const elegir = (hero: AvailableHero): void => {
    setEnCurso(hero.reference)
    seleccion.mutate(hero.reference)
  }

  return (
    <HeroSelectionView
      heroes={heroes}
      selection={seleccionado}
      isLoading={heroesQuery.isLoading || selectionQuery.isLoading}
      loadError={heroesQuery.error ?? selectionQuery.error}
      loaded={heroesQuery.data !== undefined}
      activeReference={referenciaActiva}
      pending={seleccion.isPending}
      selectError={seleccion.isError ? seleccion.error : null}
      onChoose={elegir}
    />
  )
}
