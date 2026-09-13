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
  stackable: 'Apilable',
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
  // Estadísticas afectadas por un efecto (mismo vocabulario que
  // features/admin/products/contract.ts STATISTIC_LABELS).
  POWER: 'Poder',
  HEALTH: 'Vida',
  DEFENSE: 'Defensa',
  ATTACK: 'Ataque',
  CRITICAL_CHANCE: 'Probabilidad crítica',
  // Operaciones de un efecto (mismo vocabulario que
  // features/admin/products/contract.ts EFFECT_OPERATION_LABELS).
  INCREASE: 'Aumentar',
  DECREASE: 'Disminuir',
  MULTIPLY: 'Multiplicar',
  SET: 'Fijar',
  BLOCK: 'Bloquear',
  RESTORE: 'Restaurar',
}

const labelFor = (key: string): string => LABELS[key] ?? key.replace(/([a-z])([A-Z])/gu, '$1 $2')

const isPlainObject = (value: unknown): value is Readonly<Record<string, unknown>> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const formatScalar = (value: unknown): string => {
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (typeof value === 'string') return VALUES[value] ?? value
  if (typeof value === 'number') return String(value)
  return '—'
}

/** Fila simple "etiqueta: valor", para un atributo que no es objeto ni arreglo. */
const ScalarRow = ({
  label,
  value,
}: {
  readonly label: string
  readonly value: React.ReactNode
}): React.JSX.Element => (
  <div className="flex items-baseline justify-between gap-4 border-b border-border/60 py-1.5 last:border-b-0">
    <dt className="text-xs font-medium tracking-wide text-muted uppercase">{label}</dt>
    <dd className="text-right text-sm text-ink">{value}</dd>
  </div>
)

/** Arreglo de valores simples (p. ej. clases compatibles): en chips, no en vinetas. */
const ChipList = ({ values }: { readonly values: readonly unknown[] }): React.JSX.Element => (
  <div className="flex flex-wrap justify-end gap-1">
    {values.map((value, index) => (
      <span
        key={index}
        className="rounded-full border border-border bg-surface px-2 py-0.5 text-xs text-ink"
      >
        {formatScalar(value)}
      </span>
    ))}
  </div>
)

/** Un objeto anidado (p. ej. un efecto) en su propia tarjeta, para separarlo visualmente. */
const AttributeGroupCard = ({
  values,
}: {
  readonly values: Readonly<Record<string, unknown>>
}): React.JSX.Element => (
  <div className="rounded-md border border-border bg-surface p-3">
    <ProductAttributes values={values} />
  </div>
)

/** Presentacion del esquema versionado, sin recalcular efectos ni reglas del combate. */
export const ProductAttributes = ({
  values,
}: {
  readonly values: Readonly<Record<string, unknown>>
}): React.JSX.Element => (
  <dl className="flex flex-col gap-1.5">
    {Object.entries(values).map(([key, value]) => {
      const label = labelFor(key)

      if (Array.isArray(value)) {
        if (value.length === 0) return <ScalarRow key={key} label={label} value="—" />

        if (value.every((entry) => !isPlainObject(entry)))
          return <ScalarRow key={key} label={label} value={<ChipList values={value} />} />

        return (
          <div key={key} className="flex flex-col gap-2 py-1">
            <dt className="text-xs font-semibold tracking-wide text-ink uppercase">{label}</dt>
            <dd className="flex flex-col gap-2">
              {value.map((entry, index) =>
                isPlainObject(entry) ? (
                  <AttributeGroupCard key={index} values={entry} />
                ) : (
                  <span key={index} className="text-sm text-ink">
                    {formatScalar(entry)}
                  </span>
                ),
              )}
            </dd>
          </div>
        )
      }

      if (isPlainObject(value))
        return (
          <div key={key} className="flex flex-col gap-2 py-1">
            <dt className="text-xs font-semibold tracking-wide text-ink uppercase">{label}</dt>
            <dd>
              <AttributeGroupCard values={value} />
            </dd>
          </div>
        )

      return <ScalarRow key={key} label={label} value={formatScalar(value)} />
    })}
  </dl>
)
