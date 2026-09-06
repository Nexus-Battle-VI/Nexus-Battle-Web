import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router'

import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { SelectField } from '@/components/ui/form/SelectField'
import { TextareaField } from '@/components/ui/form/TextareaField'
import { TextField } from '@/components/ui/form/TextField'

import {
  adjustProductInventory,
  describeAdjustmentFailure,
  describeLifecycleStatusFailure,
  fetchAdministeredProduct,
  updateProductLifecycleStatus,
  type AdministeredProduct,
} from './api'
import { AvailabilityBadge } from './AvailabilityBadge'

const REASON_MIN_LENGTH = 10

type Modalidad = 'LIMITED' | 'INFINITE'

/**
 * Ajuste del tiraje (HU-34, CA-02) y suspension/reactivacion (HU-35) de un
 * producto. Comparten pantalla porque ambas son acciones administrativas
 * sobre el MISMO producto ya cargado -no hay motivo para forzar dos rutas y
 * dos peticiones donde una sola ficha alcanza-, pero son independientes entre
 * si: cada una tiene su propio formulario, su propia mutacion y su propio
 * mensaje de error.
 *
 * PRIMERO SE LEE, LUEGO SE ESCRIBE. La pantalla muestra el estado actual
 * -cuantas unidades quedan de cuantas, si esta agotado, y si esta activo o
 * suspendido- antes de dejar cambiar nada.
 *
 * LAS UNIDADES ENTREGADAS SE DERIVAN, igual que en el servicio:
 * `tiraje - disponibles`. Es el numero que marca el minimo al que se puede
 * reducir, y enseñarlo evita mandar un valor que el servicio va a rechazar.
 *
 * NO SE ENVIA LA DISPONIBILIDAD. Solo el tiraje; el recalculo es del servicio.
 * Dejar que la pantalla fijara el contador permitiria reabrir un producto
 * agotado sin ampliar su tiraje, que es justo lo que la HU prohibe.
 *
 * SUSPENDER/REACTIVAR (HU-35) exige motivo y confirmacion explicita, y SOLO
 * actualiza la pantalla con la respuesta real de Catalog -nunca antes de
 * recibirla-: Catalog sigue siendo la unica autoridad del `lifecycleStatus`,
 * del RBAC y de la evidencia MFA. Reactivar NO repone unidades: un producto
 * agotado sigue mostrando "Agotado" despues, porque `AvailabilityBadge` deriva
 * el agotamiento de `availableUnits`, no de `lifecycleStatus`.
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

  // Suspension/reactivacion (HU-35). Estado propio y separado del formulario
  // de tiraje: son dos acciones administrativas distintas sobre el mismo
  // producto, y mezclar su estado haria que cancelar una afectara a la otra.
  const [motivoAbierto, setMotivoAbierto] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [errorDeMotivo, setErrorDeMotivo] = useState<string | undefined>(undefined)

  const cambioDeEstado = useMutation({
    mutationFn: (status: AdministeredProduct['lifecycleStatus']) =>
      updateProductLifecycleStatus(productId, status, motivo.trim()),
    // SOLO SE ACTUALIZA CON LA RESPUESTA REAL DE CATALOG, nunca antes: Catalog
    // sigue siendo la unica autoridad del estado. Si la peticion fallara, la
    // cache no se toca y la pantalla sigue mostrando el estado vigente.
    onSuccess: (actualizado: AdministeredProduct) => {
      queryClient.setQueryData(['admin', 'product', productId], actualizado)
      setMotivoAbierto(false)
      setMotivo('')
    },
  })

  const abrirConfirmacion = (): void => {
    cambioDeEstado.reset()
    setErrorDeMotivo(undefined)
    setMotivo('')
    setMotivoAbierto(true)
  }

  const cancelarConfirmacion = (): void => {
    setMotivoAbierto(false)
    setMotivo('')
    setErrorDeMotivo(undefined)
  }

  const confirmarCambioDeEstado = (event: React.SyntheticEvent): void => {
    event.preventDefault()

    const valor = motivo.trim()

    // Validacion de FORMA, para ahorrar un viaje de red vacio: la que manda
    // sigue siendo la de Catalog, que rechaza con 400 igual si esta se
    // sorteara.
    if (valor.length < REASON_MIN_LENGTH) {
      setErrorDeMotivo(`El motivo es obligatorio, mínimo ${String(REASON_MIN_LENGTH)} caracteres.`)
      return
    }

    setErrorDeMotivo(undefined)
    cambioDeEstado.mutate(producto?.lifecycleStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')
  }

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
            Agotado y suspendido son condiciones independientes: agotarse no cambia el estado del
            producto, y reactivarlo no repone unidades.
          </p>
        )}
      </section>

      <section
        aria-label="Estado del producto"
        className="mb-8 rounded-lg border border-ink/10 bg-surface p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted">Estado del producto</p>
            <p className="mt-1 text-sm font-medium text-ink">
              {producto.lifecycleStatus === 'ACTIVE' ? 'Activo' : 'Suspendido'}
            </p>
          </div>

          {!motivoAbierto && (
            <Button
              type="button"
              variant={producto.lifecycleStatus === 'ACTIVE' ? 'danger' : 'primary'}
              onClick={abrirConfirmacion}
            >
              {producto.lifecycleStatus === 'ACTIVE' ? 'Suspender producto' : 'Reactivar producto'}
            </Button>
          )}
        </div>

        {motivoAbierto && (
          <form
            onSubmit={confirmarCambioDeEstado}
            aria-label={
              producto.lifecycleStatus === 'ACTIVE' ? 'Suspender producto' : 'Reactivar producto'
            }
            className="mt-4 space-y-3 rounded-lg border border-border bg-surface/60 p-3"
          >
            <p className="text-xs text-muted">
              {producto.lifecycleStatus === 'ACTIVE' ? (
                <>
                  El producto se suspenderá: dejará de estar disponible para nuevas adquisiciones y
                  desaparecerá de la vitrina pública. No se elimina ni se borra -sigue intacto en el
                  inventario de quienes ya lo poseen- y puede reactivarse en cualquier momento.
                </>
              ) : (
                <>
                  El producto volverá a estar disponible para nuevas adquisiciones y visible en la
                  vitrina pública. Si estaba agotado, seguirá agotado hasta que se amplíe su tiraje.
                </>
              )}
            </p>

            <TextareaField
              label="Motivo"
              required
              value={motivo}
              error={errorDeMotivo}
              hint={`Obligatorio, mínimo ${String(REASON_MIN_LENGTH)} caracteres.`}
              disabled={cambioDeEstado.isPending}
              onChange={(event) => {
                setMotivo(event.target.value)
                setErrorDeMotivo(undefined)
              }}
            />

            {cambioDeEstado.isError && (
              <p role="alert" className="text-sm text-danger">
                {describeLifecycleStatusFailure(cambioDeEstado.error)}
              </p>
            )}

            <div className="flex gap-2">
              <Button
                type="submit"
                variant={producto.lifecycleStatus === 'ACTIVE' ? 'danger' : 'primary'}
                loading={cambioDeEstado.isPending}
              >
                {producto.lifecycleStatus === 'ACTIVE'
                  ? 'Confirmar suspensión'
                  : 'Confirmar reactivación'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={cambioDeEstado.isPending}
                onClick={cancelarConfirmacion}
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}

        {!motivoAbierto && cambioDeEstado.isSuccess && (
          <p role="status" className="mt-4 text-sm text-brand">
            Estado actualizado.
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
