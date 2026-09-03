const LABELS: Readonly<Record<string, string>> = {
  kind: 'Tipo',
  heroSubtype: 'Clase de héroe',
  basePower: 'Poder',
  baseHealth: 'Salud',
  baseDefense: 'Defensa',
  baseAttack: 'Ataque',
  baseDamage: 'Daño',
  baseHealing: 'Curación',
  abilities: 'Habilidades',
  compatibleHeroSubtypes: 'Héroes compatibles',
  compatibleHeroSubtype: 'Héroe compatible',
  compatibilityScope: 'Compatibilidad',
  powerCostMode: 'Consumo de poder',
  powerCost: 'Coste de poder',
  chargeTurns: 'Turnos de carga',
  cooldownTurns: 'Turnos de recarga',
  effects: 'Efectos',
  generalEffect: 'Efecto general',
  specificEffect: 'Efecto específico',
  slot: 'Parte de armadura',
  setCode: 'Conjunto',
  target: 'Objetivo',
  statistic: 'Estadística',
  operation: 'Operación',
  magnitude: 'Magnitud',
  mode: 'Modo',
  amount: 'Cantidad',
  basisPoints: 'Puntos base',
  count: 'Número de dados',
  sides: 'Caras',
  durationTurns: 'Duración en turnos',
  immunityCode: 'Inmunidad',
  statusCode: 'Estado',
}
const VALUES: Readonly<Record<string, string>> = {
  FIXED: 'Fijo',
  DICE: 'Dados',
  PERCENTAGE: 'Porcentaje',
  ALL_AVAILABLE: 'Todo el poder disponible',
  ALL_HEROES: 'Todos los héroes',
  SELECTED_SUBTYPES: 'Clases indicadas',
  SELF: 'A sí mismo',
  ALLY: 'Aliado',
  ALLIED_GROUP: 'Grupo aliado',
  OPPONENT: 'Oponente',
  ENEMY_GROUP: 'Grupo enemigo',
  STAT_MODIFIER: 'Modificar estadística',
  DAMAGE: 'Daño',
  HEALING: 'Curación',
  IMMUNITY: 'Inmunidad',
  REFLECT_DAMAGE: 'Reflejar daño',
  REVIVE: 'Revivir',
  TEMPORARY_STATUS: 'Estado temporal',
  HEROE: 'Héroe',
  HABILIDAD: 'Habilidad',
  ARMA: 'Arma',
  ARMADURA: 'Armadura',
  ITEM: 'Ítem',
  EPICA: 'Épica',
}
const AttributeValue = ({ value }: { readonly value: unknown }): React.JSX.Element => {
  if (Array.isArray(value))
    return (
      <ul className="flex flex-col gap-1">
        {value.map((entry: unknown, index) => (
          <li key={index}>
            <AttributeValue value={entry} />
          </li>
        ))}
      </ul>
    )
  if (value !== null && typeof value === 'object')
    return <ProductAttributes values={value as Record<string, unknown>} />
  return (
    <span>
      {typeof value === 'boolean'
        ? value
          ? 'Sí'
          : 'No'
        : typeof value === 'string'
          ? (VALUES[value] ?? value)
          : typeof value === 'number'
            ? String(value)
            : '—'}
    </span>
  )
}

/** Presentacion del esquema versionado, sin recalcular efectos ni reglas del combate. */
export const ProductAttributes = ({
  values,
}: {
  readonly values: Readonly<Record<string, unknown>>
}): React.JSX.Element => (
  <dl className="flex min-w-0 flex-col gap-1 text-xs text-muted">
    {Object.entries(values).map(([key, value]) => (
      <div key={key} className="min-w-0 break-words">
        <dt className="font-medium">{LABELS[key] ?? key.replace(/([a-z])([A-Z])/gu, '$1 $2')}</dt>
        <dd className="pl-2">
          <AttributeValue value={value} />
        </dd>
      </div>
    ))}
  </dl>
)
