import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router'

import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { SelectField } from '@/components/ui/form/SelectField'
import { TextField } from '@/components/ui/form/TextField'

import {
  adjustProductInventory,
  describeAdjustmentFailure,
  fetchAdministeredProduct,
  type AdministeredProduct,
} from './api'
import { AvailabilityBadge } from './AvailabilityBadge'

type Modalidad = 'LIMITED' | 'INFINITE'

/**
 * Ajuste del tiraje de un producto (HU-34, CA-02).
 *
 * PRIMERO SE LEE, LUEGO SE ESCRIBE. La pantalla muestra el estado actual
 * -cuantas unidades quedan de cuantas, y si esta agotado- antes de dejar
 * cambiar nada. Un formulario que solo enseñara el resultado despues de
 * escribir llegaria tarde: el administrador necesita ver «0 de 200» para
 * decidir a cuanto ampliar.
 *
 * LAS UNIDADES ENTREGADAS SE DERIVAN, igual que en el servicio:
 * `tiraje - disponibles`. Es el numero que marca el minimo al que se puede
 * reducir, y enseñarlo evita mandar un valor que el servicio va a rechazar.
 *
 * NO SE ENVIA LA DISPONIBILIDAD. Solo el tiraje; el recalculo es del servicio.
 * Dejar que la pantalla fijara el contador permitiria reabrir un producto
 * agotado sin ampliar su tiraje, que es justo lo que la HU prohibe.
 */
export const AdjustInventoryPage = (): React.JSX.Element => {
  const { productId = '' } = useParams()
  const queryClient = useQueryClient()

  const consulta = useQuery({
    queryKey: ['admin', 'product', productId],
    queryFn: () => fetchAdministeredProduct(productId),
    enabled: productId !== '',
    retry: false,
  })

  const producto = consulta.data

  // El formulario se DERIVA de lo cargado mientras nadie lo haya tocado, y solo
  // entonces pasa a tener estado propio.
  //
  // Sembrarlo con un efecto obligaria a escribir estado dentro de un `useEffect`
  // en cuanto llega la respuesta, que es una cascada de renderizados evitable.
  // Asi ademas no hay un instante en el que el campo muestre un valor distinto
  // del que tiene el producto.
  const [edicion, setEdicion] = useState<{ modalidad: Modalidad; cantidad: string } | null>(null)
  const [errorDeCampo, setErrorDeCampo] = useState<string | undefined>(undefined)

  const modalidad: Modalidad =
    edicion?.modalidad ?? (producto?.printRunMode === 'INFINITE' ? 'INFINITE' : 'LIMITED')
  const cantidad =
    edicion?.cantidad ??
    (producto === undefined || producto.printRunMode === 'INFINITE'
      ? ''
      : String(producto.printRun))

  const setModalidad = (valor: Modalidad): void => {
    setEdicion({ modalidad: valor, cantidad })
  }
  const setCantidad = (valor: string): void => {
    setEdicion({ modalidad, cantidad: valor })
  }

  const ajuste = useMutation({
    mutationFn: (printRun: number) => adjustProductInventory(productId, printRun),
    onSuccess: (actualizado: AdministeredProduct) => {
      queryClient.setQueryData(['admin', 'product', productId], actualizado)
    },
  })

  const entregadas =
    producto?.availableUnits === undefined || producto.availableUnits === null
      ? null
      : producto.printRun - producto.availableUnits

  const enviar = (event: React.SyntheticEvent): void => {
    event.preventDefault()
    ajuste.reset()

    if (modalidad === 'INFINITE') {
      setErrorDeCampo(undefined)
      ajuste.mutate(-1)
      return
    }

    const valor = cantidad.trim()

    if (!/^\d+$/.test(valor) || Number(valor) < 1) {
      setErrorDeCampo('La cantidad debe ser un entero mayor o igual que 1.')
      return
    }

    // El minimo se comprueba tambien aqui, pero NO sustituye al del servicio:
    // esta comprobacion ahorra un viaje, y la que manda es la de Catalog, que
    // es quien conoce las entregas ocurridas mientras esta pantalla estaba
    // abierta.
    if (entregadas !== null && Number(valor) < entregadas) {
      setErrorDeCampo(`No puede ser inferior a las ${String(entregadas)} unidades ya entregadas.`)
      return
    }

    setErrorDeCampo(undefined)
    ajuste.mutate(Number(valor))
  }

  if (consulta.isPending) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <p className="text-sm text-muted">Cargando el producto…</p>
      </div>
    )
  }

  if (consulta.isError || producto === undefined) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <p className="text-sm text-danger">{describeAdjustmentFailure(consulta.error)}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <Breadcrumb
        items={[
          { label: 'Inicio', to: '/ecommerce' },
          { label: 'Catálogo', to: '/catalog' },
          { label: 'Disponibilidad' },
        ]}
      />

      <header className="mt-6 mb-8">
        <p className="text-xs uppercase tracking-widest text-muted">Administración de productos</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">{producto.name}</h1>
      </header>

      <section
        aria-label="Disponibilidad actual"
        className="mb-8 rounded-lg border border-ink/10 bg-surface p-5"
      >
        <div className="flex flex-wrap items-center gap-3">
          <AvailabilityBadge availableUnits={producto.availableUnits} />
          <span className="text-xs text-muted">
            Estado del producto: {producto.lifecycleStatus === 'ACTIVE' ? 'activo' : 'suspendido'}
          </span>
        </div>

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted">Tiraje</dt>
            <dd className="text-ink">
              {producto.printRunMode === 'INFINITE' ? 'Infinito' : producto.printRun}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Disponibles</dt>
            <dd className="text-ink">{producto.availableUnits ?? 'No aplica'}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Entregadas</dt>
            <dd className="text-ink">{entregadas ?? 'No se cuentan'}</dd>
          </div>
        </dl>

        {producto.availableUnits === 0 && (
          <p className="mt-4 text-xs text-muted">
            Agotado y suspendido son condiciones independientes: el producto sigue{' '}
            <strong className="text-ink">activo</strong> y vuelve a estar disponible en cuanto se
            amplíe el tiraje.
          </p>
        )}
      </section>

      <form onSubmit={enviar} className="flex flex-col gap-6">
        <div className="grid gap-6 md:grid-cols-2">
          <SelectField
            label="Disponibilidad"
            value={modalidad}
            options={[
              { value: 'LIMITED', label: 'Tiraje limitado (cantidad exacta)' },
              { value: 'INFINITE', label: 'Tiraje infinito (sin límite)' },
            ]}
            onChange={(event) => {
              setModalidad(event.target.value as Modalidad)
            }}
          />

          {modalidad === 'LIMITED' && (
            <TextField
              label="Cantidad de unidades"
              required
              inputMode="numeric"
              value={cantidad}
              error={errorDeCampo}
              hint={
                entregadas === null
                  ? 'Entero mayor o igual que 1.'
                  : `Entero mayor o igual que ${String(Math.max(entregadas, 1))}.`
              }
              onChange={(event) => {
                setCantidad(event.target.value)
              }}
            />
          )}
        </div>

        {producto.printRunMode === 'INFINITE' && modalidad === 'LIMITED' && (
          <p className="text-xs text-danger">
            Un producto de tiraje infinito no puede pasar a limitado: no se cuentan las unidades
            entregadas, así que no hay con qué comprobar el mínimo.
          </p>
        )}

        {ajuste.isError && (
          <p role="alert" className="text-sm text-danger">
            {describeAdjustmentFailure(ajuste.error)}
          </p>
        )}

        {ajuste.isSuccess && (
          <p role="status" className="text-sm text-brand">
            Tiraje ajustado.
          </p>
        )}

        <div>
          <Button type="submit" disabled={ajuste.isPending}>
            {ajuste.isPending ? 'Ajustando…' : 'Ajustar tiraje'}
          </Button>
        </div>
      </form>
    </div>
  )
}
