/**
 * Indicador de disponibilidad de un producto (HU-34).
 *
 * SE DERIVA DE LA DISPONIBILIDAD, NO DEL ESTADO. Agotado y suspendido son
 * condiciones INDEPENDIENTES: la primera se resuelve ampliando el tiraje y la
 * segunda exige reactivar el producto. Pintar «Agotado» leyendo
 * `lifecycleStatus` mostraria una insignia que nunca cambia, porque el servicio
 * no toca ese campo al agotarse.
 *
 * `null` es tiraje infinito, y ahi el valor es la ausencia de contador: no
 * significa «se desconoce».
 */
export const AvailabilityBadge = ({
  availableUnits,
}: {
  readonly availableUnits: number | null
}): React.JSX.Element => {
  if (availableUnits === null) {
    return (
      <span className="inline-flex items-center rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
        Disponible (infinito)
      </span>
    )
  }

  if (availableUnits === 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-danger/10 px-3 py-1 text-xs font-medium text-danger">
        Agotado
      </span>
    )
  }

  return (
    <span className="inline-flex items-center rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
      Disponible · {availableUnits} {availableUnits === 1 ? 'unidad' : 'unidades'}
    </span>
  )
}
