import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

import { PowerMeter } from '../PowerMeter'
import type { HeroPower } from '../power'

/**
 * Vista previa de desarrollo del medidor de Poder (HU-11).
 *
 * NO ES UNA PANTALLA DEL PRODUCTO. El medidor todavía no está montado en ninguna
 * pantalla: para ello hace falta el inicio de batalla y un evento de Combat que
 * lleve el Poder de cada participante, y ninguno de los dos existe. Esta vista
 * permite revisar el diseño, los estados y cómo se ve el valor actualizado sin
 * esperar a Combat.
 *
 * MONTA EL COMPONENTE DE PRODUCCIÓN, no una copia: si `PowerMeter` cambia, esta
 * vista cambia con él.
 *
 * LOS VALORES DE ESTE RECORRIDO SON DATOS DE EJEMPLO, no el resultado de aplicar
 * una regla: la interfaz no calcula el Poder, lo muestra. Siguen la secuencia
 * 10 → −4 → +2 → −8 → +2 → fin de combate de `docs/hu-11-power.md` de
 * Player/Inventory, con los máximos de nivel 1 de la Tabla 6 (Guerrero Tanque 10,
 * Mago Fuego 8).
 *
 * Solo se alcanza con `import.meta.env.DEV` (ver `src/routes/dev-routes.tsx`).
 */
interface Paso {
  readonly evento: string
  readonly tanque: HeroPower
  readonly fuego: HeroPower
}

const FUEGO_INTACTO: HeroPower = { current: 8, max: 8 }

const PASOS: readonly Paso[] = [
  {
    evento: 'Empieza el combate: cada héroe arranca con su Poder máximo.',
    tanque: { current: 10, max: 10 },
    fuego: FUEGO_INTACTO,
  },
  {
    evento: 'El Guerrero Tanque usa una habilidad de costo 4.',
    tanque: { current: 6, max: 10 },
    fuego: FUEGO_INTACTO,
  },
  {
    evento: 'Llega un turno: el Guerrero Tanque recupera 2.',
    tanque: { current: 8, max: 10 },
    fuego: FUEGO_INTACTO,
  },
  {
    evento: 'El Guerrero Tanque usa una habilidad de costo 8.',
    tanque: { current: 0, max: 10 },
    fuego: FUEGO_INTACTO,
  },
  {
    evento: 'Llega un turno: el Guerrero Tanque recupera 2.',
    tanque: { current: 2, max: 10 },
    fuego: FUEGO_INTACTO,
  },
  {
    evento: 'Termina el combate: el Poder de todos se restaura por completo.',
    tanque: { current: 10, max: 10 },
    fuego: FUEGO_INTACTO,
  },
]

const ESTADOS: readonly { readonly titulo: string; readonly power: HeroPower }[] = [
  { titulo: 'Lleno', power: { current: 10, max: 10 } },
  { titulo: 'Parcial', power: { current: 6, max: 10 } },
  { titulo: 'Vacío', power: { current: 0, max: 10 } },
  { titulo: 'Héroe sin Poder máximo', power: { current: 0, max: 0 } },
  { titulo: 'Dato roto (actual mayor que el máximo)', power: { current: 11, max: 10 } },
]

export const PowerMeterDevPreview = (): React.JSX.Element => {
  const [indice, setIndice] = useState(0)
  const ultimo = PASOS.length - 1
  const paso = PASOS[indice] ?? PASOS[0]

  if (paso === undefined) {
    throw new Error('el recorrido de la vista previa no puede estar vacío')
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-ink">
          Vista previa del medidor de Poder (HU-11)
        </h1>
        <p className="mt-1 text-sm text-muted">
          Vista de desarrollo: el medidor aún no está en ninguna pantalla del producto.
        </p>
      </header>

      <Card
        title="Recorrido de un combate"
        description="Los valores son de ejemplo. La interfaz real muestra el Poder que envíe Combat, sin calcularlo."
      >
        <p className="text-sm text-ink" aria-live="polite" data-testid="evento">
          {`Evento ${String(indice + 1)} de ${String(PASOS.length)}: ${paso.evento}`}
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <section aria-label="Guerrero Tanque">
            <h3 className="mb-1 text-sm font-medium text-ink">Guerrero Tanque</h3>
            <PowerMeter heroName="Guerrero Tanque" power={paso.tanque} />
          </section>
          <section aria-label="Mago Fuego">
            <h3 className="mb-1 text-sm font-medium text-ink">Mago Fuego</h3>
            <PowerMeter heroName="Mago Fuego" power={paso.fuego} />
          </section>
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            disabled={indice === ultimo}
            onClick={() => {
              setIndice((actual) => Math.min(actual + 1, ultimo))
            }}
          >
            Siguiente evento
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setIndice(0)
            }}
          >
            Reiniciar
          </Button>
        </div>
      </Card>

      <Card
        title="Estados del medidor"
        description="Cómo se ve cada caso, incluido un dato que la regla nunca produciría."
      >
        <ul className="grid gap-4 sm:grid-cols-2">
          {ESTADOS.map((estado) => (
            <li key={estado.titulo}>
              <h3 className="mb-1 text-xs font-medium text-muted">{estado.titulo}</h3>
              <PowerMeter heroName={estado.titulo} power={estado.power} />
            </li>
          ))}
        </ul>
      </Card>
    </main>
  )
}
