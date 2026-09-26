import { useTranslation } from 'react-i18next'

import { i18n } from '@/shared/i18n/i18n'
/*
 * Etiquetas de CLAVES y CODIGOS del esquema versionado (`commerce:attributes.*`).
 * Son vocabulario de la interfaz, no contenido: un nombre de habilidad o un
 * texto libre que llegue como valor se muestra tal cual. Una clave o codigo sin
 * traduccion conocida cae a su forma legible (clave) o a su valor original.
 */
const labelFor = (key: string): string => {
  const translationKey = `commerce:attributes.labels.${key}`

  return i18n.exists(translationKey)
    ? i18n.t(translationKey)
    : key.replace(/([a-z])([A-Z])/gu, '$1 $2')
}

const isPlainObject = (value: unknown): value is Readonly<Record<string, unknown>> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const formatScalar = (value: unknown): string => {
  if (typeof value === 'boolean') return value ? i18n.t('common:yes') : i18n.t('common:no')
  if (typeof value === 'string') {
    const translationKey = `commerce:attributes.values.${value}`

    return i18n.exists(translationKey) ? i18n.t(translationKey) : value
  }
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
}): React.JSX.Element => {
  // Se suscribe al idioma: las etiquetas se vuelven a pintar al cambiarlo.
  useTranslation()

  return (
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
}
