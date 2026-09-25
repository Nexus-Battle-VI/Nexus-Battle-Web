import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()

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
  // Guarda el texto ya resuelto del aviso de campo.
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
      setErrorDeMotivo(t('admin:products.adjust.reasonMin', { min: String(REASON_MIN_LENGTH) }))
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
      setErrorDeCampo(t('admin:products.errors.printRun'))
      return
    }

    // El minimo se comprueba tambien aqui, pero NO sustituye al del servicio:
    // esta comprobacion ahorra un viaje, y la que manda es la de Catalog, que
    // es quien conoce las entregas ocurridas mientras esta pantalla estaba
    // abierta.
    if (entregadas !== null && Number(valor) < entregadas) {
      setErrorDeCampo(t('admin:products.adjust.belowDelivered', { delivered: String(entregadas) }))
      return
    }

    setErrorDeCampo(undefined)
    ajuste.mutate(Number(valor))
  }

  if (consulta.isPending) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <p className="text-sm text-muted">{t('admin:products.adjust.loading')}</p>
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
          { label: t('admin:home'), to: '/ecommerce' },
          { label: t('admin:catalog'), to: '/catalog' },
          { label: t('admin:products.adjust.crumb') },
        ]}
      />

      <header className="mt-6 mb-8">
        <p className="text-xs uppercase tracking-widest text-muted">
          {t('admin:products.eyebrow')}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">{producto.name}</h1>
      </header>

      <section
        aria-label={t('admin:products.adjust.current')}
        className="mb-8 rounded-lg border border-ink/10 bg-surface p-5"
      >
        <div className="flex flex-wrap items-center gap-3">
          <AvailabilityBadge availableUnits={producto.availableUnits} />
          <span className="text-xs text-muted">
            {t('admin:products.adjust.statusLine', {
              status:
                producto.lifecycleStatus === 'ACTIVE'
                  ? t('admin:products.adjust.activeLower')
                  : t('admin:products.adjust.suspendedLower'),
            })}
          </span>
        </div>

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted">{t('admin:products.adjust.printRun')}</dt>
            <dd className="text-ink">
              {producto.printRunMode === 'INFINITE'
                ? t('admin:products.adjust.infinite')
                : producto.printRun}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{t('admin:products.adjust.available')}</dt>
            <dd className="text-ink">
              {producto.availableUnits ?? t('admin:products.adjust.notApplicable')}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{t('admin:products.adjust.delivered')}</dt>
            <dd className="text-ink">{entregadas ?? t('admin:products.adjust.notCounted')}</dd>
          </div>
        </dl>

        {producto.availableUnits === 0 && (
          <p className="mt-4 text-xs text-muted">{t('admin:products.adjust.independent')}</p>
        )}
      </section>

      <section
        aria-label={t('admin:products.adjust.statusSection')}
        className="mb-8 rounded-lg border border-ink/10 bg-surface p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted">{t('admin:products.adjust.statusSection')}</p>
            <p className="mt-1 text-sm font-medium text-ink">
              {producto.lifecycleStatus === 'ACTIVE'
                ? t('admin:products.adjust.active')
                : t('admin:products.adjust.suspended')}
            </p>
          </div>

          {!motivoAbierto && (
            <Button
              type="button"
              variant={producto.lifecycleStatus === 'ACTIVE' ? 'danger' : 'primary'}
              onClick={abrirConfirmacion}
            >
              {producto.lifecycleStatus === 'ACTIVE'
                ? t('admin:products.adjust.suspend')
                : t('admin:products.adjust.reactivate')}
            </Button>
          )}
        </div>

        {motivoAbierto && (
          <form
            onSubmit={confirmarCambioDeEstado}
            aria-label={
              producto.lifecycleStatus === 'ACTIVE'
                ? t('admin:products.adjust.suspend')
                : t('admin:products.adjust.reactivate')
            }
            className="mt-4 space-y-3 rounded-lg border border-border bg-surface/60 p-3"
          >
            <p className="text-xs text-muted">
              {producto.lifecycleStatus === 'ACTIVE'
                ? t('admin:products.adjust.suspendNote')
                : t('admin:products.adjust.reactivateNote')}
            </p>

            <TextareaField
              label={t('admin:products.adjust.reason')}
              required
              value={motivo}
              error={errorDeMotivo}
              hint={t('admin:products.adjust.reasonHint', { min: String(REASON_MIN_LENGTH) })}
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
                  ? t('admin:products.adjust.confirmSuspend')
                  : t('admin:products.adjust.confirmReactivate')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={cambioDeEstado.isPending}
                onClick={cancelarConfirmacion}
              >
                {t('common:cancel')}
              </Button>
            </div>
          </form>
        )}

        {!motivoAbierto && cambioDeEstado.isSuccess && (
          <p role="status" className="mt-4 text-sm text-brand">
            {t('admin:products.adjust.statusUpdated')}
          </p>
        )}
      </section>

      <form onSubmit={enviar} className="flex flex-col gap-6">
        <div className="grid gap-6 md:grid-cols-2">
          <SelectField
            label={t('admin:products.pricing.availability')}
            value={modalidad}
            options={[
              { value: 'LIMITED', label: t('admin:products.pricing.limited') },
              { value: 'INFINITE', label: t('admin:products.pricing.infinite') },
            ]}
            onChange={(event) => {
              setModalidad(event.target.value as Modalidad)
            }}
          />

          {modalidad === 'LIMITED' && (
            <TextField
              label={t('admin:products.pricing.units')}
              required
              inputMode="numeric"
              value={cantidad}
              error={errorDeCampo}
              hint={t('admin:products.adjust.unitsHintMin', {
                min: String(entregadas === null ? 1 : Math.max(entregadas, 1)),
              })}
              onChange={(event) => {
                setCantidad(event.target.value)
              }}
            />
          )}
        </div>

        {producto.printRunMode === 'INFINITE' && modalidad === 'LIMITED' && (
          <p className="text-xs text-danger">{t('admin:products.adjust.infiniteToLimited')}</p>
        )}

        {ajuste.isError && (
          <p role="alert" className="text-sm text-danger">
            {describeAdjustmentFailure(ajuste.error)}
          </p>
        )}

        {ajuste.isSuccess && (
          <p role="status" className="text-sm text-brand">
            {t('admin:products.adjust.adjusted')}
          </p>
        )}

        <div>
          <Button type="submit" disabled={ajuste.isPending}>
            {ajuste.isPending
              ? t('admin:products.adjust.adjusting')
              : t('admin:products.adjust.submit')}
          </Button>
        </div>
      </form>
    </div>
  )
}
