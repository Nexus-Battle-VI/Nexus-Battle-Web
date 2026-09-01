import { useState } from 'react'

export interface CartPanelState {
  readonly expanded: boolean
  readonly toggle: () => void
}

/**
 * Estado desplegado/minimizado del carrito.
 *
 * Vive fuera de `CartPanel.tsx` porque ese fichero solo exporta componentes:
 * mezclar un hook con ellos rompe la recarga en caliente de React.
 */
export const useCartPanelState = (initiallyExpanded = false): CartPanelState => {
  const [expanded, setExpanded] = useState(initiallyExpanded)

  return {
    expanded,
    toggle: (): void => {
      setExpanded((current) => !current)
    },
  }
}
